import React, { ReactNode, useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatContainer from '../chat/ChatContainer';
import { useAuth } from '../../hooks/useAuth';
import { chatSocket, ChatSocketEvent } from '../../services/chatSocket';
import * as AuthService from '../../services/authService';
import { setUserStatus, updateUserLastSeen } from '../../services/dataService';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const { user, originalUser, stopImpersonation } = useAuth();
  const lastActiveUserIdRef = useRef<string | null>(null);

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
      // Update user's last seen time when they log in
      updateUserLastSeen(user.id);
      setUserStatus(user.id, 'online');
      chatSocket.sendStatusUpdate(user.id, 'online');
      lastActiveUserIdRef.current = user.id;
      // Refresh chat to show updated status
      setChatRefreshKey(prev => prev + 1);
      
      // Log user login on client side
      console.log(`%c[User Login] ${user.name} (${user.email}) has logged in`, 
        'color: #4CAF50; font-weight: bold');
      
      // Send login notification to other users via WebSocket
      chatSocket.sendMessage('system', `${user.name} has come online`);
    } else {
      const previousUserId = lastActiveUserIdRef.current;
      if (previousUserId) {
        setUserStatus(previousUserId, 'offline');
        chatSocket.sendStatusUpdate(previousUserId, 'offline');
        lastActiveUserIdRef.current = null;
      }
      chatSocket.disconnect();
      setUnreadCount(0);
      setChatRefreshKey(0);
      
      // Log user logout on client side
      console.log('%c[User Logout] User has logged out', 
        'color: #F44336; font-weight: bold');
    }
    return () => {
      if (user) {
        setUserStatus(user.id, 'offline');
        chatSocket.sendStatusUpdate(user.id, 'offline');
        if (lastActiveUserIdRef.current === user.id) {
          lastActiveUserIdRef.current = null;
        }
      }
      chatSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const listener = (event: ChatSocketEvent) => {
      console.log('Chat WebSocket global listener received event', event);
      
      // Handle system messages (online/offline notifications)
      if (event.type === 'system' || event.action === 'system') {
        console.log(`%c[System] ${event.text || 'Status update'}`, 'color: #2196F3; font-style: italic');
        // Only refresh the chat to update status, but don't show badge or notification
        setChatRefreshKey(prev => prev + 1);
        return;
      }
      
      // Only show badge for actual chat messages (not status updates)
      if (event.type === 'newMessage' && event.text) {
        if (!isChatOpen) {
          setUnreadCount(prev => prev + 1);
          setChatRefreshKey(prevKey => prevKey + 1);
          console.log('Chat message received while panel closed');
        }
      }
      
      // Handle status updates without showing badge
      if (event.type === 'status' || event.action === 'status') {
        // Just refresh the chat to update status, no badge
        setChatRefreshKey(prev => prev + 1);
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


//close panel test work for group not for users change badege and user names fetch