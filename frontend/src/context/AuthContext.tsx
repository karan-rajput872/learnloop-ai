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

// Automatic logout after 3.5 hours of inactivity (in the 3 to 4 hours range requested)
const INACTIVITY_TIMEOUT_MS = 3.5 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'learnloop_last_activity_time';

export function recordUserActivity(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {}
}

export function getLastActivityTime(): number {
  if (typeof localStorage === 'undefined') return Date.now();
  try {
    const val = localStorage.getItem(LAST_ACTIVITY_KEY);
    return val ? parseInt(val, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

export function isSessionExpiredByInactivity(): boolean {
  const last = getLastActivityTime();
  return Date.now() - last > INACTIVITY_TIMEOUT_MS;
}

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
    // 1. Enforce automatic logout after 3 to 4 hours of inactivity
    const cachedUser = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_CACHE_KEY) : null;
    if (cachedUser && isSessionExpiredByInactivity()) {
      console.info('[LearnLoop Auth] Session expired due to inactivity (>3.5 hours). Automatically signing out.');
      try {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem('learnloop_refresh_token');
        localStorage.removeItem('learnloop_session_token');
        localStorage.setItem('learnloop_inactivity_expired', 'true');
      } catch {}
      setAuthToken(null, null);
      setUser(null);
      setLearner(null);
      setAuthStatus('UNAUTHENTICATED');
      setIsLoading(false);
      return;
    }

    recordUserActivity();
    setIsLoading(true);
    setAuthStatus('INITIALIZING');
    try {
      const response = await authService.refreshSession();
      if (response && response.user) {
        setUser(response.user);
        rememberUser(response.user);
        if (response.learner) setLearner(response.learner);
        setAuthStatus('AUTHENTICATED');
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(response.user));
        } catch {
          // Ignore storage quota
        }
        if (response.access_token) {
          setAuthToken(response.access_token, response.user.student_id);
        }
        return;
      }
    } catch {
      // In case backend is cold, 429, or offline, preserve active user identity from local cache!
      try {
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          const u = JSON.parse(cached);
          console.info('[LearnLoop Auth] Preserving active user session from local cache:', u.email);
          setUser(u);
          rememberUser(u);
          const storedLearner = authService.getStoredLearner(u.student_id);
          if (storedLearner) setLearner(storedLearner);
          setAuthStatus('AUTHENTICATED');
          setAuthToken('restored_cached_session', u.student_id);
          return;
        }
      } catch {
        // Bad JSON
      }

      setAuthStatus('UNAUTHENTICATED');
    } finally {
      setIsLoading(false);
    }
  }, [rememberUser]);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

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
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('learnloop_explicit_logout');
      }
    } catch {}
    recordUserActivity();
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
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('learnloop_explicit_logout');
      }
    } catch {}
    recordUserActivity();
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
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('learnloop_explicit_logout');
      }
    } catch {}
    recordUserActivity();
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
      recordUserActivity();
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
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('learnloop_explicit_logout', 'true');
      }
      await authService.logout();
    } finally {
      setUser(null);
      setLearner(null);
      setAuthStatus('UNAUTHENTICATED');
      try {
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem('learnloop_refresh_token');
        localStorage.removeItem('learnloop_session_token');
      } catch {
        // Ignore
      }
      setAuthToken(null, null);
      setAuthModal(null);
    }
  };

  // Listen for user interaction to track active usage and enforce 3-4 hr inactivity timeout
  useEffect(() => {
    if (!user) return;

    let lastThrottle = Date.now();
    recordUserActivity();

    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastThrottle > 30000) {
        lastThrottle = now;
        recordUserActivity();
      }
    };

    window.addEventListener('mousedown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    // Periodic check every 60s for long-running idle tabs
    const interval = setInterval(() => {
      if (isSessionExpiredByInactivity()) {
        console.warn('[LearnLoop Auth] 3.5 hour inactivity threshold reached. Executing auto-logout.');
        logout();
        try {
          localStorage.setItem('learnloop_inactivity_expired', 'true');
        } catch {}
        openAuthModal('login');
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousedown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      clearInterval(interval);
    };
  }, [user, openAuthModal]);

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
