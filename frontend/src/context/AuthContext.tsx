import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LearnerProfile } from '../types';
import { authService, subscribeAuthSync, AuthSyncMessage, AuthApiError } from '../services/auth';
import { setAuthToken } from '../services/api';

export type AuthStatus = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'SESSION_EXPIRED' | 'AUTH_ERROR';

export interface LastKnownUser {
  email: string;
  full_name: string;
  student_id: string;
}

interface AuthContextType {
  user: User | null;
  learner: LearnerProfile | null;
  lastUser: LastKnownUser | null;
  clearLastUser: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
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
  startDemoSession: () => Promise<void>;
  resetDemoSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  setLearnerProfile: (profile: LearnerProfile) => void;
  retryRestoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Note: Refresh tokens are NEVER stored in localStorage or sessionStorage.
// They are held exclusively in HttpOnly, SameSite=Lax cookies managed by the browser.
const USER_CACHE_KEY = 'learnloop_cached_user';
const LAST_USER_KEY = 'learnloop_last_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [lastUser, setLastUser] = useState<LastKnownUser | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_USER_KEY);
      if (saved) return JSON.parse(saved);
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        const u = JSON.parse(cached);
        return { email: u.email, full_name: u.full_name, student_id: u.student_id };
      }
      return null;
    } catch {
      return null;
    }
  });

  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING');
  const [authModal, setAuthModal] = useState<'login' | 'register' | 'profile' | null>(null);

  const rememberUser = useCallback((u: User) => {
    const record: LastKnownUser = {
      email: u.email,
      full_name: u.full_name,
      student_id: u.student_id
    };
    setLastUser(record);
    try {
      localStorage.setItem(LAST_USER_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearLastUser = useCallback(() => {
    setLastUser(null);
    try {
      localStorage.removeItem(LAST_USER_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const openAuthModal = useCallback((modal: 'login' | 'register' | 'profile') => {
    setAuthModal(modal);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal(null);
  }, []);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setAuthStatus('INITIALIZING');
    try {
      const response = await authService.refreshSession();
      if (response && response.access_token) {
        setUser(response.user);
        rememberUser(response.user);
        if (response.learner) setLearner(response.learner);
        setAuthStatus('AUTHENTICATED');
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.user));
        } catch {
          // Ignore storage quota
        }
        setAuthToken(response.access_token, response.user.student_id);
      } else {
        setAuthStatus(user ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
      }
    } catch (err: any) {
      const isSessionExpired = err instanceof AuthApiError
        ? err.status === 401
        : err.message === 'Session expired.';

      const isNetworkOrColdBoot = (err instanceof AuthApiError && err.isNetworkOrServerError) || (
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('timeout') ||
        err.message?.includes('waking up') ||
        err.message?.includes('temporarily unavailable')
      );

      if (isSessionExpired) {
        setUser(null);
        setLearner(null);
        try {
          localStorage.removeItem(USER_CACHE_KEY);
          // NOTE: We deliberately PRESERVE 'learnloop_last_user' so returning users are recognized!
        } catch {
          // Ignore
        }
        setAuthToken(null, null);
        setAuthStatus('SESSION_EXPIRED');
      } else if (isNetworkOrColdBoot) {
        // Cold-boot delay or transient network drop: preserve user identity from cache!
        console.warn('[LearnLoop Auth] Transient backend delay during session restoration. Preserving cached identity.');
        setAuthStatus(user ? 'AUTHENTICATED' : 'AUTH_ERROR');
      } else {
        setAuthStatus('UNAUTHENTICATED');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, rememberUser]);

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

    restoreSession();

    // Cross-tab synchronization via BroadcastChannel
    const unsubscribe = subscribeAuthSync((message: AuthSyncMessage) => {
      if (!isMounted) return;
      if (message.type === 'LOGIN' || message.type === 'REFRESH') {
        setUser(message.user);
        rememberUser(message.user);
        if (message.learner) setLearner(message.learner);
        setAuthStatus('AUTHENTICATED');
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(message.user));
        } catch {
          // Ignore
        }
        if (message.user.student_id) {
          setAuthToken(null, message.user.student_id);
        }
      } else if (message.type === 'LOGOUT') {
        setUser(null);
        setLearner(null);
        setAuthStatus('UNAUTHENTICATED');
        try {
          localStorage.removeItem(USER_CACHE_KEY);
        } catch {
          // Ignore
        }
        setAuthToken(null, null);
        setAuthModal(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [rememberUser, restoreSession]);

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await authService.login({ email, password, remember_me: rememberMe });
    setUser(res.user);
    rememberUser(res.user);
    if (res.learner) setLearner(res.learner);
    setAuthStatus('AUTHENTICATED');
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthToken(res.access_token, res.user.student_id);
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
    rememberUser(res.user);
    if (res.learner) setLearner(res.learner);
    setAuthStatus('AUTHENTICATED');
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthToken(res.access_token, res.user.student_id);
    setAuthModal(null);
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await authService.loginWithGoogle(idToken);
    setUser(res.user);
    rememberUser(res.user);
    if (res.learner) setLearner(res.learner);
    setAuthStatus('AUTHENTICATED');
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(res.user));
    } catch {
      // Ignore
    }
    setAuthToken(res.access_token, res.user.student_id);
    setAuthModal(null);
  };

  const startDemoSession = async () => {
    setIsLoading(true);
    try {
      const response = await authService.startDemoSession();
      setUser(response.user);
      rememberUser(response.user);
      if (response.learner) setLearner(response.learner);
      setAuthStatus('AUTHENTICATED');
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.user));
      } catch {
        // Ignore
      }
      setAuthToken(response.access_token, response.user.student_id);
      setAuthModal(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemoSession = async () => {
    setIsLoading(true);
    try {
      await authService.resetDemoSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLearner(null);
      setAuthStatus('UNAUTHENTICATED');
      try {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem('learnloop_refresh_token');
      } catch {
        // Ignore
      }
      setAuthToken(null, null);
      setAuthModal(null);
    }
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    rememberUser(updated);
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
        lastUser,
        clearLastUser,
        isAuthenticated: !!user,
        isLoading,
        authStatus,
        authModal,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        loginWithGoogle,
        startDemoSession,
        resetDemoSession,
        logout,
        updateUser,
        setLearnerProfile: setLearner,
        retryRestoreSession: restoreSession
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
