/**
 * Auth Context
 * 
 * Simple auth state management with localStorage persistence.
 * For now, uses dev tokens - replace with real auth later.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface User {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'vitality_token';
const USER_KEY = 'vitality_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored || stored === 'undefined') return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const getToken = useCallback(() => token, [token]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

