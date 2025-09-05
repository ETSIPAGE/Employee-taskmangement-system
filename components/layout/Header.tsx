import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { CogIcon, ChatBubbleLeftRightIcon, UsersIcon } from '../../constants';

interface HeaderProps {
  onToggleChat: () => void;
  onToggleRoles: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat, onToggleRoles }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleBreak = () => {
      setIsOnBreak(!isOnBreak);
  }

  const togglePunchIn = () => {
    setIsPunchedIn(!isPunchedIn);
  }

  const commonButtons = (
     <div className="flex items-center space-x-2">
       <button 
          onClick={onToggleRoles}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Toggle Roles"
        >
          <UsersIcon className="h-6 w-6" />
        </button>
       <button 
          onClick={onToggleChat}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Toggle Chat"
        >
          <ChatBubbleLeftRightIcon />
        </button>
     </div>
  );

  const punchButton = (
    <button 
      onClick={togglePunchIn}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm ${
          isPunchedIn 
          ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300' 
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
      }`}
    >
        {isPunchedIn ? 'Punch Out' : 'Punch In'}
    </button>
  );

  if (user?.role === UserRole.MANAGER) {
    return (
        <header className="flex justify-between items-center px-6 bg-white border-b-2 border-slate-200 h-16 flex-shrink-0">
            {/* Left side */}
            <div>
                <span className="font-semibold text-slate-800 text-lg">{user?.name}</span>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
                {punchButton}
                <button 
                  onClick={toggleBreak}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm ${
                      isOnBreak 
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300' 
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                  }`}
                >
                    {isOnBreak ? 'End Break' : 'Start Break'}
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm"
                >
                    Logout
                </button>
                {commonButtons}
                <button 
                  className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  aria-label="Settings"
                >
                    <CogIcon />
                </button>
            </div>
        </header>
    )
  }

  // Default header for other roles
  return (
    <header className="flex justify-end items-center px-6 bg-white border-b-2 border-slate-200 h-16 flex-shrink-0">
      <div className="flex items-center space-x-4">
        {punchButton}
        {commonButtons}
        <div className="text-right">
            <div className="font-semibold text-slate-800">{user?.name}</div>
            <div className="text-sm text-slate-500">{user?.role}</div>
        </div>
        <button 
          onClick={handleLogout} 
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
