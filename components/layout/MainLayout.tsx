import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatContainer from '../chat/ChatContainer';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user, originalUser, stopImpersonation } = useAuth();

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  const toggleChat = () => setIsChatOpen(prev => !prev);
  
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleChat={toggleChat} />
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
            {children}
          </main>
          {/* Chat Panel */}
          <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out bg-white border-l border-slate-200 ${isChatOpen ? 'w-96' : 'w-0'}`}>
            {isChatOpen && <ChatContainer onClose={toggleChat} />}
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