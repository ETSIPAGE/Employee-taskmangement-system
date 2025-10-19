import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { CogIcon, ChatBubbleLeftRightIcon } from '../../constants'; // Assuming these are valid paths
import * as DataService from '../../services/dataService';

interface HeaderProps {
  onToggleChat: () => void;
  unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat, unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isPunching, setIsPunching] = useState(false); // Renamed to avoid confusion with `isPunchingIn` for initial load
  const [punchStatusLoading, setPunchStatusLoading] = useState(true); // Renamed for clarity
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      console.log("Header: No user, skipping initial attendance fetch.");
      return;
    }

    const fetchTodaysAttendance = async () => {
      setPunchStatusLoading(true);
      console.log("Header: Fetching today's attendance for user:", user.id);
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // getMonth() is 0-indexed

        // Fetch monthly records and then filter for today
        const attendanceForMonth = await DataService.getAttendanceForUserByMonth(user.id, year, month);
        console.log("Header: Monthly attendance fetched:", attendanceForMonth);

        const todayString = today.toISOString().split('T')[0];
        const todayRecord = attendanceForMonth.find(rec =>
            typeof rec.date === 'string' && rec.date.startsWith(todayString)
        );

        if (todayRecord && todayRecord.punchInTime && !todayRecord.punchOutTime) {
            setIsPunchedIn(true);
            console.log("Header: User is currently punched in.");
        } else {
            setIsPunchedIn(false);
            console.log("Header: User is currently punched out or has no record for today.");
        }
      } catch (error) {
          console.error("Header: Failed to fetch today's attendance status", error);
          setIsPunchedIn(false); // Assume not punched in on error
      } finally {
          setPunchStatusLoading(false);
          console.log("Header: Initial punch status loading complete.");
      }
    };

    fetchTodaysAttendance();
  }, [user]); // Re-run if user changes

  const handleLogout = () => {
    if (isPunchedIn) {
      setLogoutMessage('Please punch out before logging out.');
      return;
    }
    console.log("Header: Logging out user.");
    logout();
    navigate('/login');
  };

  const toggleBreak = () => {
      setIsOnBreak(prev => !prev);
      console.log(`Header: Break status toggled to: ${!isOnBreak}`);
  }

  const togglePunchIn = async () => {
    if (!user || isPunching || punchStatusLoading) {
        console.log("Header: Punch In/Out button disabled (conditions met):", { user: !!user, isPunching, punchStatusLoading });
        return;
    }

    setIsPunching(true);
    const action = isPunchedIn ? 'PUNCH_OUT' : 'PUNCH_IN';
    console.log(`Header: Attempting to ${action} for user ${user.id}`);

    try {
        await DataService.recordAttendance(user.id, action);
        console.log(`Header: Successfully completed ${action} API call.`);
        setIsPunchedIn(prev => !prev); // Toggle punch status immediately

        if (action === 'PUNCH_OUT') {
            setLogoutMessage(null);
        }

        // --- CRITICAL PART: Dispatching the event ---
        const eventDetail = { userId: user.id, action };
        console.log("Header: Dispatching 'ets-attendance-updated' event with detail:", eventDetail);
        window.dispatchEvent(new CustomEvent('ets-attendance-updated', { detail: eventDetail }));
        // --- END CRITICAL PART ---

    } catch (error) {
        console.error(`Header: Failed to ${action}`, error);
        alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    } finally {
        setIsPunching(false);
        console.log("Header: Punching state reset to false.");
    }
  }

  const commonButtons = (
     <div className="flex items-center space-x-2">
       <button
          onClick={onToggleChat}
          className="relative p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Toggle Chat"
        >
          <ChatBubbleLeftRightIcon /> {/* Assuming this is a valid React component */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
     </div>
  );

  const punchButton = (
    <button
      onClick={togglePunchIn}
      disabled={isPunching || punchStatusLoading}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait ${
          isPunchedIn
          ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
      }`}
    >
      {punchStatusLoading ? 'Loading...' : isPunching ? 'Processing...' : isPunchedIn ? 'Punch Out' : 'Punch In'}
    </button>
  );

  // Manager specific header
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
                    <CogIcon /> {/* Assuming this is a valid React component */}
                </button>
                {logoutMessage && (
                  <div className="ml-2 text-sm text-red-600">{logoutMessage}</div>
                )}
            </div>
        </header>
    )
  }

  // Default header for other roles (Employee, Admin, HR)
  return (
    <header className="flex justify-end items-center px-6 bg-white border-b-2 border-slate-200 h-16 flex-shrink-0">
      <div className="flex items-center space-x-4">
        {user?.role !== UserRole.ADMIN && punchButton}
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
        {logoutMessage && (
          <div className="ml-2 text-sm text-red-600">{logoutMessage}</div>
        )}
      </div>
    </header>
  );
};

export default Header;