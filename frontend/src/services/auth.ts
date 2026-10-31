import { getApiBase, setAuthToken } from './api';
import { AuthResponse, User } from '../types';

const API_BASE = getApiBase();

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
      body: JSON.stringify(data),
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Registration failed.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token);
    }
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
      body: JSON.stringify(data),
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Invalid email or password.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token);
    }
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Google authentication failed.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token);
    }
    return result;
  },

  async refreshSession(refreshToken?: string | null): Promise<AuthResponse> {
    const body = refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : JSON.stringify({});
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error('Session expired.');
    }
    const result: AuthResponse = await res.json();
    if (result.access_token) {
      setAuthToken(result.access_token);
    }
    return result;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem('learnloop_refresh_token') : null;
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined,
        credentials: 'include'
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAuthToken(null);
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error('Failed to retrieve user profile.');
    }
    return await res.json();
  },

  async updateProfile(fullName: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName }),
      credentials: 'include'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Profile update failed.');
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to change password.');
    }
    return await res.json();
  }
};

