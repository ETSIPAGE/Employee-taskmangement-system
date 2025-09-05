import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatContainer from '../chat/ChatContainer';
import RolesSidebar from './RolesSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);
  const toggleChat = () => setIsChatOpen(prev => !prev);
  const toggleRoles = () => setIsRolesOpen(prev => !prev);
  
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleChat={toggleChat} onToggleRoles={toggleRoles} />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
            {children}
          </main>
          {/* Roles Sidebar */}
          {isRolesOpen && <RolesSidebar isOpen={isRolesOpen} onClose={() => setIsRolesOpen(false)} />}
          {/* Chat Panel */}
          <aside className={`flex-shrink-0 transition-all duration-300 ease-in-out bg-white border-l border-slate-200 ${isChatOpen ? 'w-96' : 'w-0'}`}>
            {isChatOpen && <ChatContainer onClose={toggleChat} />}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
