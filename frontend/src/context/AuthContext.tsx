import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types/user';
import type { LoginCredentials, SignupData } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('appra_crm_user') || sessionStorage.getItem('appra_crm_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('appra_crm_token') || sessionStorage.getItem('appra_crm_token');
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('appra_crm_token') || sessionStorage.getItem('appra_crm_token');
      if (storedToken) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('appra_crm_user', JSON.stringify(currentUser));
        } catch {
          // If token verification fails and we have a stored user, keep it or clear depending on error
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    const receivedToken = response.token;
    const receivedUser = response.user;

    setToken(receivedToken);
    setUser(receivedUser);

    if (credentials.rememberMe) {
      localStorage.setItem('appra_crm_token', receivedToken);
      localStorage.setItem('appra_crm_user', JSON.stringify(receivedUser));
    } else {
      sessionStorage.setItem('appra_crm_token', receivedToken);
      sessionStorage.setItem('appra_crm_user', JSON.stringify(receivedUser));
    }
  };

  const signup = async (data: SignupData) => {
    const response = await authService.signup(data);
    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('appra_crm_token', response.token);
      localStorage.setItem('appra_crm_user', JSON.stringify(response.user));
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('appra_crm_token');
      localStorage.removeItem('appra_crm_user');
      sessionStorage.removeItem('appra_crm_token');
      sessionStorage.removeItem('appra_crm_user');
    }
  };

  const updateCurrentUser = (updatedFields: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updatedFields };
      setUser(updated);
      localStorage.setItem('appra_crm_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token || !!user,
        loading,
        login,
        signup,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
