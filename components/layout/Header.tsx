import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import { CogIcon, ChatBubbleLeftRightIcon } from '../../constants';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';

interface HeaderProps {
  onToggleChat: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleChat }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [isPunchingIn, setIsPunchingIn] = useState(false);
  const [punchInLoading, setPunchInLoading] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [lastSent, setLastSent] = useState<Record<string, { text: string; ts: number }>>({});
  const [lastReadAll, setLastReadAll] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const fetchTodaysAttendance = async () => {
      setPunchInLoading(true);
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const attendanceForMonth = await DataService.getAttendanceForUserByMonth(user.id, year, month);

        const todayString = today.toISOString().split('T')[0];
        const todayRecord = attendanceForMonth.find(rec => typeof rec.date === 'string' && rec.date.startsWith(todayString));

        if (todayRecord && todayRecord.punchInTime && !todayRecord.punchOutTime) {
            setIsPunchedIn(true);
        } else {
            setIsPunchedIn(false);
        }
      } catch (error) {
          console.error("Failed to fetch today's attendance status", error);
          setIsPunchedIn(false);
      } finally {
          setPunchInLoading(false);
      }
    };

    fetchTodaysAttendance();
  }, [user]);

  // Load lastReadAll and compute initial unread status from per-conversation lastRead
  useEffect(() => {
    if (!user) return;
    const key = `ets-chat-lastreadall:${user.id}`;
    const stored = Number(localStorage.getItem(key) || '0');
    setLastReadAll(isNaN(stored) ? 0 : stored);
    (async () => {
      try {
        const convs = await DataService.getConversationsForUserApi(user.id);
        const has = convs.some(c => {
          const ts = c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).getTime() : 0;
          const sender = String(c.lastMessage?.senderId || '');
          if (!ts || !sender || sender === String(user.id)) return false;
          const perKey = `ets-chat-lastread:${user.id}:${c.id}`;
          const readAt = Number(localStorage.getItem(perKey) || '0');
          return isNaN(readAt) || ts > readAt;
        });
        setHasUnread(has);
        try { window.dispatchEvent(new CustomEvent('ets-chat-refresh', { detail: { reason: 'login-initial' } })); } catch {}
      } catch {}
    })();
  }, [user]);

  // Global WebSocket for chat notifications (active even if chat UI is closed)
  useEffect(() => {
    if (!user) return;
    let closed = false;
    let attempt = 0;
    let socket: WebSocket | null = null;
    const token = AuthService.getToken ? AuthService.getToken() : '';
    const base = 'wss://4axwbl20th.execute-api.ap-south-1.amazonaws.com/dev';
    const wsUrl = `${base}?token=${encodeURIComponent(token || '')}`;

    const connect = () => {
      if (closed) return;
      try { socket = new WebSocket(wsUrl); } catch { return; }
      socket.onopen = () => { /* noop */ };
      socket.onclose = () => {
        if (!closed) {
          attempt += 1;
          setTimeout(connect, Math.min(1000 * Math.pow(2, attempt), 8000));
        }
      };
      socket.onerror = () => { /* noop */ };
      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse((evt as MessageEvent).data as string);
          const convId = String((msg && (msg.conversationId || msg.conversation_id || msg.convId)) || '');
          const text = String((msg && (msg.text || msg.message || msg.body)) || '');
          const tsRaw = (msg && (msg.timestamp || msg.createdAt || msg.created_at)) as string | number | undefined;
          const msgTs = typeof tsRaw === 'number' ? tsRaw : (tsRaw ? new Date(String(tsRaw)).getTime() : Date.now());
          const looksLikeMessage = msg && (msg.type === 'newMessage' || msg.action === 'broadcastMessage' || (convId && text));
          if (!looksLikeMessage) return;
          // Only set unread for messages not sent by the current user (ignore self-echo)
          const sender = String((msg && (msg.senderId || msg.sender_id || msg.userId || msg.user_id)) || '');
          if (!sender || sender === String(user.id)) return;
          // Suppress if this client just sent the same text in this conversation (WS echo race)
          const ls = lastSent[convId];
          if (ls && ls.text === text && (Date.now() - ls.ts) <= 5000) return;
          // If message is newer than lastRead for this conversation, mark unread
          try {
            const lastReadKey = `ets-chat-lastread:${user.id}:${convId}`;
            const readAt = Number(localStorage.getItem(lastReadKey) || '0');
            if (isNaN(readAt) || msgTs > readAt) {
              setHasUnread(true);
            }
          } catch {
            setHasUnread(true);
          }
          // Trigger a lightweight refresh for any mounted chat container; also mark a flag for future mounts
          try {
            sessionStorage.setItem('ets-chat-needs-refresh', '1');
          } catch {}
          try { window.dispatchEvent(new CustomEvent('ets-chat-refresh', { detail: { reason: 'ws-incoming' } })); } catch {}
          // Broadcast a window event so any mounted chat components can react
          try { window.dispatchEvent(new CustomEvent('ets-chat-incoming', { detail: { convId, text, msg } })); } catch {}
        } catch {}
      };
    };

    const t = setTimeout(connect, 150);
    return () => { closed = true; clearTimeout(t); try { socket && socket.close(); } catch {} };
  }, [user, lastSent]);

  // When any conversation is read (ChatWindow marks per-conversation), recompute unread against all conversations
  useEffect(() => {
    const handler = async () => {
      if (!user) return;
      try {
        const convs = await DataService.getConversationsForUserApi(user.id);
        const has = convs.some(c => {
          const ts = c.lastMessage?.timestamp ? new Date(c.lastMessage.timestamp).getTime() : 0;
          const sender = String(c.lastMessage?.senderId || '');
          if (!ts || !sender || sender === String(user.id)) return false;
          const perKey = `ets-chat-lastread:${user.id}:${c.id}`;
          const readAt = Number(localStorage.getItem(perKey) || '0');
          return isNaN(readAt) || ts > readAt;
        });
        setHasUnread(has);
      } catch {}
    };
    window.addEventListener('ets-chat-read', handler as any);
    return () => { window.removeEventListener('ets-chat-read', handler as any); };
  }, [user]);

  // Track last sent messages to suppress local unread echoes
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail || {};
      const convId = String(detail.conversationId || '');
      const text = String(detail.text || '');
      const ts = typeof detail.ts === 'number' ? detail.ts : Date.now();
      if (!convId || !text) return;
      setLastSent(prev => ({ ...prev, [convId]: { text, ts } }));
    };
    window.addEventListener('ets-chat-sent', handler as any);
    return () => { window.removeEventListener('ets-chat-sent', handler as any); };
  }, []);

  const handleLogout = () => {
    if (isPunchedIn) {
      setLogoutMessage('Please punch out before logging out.');
      return;
    }
    logout();
    navigate('/login');
  };

  const toggleBreak = () => {
      setIsOnBreak(!isOnBreak);
  }

  const togglePunchIn = async () => {
    if (!user || isPunchingIn || punchInLoading) return;

    setIsPunchingIn(true);
    const action = isPunchedIn ? 'PUNCH_OUT' : 'PUNCH_IN';

    try {
        await DataService.recordAttendance(user.id, action);
        setIsPunchedIn(!isPunchedIn);
        if (action === 'PUNCH_OUT') setLogoutMessage(null);
        // Notify other parts of the app (e.g., monthly attendance view) to refresh with action detail
        try { window.dispatchEvent(new CustomEvent('ets-attendance-updated', { detail: { userId: user.id, action } })); } catch {}
    } catch (error) {
        console.error(`Failed to ${action}`, error);
        alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
    } finally {
        setIsPunchingIn(false);
    }
  }

  const commonButtons = (
     <div className="flex items-center space-x-2">
       <button 
          onClick={() => { onToggleChat(); }}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Toggle Chat"
        >
          <div className="relative">
            <ChatBubbleLeftRightIcon />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-red-600"></span>
            )}
          </div>
        </button>
     </div>
  );

  const punchButton = (
    <button 
      onClick={togglePunchIn}
      disabled={isPunchingIn || punchInLoading}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm disabled:opacity-75 disabled:cursor-wait ${
          isPunchedIn 
          ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300' 
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
      }`}
    >
      {punchInLoading ? 'Loading...' : isPunchingIn ? 'Processing...' : isPunchedIn ? 'Punch Out' : 'Punch In'}
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
                {logoutMessage && (
                  <div className="ml-2 text-sm text-red-600">{logoutMessage}</div>
                )}
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
        {logoutMessage && (
          <div className="ml-2 text-sm text-red-600">{logoutMessage}</div>
        )}
      </div>
    </header>
  );
};

export default Header;