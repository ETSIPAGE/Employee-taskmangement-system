import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NAV_ITEMS } from '../../constants';
import * as DataService from '../../services/dataService';
import { TaskStatus, UserRole } from '../../types';

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
  const [taskBadge, setTaskBadge] = useState(0);
  const taskHref = user.role === UserRole.EMPLOYEE ? '/tasks' : user.role === UserRole.MANAGER ? '/team-tasks' : user.role === UserRole.ADMIN ? '/admin-tasks' : '';

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] || [];

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      if (!user) { setTaskBadge(0); return; }
      try {
        const all = await DataService.getAllTasks();
        let count = 0;
        if (user.role === UserRole.EMPLOYEE) {
          count = all.filter(t => (t.assigneeIds || []).includes(user.id) && t.status === TaskStatus.TODO).length;
        } else if (user.role === UserRole.MANAGER || user.role === UserRole.ADMIN) {
          count = all.filter(t => t.status === TaskStatus.TODO).length;
        }
        if (!cancelled) setTaskBadge(count);
      } catch {
        if (!cancelled) setTaskBadge(0);
      }
    };
    load();
    // Poll every 5s to reflect changes like status updates on Tasks page
    timer = window.setInterval(load, 5000);
    return () => { cancelled = true; if (timer) window.clearInterval(timer); };
  }, [user, location.pathname]);

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
          const showTaskBadge = item.href === taskHref && taskBadge > 0;
          const displayCount = taskBadge > 99 ? '99+' : String(taskBadge);
          
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
              {showTaskBadge && (
                <span className={`absolute ${isCollapsed ? 'top-1 right-1' : 'top-1.5 right-3'} pointer-events-none`}>
                  <span className="absolute inset-0 rounded-full bg-red-400/60 blur-sm opacity-70 animate-pulse" />
                  <span className={`relative inline-flex items-center justify-center rounded-full text-white font-bold ring-2 ring-slate-800 shadow-md bg-gradient-to-b from-red-500 to-red-600 ${isCollapsed ? 'w-5 h-5 text-[10px]' : 'min-w-[22px] h-5 px-1.5 text-[10px]'}`}>
                    {displayCount}
                  </span>
                </span>
              )}
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