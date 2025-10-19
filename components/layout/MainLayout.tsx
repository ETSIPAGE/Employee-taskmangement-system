import React, { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatContainer from '../chat/ChatContainer';
import { useAuth } from '../../hooks/useAuth';
import { chatSocket, ChatSocketEvent } from '../../services/chatSocket';
import * as AuthService from '../../services/authService';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const { user, originalUser, stopImpersonation } = useAuth();

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  const toggleChat = () =>
    setIsChatOpen(prev => {
      const next = !prev;
      if (next) {
        setUnreadCount(0);
        setChatRefreshKey(prevKey => prevKey + 1);
      }
      return next;
    });

  useEffect(() => {
    if (user) {
      const token = AuthService.getToken() || undefined;
      chatSocket.connect(token);
    } else {
      chatSocket.disconnect();
      setUnreadCount(0);
      setChatRefreshKey(0);
    }
    return () => {
      chatSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const listener = (event: ChatSocketEvent) => {
      console.log('Chat WebSocket global listener received event', event);
      if (event.type !== 'newMessage') {
        return;
      }
      if (!isChatOpen) {
        setUnreadCount(prev => prev + 1);
        setChatRefreshKey(prevKey => prevKey + 1);
        console.log('Chat message received while panel closed');
      }
    };
    chatSocket.addListener(listener);
    return () => {
      chatSocket.removeListener(listener);
    };
  }, [user, isChatOpen]);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleChat={toggleChat} unreadCount={unreadCount} />
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
            {children}
          </main>
          {/* Chat Panel */}
          <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out bg-white border-l border-slate-200 ${isChatOpen ? 'w-96' : 'w-0'} ${isChatOpen ? '' : 'pointer-events-none'}`}>
            <ChatContainer onClose={toggleChat} refreshKey={chatRefreshKey} isOpen={isChatOpen} />
          </aside>
          {/* Impersonation Banner */}
          {originalUser && user && (
            <div className="absolute bottom-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-6 py-3 flex justify-between items-center shadow-lg z-50">
              <p className="font-semibold">
                You are currently viewing as {user.name} ({user.role}).
              </p>
              <button
                onClick={stopImpersonation}
                className="px-4 py-2 text-sm font-bold rounded-md bg-yellow-900 text-white hover:bg-black transition-colors"
              >
                Return to your account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;