import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as AuthService from '../services/authService';
import type { RegisterCredentials, LoginCredentials } from '../services/authService';

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
    if(original) {
        setUser(original);
        setOriginalUser(null);
    } else {
        logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, originalUser, loading, login, register, logout, updateProfile, impersonateUser, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
};