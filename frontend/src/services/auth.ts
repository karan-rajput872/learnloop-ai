import { getApiBase, setAuthToken } from './api';
import { AuthResponse, User, LearnerProfile } from '../types';

const API_BASE = getApiBase();

export type AuthSyncMessage =
  | { type: 'LOGIN'; user: User; learner?: LearnerProfile }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH'; user: User; learner?: LearnerProfile };

export class AuthApiError extends Error {
  status: number;
  isNetworkOrServerError: boolean;
  constructor(message: string, status: number = 0, isNetworkOrServerError: boolean = false) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.isNetworkOrServerError = isNetworkOrServerError;
  }
}

async function parseErrorResponse(res: Response, fallbackMessage: string): Promise<AuthApiError> {
  const isServerErr = res.status >= 500;
  if (res.status === 504 || res.status === 502) {
    return new AuthApiError(
      'LearnLoop AI backend is waking up from cold sleep on Render. Please wait 10 seconds and try again.',
      res.status,
      true
    );
  }
  if (res.status === 503) {
    return new AuthApiError(
      'Service temporarily unavailable. Please retry in a few moments.',
      res.status,
      true
    );
  }
  let message = fallbackMessage;
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = data.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join('. ');
    } else if (data.message) {
      message = data.message;
    }
  } catch {
    message = res.statusText || fallbackMessage;
  }
  return new AuthApiError(message, res.status, isServerErr);
}

// Safe cross-tab synchronization channel
const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('learnloop_auth_sync')
  : null;

export const broadcastAuthSync = (message: AuthSyncMessage) => {
  try {
    authChannel?.postMessage(message);
  } catch {
    // Ignore postMessage errors if channel is closed or unsupported
  }
};

export const subscribeAuthSync = (callback: (message: AuthSyncMessage) => void): (() => void) => {
  if (!authChannel) return () => { };
  const handler = (event: MessageEvent<AuthSyncMessage>) => {
    if (event.data && event.data.type) {
      callback(event.data);
    }
  };
  authChannel.addEventListener('message', handler);
  return () => {
    try {
      authChannel.removeEventListener('message', handler);
    } catch {
      // Ignore cleanup error
    }
  };
};

// Single-flight refresh request coalescing to prevent race conditions & duplicate requests
let activeRefreshPromise: Promise<AuthResponse> | null = null;

export const authService = {
  async register(data: {
    email: string;
    password: string;
    confirm_password: string;
    full_name: string;
    terms_accepted: boolean;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim()
      }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Registration failed. Please check your information and try again.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token, result.user?.student_id);
    }
    broadcastAuthSync({ type: 'LOGIN', user: result.user, learner: result.learner });
    return result;
  },

  async login(data: {
    email: string;
    password: string;
    remember_me?: boolean;
  }): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        email: data.email.trim().toLowerCase()
      }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Invalid email or password.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token, result.user?.student_id);
    }
    broadcastAuthSync({ type: 'LOGIN', user: result.user, learner: result.learner });
    return result;
  },

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Google authentication failed.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token, result.user?.student_id);
    }
    broadcastAuthSync({ type: 'LOGIN', user: result.user, learner: result.learner });
    return result;
  },

  async startDemoSession(): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/demo-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Failed to start demo session.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token, result.user?.student_id);
    }
    broadcastAuthSync({ type: 'LOGIN', user: result.user, learner: result.learner });
    return result;
  },

  async resetDemoSession(): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/demo-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Failed to reset demo.');
    }
  },

  async refreshSession(): Promise<AuthResponse> {
    // Single-flight coalescing: reuse active refresh promise if already in flight
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include'
        });
        if (!res.ok) {
          if (res.status === 401) {
            throw new AuthApiError('Session expired.', 401, false);
          }
          throw await parseErrorResponse(res, 'Session restoration temporarily unavailable.');
        }
        const result: AuthResponse = await res.json();
        if (result.access_token) {
          setAuthToken(result.access_token, result.user?.student_id);
        }
        return result;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null, null);
      broadcastAuthSync({ type: 'LOGOUT' });
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Failed to retrieve user profile.');
    }
    return await res.json();
  },

  async updateProfile(fullName: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName.trim() }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Profile update failed.');
    }
    const data = await res.json();
    return data.user;
  },

  async changePassword(data: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password
      }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Failed to change password.');
    }
    return await res.json();
  }
};
