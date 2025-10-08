import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../constants';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];

  return (
    <div className={`flex flex-col bg-slate-800 text-slate-100 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`h-16 flex items-center border-b border-slate-700 flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!isCollapsed && <span className="text-2xl font-bold text-white">ETS</span>}
        <button 
          onClick={toggleCollapse} 
          className="p-2 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
           <div className={`transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
              <ChevronLeftIcon />
           </div>
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isLinkActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
          
          return (
            <div key={item.name} className="relative group">
              <NavLink
                to={item.href}
                className={
                  `flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isCollapsed ? 'justify-center' : ''
                  } ${
                    isLinkActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
                aria-label={item.name}
              >
                <item.icon />
                {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.name}</span>}
              </NavLink>
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded-md invisible group-hover:visible whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.name}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;