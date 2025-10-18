import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as AuthService from '../services/authService';
import type { RegisterCredentials, LoginCredentials } from '../services/authService';
import { getToken } from '../services/authService';

interface AuthContextType {
  user: User | null;
  originalUser: User | null;
  loading: boolean;
  login: (email: LoginCredentials['email'], password: LoginCredentials['password']) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        const original = AuthService.getOriginalUser();
        setUser(currentUser);
        setOriginalUser(original);
      } catch (error) {
        console.error("Failed to get current user:", error);
        setUser(null);
        setOriginalUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: LoginCredentials['email'], password: LoginCredentials['password']) => {
    const loggedInUser = await AuthService.login(email, password);
    setUser(loggedInUser);
    setOriginalUser(null);
  };

  const register = async (credentials: RegisterCredentials) => {
    const newUser = await AuthService.register(credentials);
    setUser(newUser);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setOriginalUser(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error("User not authenticated");
    const updatedUser = AuthService.updateUser(user.id, updates);
    if (updatedUser) {
      setUser(updatedUser);
    } else {
      throw new Error("Failed to update user profile.");
    }
  };

  const impersonateUser = async (userId: string) => {
    const currentlyLoggedInUser = user;
    const impersonatedUser = AuthService.impersonate(userId);
    if (impersonatedUser) {
      setUser(impersonatedUser);
      setOriginalUser(currentlyLoggedInUser);
    } else {
      throw new Error("Failed to impersonate user.");
    }
  };

  const stopImpersonation = async () => {
    const original = AuthService.stopImpersonating();
    if (original) {
      setUser(original);
      setOriginalUser(null);
    } else {
      logout();
    }
  };

  useEffect(() => {
    if (!user) return;
    const token = getToken() || '';
    const base = 'wss://4axwbl20th.execute-api.ap-south-1.amazonaws.com/dev';
    const wsUrl = `${base}?token=${encodeURIComponent(token)}`;
    let attempt = 0;
    let closed = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (closed) return;
      try { socket = new WebSocket(wsUrl); } catch { return; }
      socket.onopen = () => { };
      socket.onclose = () => {
        if (!closed) {
          attempt += 1;
          setTimeout(connect, Math.min(1000 * Math.pow(2, attempt), 8000));
        }
      };
      socket.onerror = () => { };
      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse((evt as MessageEvent).data as string);
          const convId = String((msg && (msg.conversationId || msg.conversation_id || msg.convId)) || '');
          const looksLikeMessage = msg && (msg.type === 'newMessage' || msg.action === 'broadcastMessage' || convId);
          if (!looksLikeMessage) return;
          try { sessionStorage.setItem('ets-chat-needs-refresh', '1'); } catch {}
          const mapped = {
            id: String(msg?.id || msg?.messageId || msg?.msgId || `${convId}-${msg?.timestamp || Date.now()}`),
            conversationId: convId,
            senderId: String((msg && (msg.senderId || msg.sender_id || msg.userId || msg.user_id)) || ''),
            text: String((msg && (msg.text || msg.message || msg.body)) || ''),
            timestamp: String((msg && (msg.timestamp || msg.createdAt || msg.created_at)) || new Date().toISOString()),
          };
          try { window.dispatchEvent(new CustomEvent('ets-chat-incoming', { detail: { conversationId: convId, message: mapped, ts: Date.now() } })); } catch {}
        } catch {}
      };
    };
    const t = setTimeout(connect, 150);
    return () => {
      closed = true;
      clearTimeout(t);
      try { socket && socket.close(); } catch {}
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, originalUser, loading, login, register, logout, updateProfile, impersonateUser, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
};