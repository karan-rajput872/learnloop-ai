import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LearnerProfile } from '../types';
import { authService, subscribeAuthSync, AuthSyncMessage } from '../services/auth';
import { setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  learner: LearnerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModal: 'login' | 'register' | 'profile' | null;
  openAuthModal: (modal: 'login' | 'register' | 'profile') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    confirm_password: string;
    full_name: string;
    terms_accepted: boolean;
  }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  setLearnerProfile: (profile: LearnerProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Note: Refresh tokens are NEVER stored in localStorage or sessionStorage.
// They are held exclusively in HttpOnly, SameSite=Lax cookies managed by the browser.
const USER_CACHE_KEY = 'learnloop_cached_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModal, setAuthModal] = useState<'login' | 'register' | 'profile' | null>(null);

  const openAuthModal = useCallback((modal: 'login' | 'register' | 'profile') => {
    setAuthModal(modal);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
  }, []);

  // Restore session on mount via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;

    // Defensive cleanup of any legacy JavaScript refresh token in localStorage
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('learnloop_refresh_token')) {
        localStorage.removeItem('learnloop_refresh_token');
      }
    } catch {
      // Ignore localStorage errors
    }

    async function restoreSession() {
      try {
        const response = await authService.refreshSession();
        if (isMounted && response && response.access_token) {
          setUser(response.user);
          if (response.learner) setLearner(response.learner);
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.user));
        }
      } catch {
        // Not authenticated or refresh expired - clear local UI state
        if (isMounted) {
          setUser(null);
          setLearner(null);
          try {
            localStorage.removeItem(USER_CACHE_KEY);
          } catch {
            // Ignore
          }
          setAuthToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Cross-tab synchronization via BroadcastChannel
    const unsubscribe = subscribeAuthSync((message: AuthSyncMessage) => {
      if (!isMounted) return;
      if (message.type === 'LOGIN' || message.type === 'REFRESH') {
        setUser(message.user);
        if (message.learner) setLearner(message.learner);
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(message.user));
        } catch {
          // Ignore
        }
      } else if (message.type === 'LOGOUT') {
        setUser(null);
        setLearner(null);
        try {
          localStorage.removeItem(USER_CACHE_KEY);
        } catch {
          // Ignore
        }
        setAuthToken(null);
        setAuthModal(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await authService.login({ email, password, remember_me: rememberMe });
    setUser(res.user);
    if (res.learner) setLearner(res.learner);
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthModal(null);
  };

  const register = async (data: {
    email: string;
    password: string;
    confirm_password: string;
    full_name: string;
    terms_accepted: boolean;
  }) => {
    const res = await authService.register(data);
    setUser(res.user);
    if (res.learner) setLearner(res.learner);
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthModal(null);
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await authService.loginWithGoogle(idToken);
    setUser(res.user);
    if (res.learner) setLearner(res.learner);
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthModal(null);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLearner(null);
      try {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem('learnloop_refresh_token');
      } catch {
        // Ignore
      }
      setAuthToken(null);
      setAuthModal(null);
    }
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        learner,
        isAuthenticated: !!user,
        isLoading,
        authModal,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        loginWithGoogle,
        logout,
        updateUser,
        setLearnerProfile: setLearner
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
