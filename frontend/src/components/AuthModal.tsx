import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  LogOut,
  Calendar,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModal,
    closeAuthModal,
    openAuthModal,
    login,
    register,
    loginWithGoogle,
    startDemoSession,
    logout,
    user
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [authModal]);

  if (!authModal) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(email, password);
      closeAuthModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email,
        password,
        confirm_password: confirmPassword,
        full_name: fullName,
        terms_accepted: termsAccepted
      });
      closeAuthModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmNewPassword
      });
      setSuccessMessage('Password changed successfully.');
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDemo = async () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setErrorMessage('Google Sign-In requires VITE_GOOGLE_CLIENT_ID configured in Vercel and GOOGLE_CLIENT_ID in Render. You can create an account or sign in with email & password right now.');
      return;
    }
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential: string }) => {
            if (response?.credential) {
              setIsLoading(true);
              setErrorMessage(null);
              try {
                await loginWithGoogle(response.credential);
                closeAuthModal();
              } catch (err: any) {
                setErrorMessage(err.message || 'Google authentication failed.');
              } finally {
                setIsLoading(false);
              }
            }
          }
        });
        (window as any).google.accounts.id.prompt();
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not launch Google Sign-In.');
      }
    } else {
      setErrorMessage('Google Identity Services library is loading. Please try again or sign in with email & password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-6 text-white relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-100">
              {authModal === 'profile' ? 'Account Profile' : 'Secure Access'}
            </span>
          </div>

          <h3 className="text-xl font-bold">
            {authModal === 'login' && 'Welcome Back to LearnLoop'}
            {authModal === 'register' && 'Create Your Learner Account'}
            {authModal === 'profile' && 'Learner Profile & Settings'}
          </h3>
          <p className="text-xs text-indigo-100/90 mt-1">
            {authModal === 'login' && 'Sign in to access your persistent mastery profile and AI tutor.'}
            {authModal === 'register' && 'Track personal concept mastery across all 12 DSA topics.'}
            {authModal === 'profile' && 'Manage your credentials and view account telemetry.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1-Click Instant Demo Access */}
          {authModal !== 'profile' && (
            <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                <span className="text-slate-800 font-medium">Reviewing for Hackathon?</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await startDemoSession();
                  closeAuthModal();
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl font-bold text-[11px] shadow-xs transition-all transform hover:scale-105 shrink-0"
              >
                Explore Live Demo
              </button>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {authModal === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-400 font-medium">Or continue with</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleDemo}
                className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Create one free
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {authModal === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
                  I agree to the LearnLoop educational terms and data isolation policy.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Learner Account</span>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* VIEW: USER PROFILE & SETTINGS */}
          {authModal === 'profile' && user && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{user.full_name}</h4>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                      {user.role}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                  <span className="text-slate-400">Student Partition ID:</span>
                  <span className="font-mono text-slate-700 font-medium">{user.student_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                  <span className="text-slate-400">Authentication Method:</span>
                  <span className="font-medium text-slate-700 capitalize">{user.auth_provider}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                  <span className="text-slate-400">Password Encryption:</span>
                  <span className="font-medium text-emerald-600">Argon2id (OWASP standard)</span>
                </div>
              </div>

              {/* Change Password Collapsible Section */}
              {user.auth_provider === 'local' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{showChangePassword ? 'Cancel Change Password' : 'Change Password'}</span>
                  </button>

                  {showChangePassword && (
                    <form onSubmit={handleChangePasswordSubmit} className="mt-3 space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          required
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          New Password (min 8 chars)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Update Password</span>}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    closeAuthModal();
                  }}
                  className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-sm rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of LearnLoop</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

