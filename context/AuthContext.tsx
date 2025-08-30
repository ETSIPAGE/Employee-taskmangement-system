
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as AuthService from '../services/authService';
import type { RegisterCredentials, LoginCredentials } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: LoginCredentials['email'], password: LoginCredentials['password']) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to get current user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: LoginCredentials['email'], password: LoginCredentials['password']) => {
    const loggedInUser = await AuthService.login(email, password);
    setUser(loggedInUser);
  };

  const register = async (credentials: RegisterCredentials) => {
    const newUser = await AuthService.register(credentials);
    setUser(newUser);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
