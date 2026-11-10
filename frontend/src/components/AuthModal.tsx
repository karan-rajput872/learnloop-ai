import React, { useState, useEffect } from 'react';
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
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Clock
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
    user,
    lastUser,
    clearLastUser
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
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [showGoogleConfigGuide, setShowGoogleConfigGuide] = useState(false);
  const [isGoogleBtnRendered, setIsGoogleBtnRendered] = useState(false);

  const googleBtnContainerRef = React.useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (authModal === 'login') {
      try {
        const wasInactive = localStorage.getItem('learnloop_inactivity_expired');
        if (wasInactive === 'true') {
          setInactivityNotice('Your session timed out after 3.5 hours of inactivity. Please sign in to resume your learning.');
          localStorage.removeItem('learnloop_inactivity_expired');
        }
      } catch {}
    } else {
      setInactivityNotice(null);
    }
  }, [authModal]);

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowGoogleConfigGuide(false);
    if (authModal === 'login' || authModal === 'register') {
      if (!email) {
        if (lastUser?.email) {
          setEmail(lastUser.email);
        } else {
          try {
            const savedEmail = localStorage.getItem('learnloop_saved_email');
            if (savedEmail) {
              setEmail(savedEmail);
            } else {
              const saved = localStorage.getItem('learnloop_last_user');
              if (saved) {
                const u = JSON.parse(saved);
                if (u?.email) setEmail(u.email);
              } else {
                const accounts = localStorage.getItem('learnloop_accounts');
                if (accounts) {
                  const parsed = JSON.parse(accounts);
                  const keys = Object.keys(parsed);
                  if (keys.length > 0) setEmail(keys[keys.length - 1]);
                }
              }
            }
          } catch { }
        }
      }
    }
  }, [authModal, lastUser]);

  useEffect(() => {
    if ((authModal === 'login' || authModal === 'register') && googleClientId && googleClientId.trim() !== '') {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            auto_select: false,
            callback: async (response: { credential: string }) => {
              if (response?.credential) {
                setIsLoading(true);
                setErrorMessage(null);
                try {
                  await loginWithGoogle(response.credential);
                  closeAuthModal();
                } catch (err: any) {
                  setErrorMessage(err.message || 'Google authentication failed. Please try again.');
                } finally {
                  setIsLoading(false);
                }
              }
            }
          });
          googleBtnContainerRef.current.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
          setIsGoogleBtnRendered(true);
        } catch (e) {
          console.warn('[Google GIS] Button render error:', e);
          setIsGoogleBtnRendered(false);
        }
      }
    }
  }, [authModal, googleClientId]);

  if (!authModal) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    try {
      localStorage.setItem('learnloop_saved_email', trimmedEmail);
    } catch {}
    setIsLoading(true);
    try {
      await login(trimmedEmail, password);
      closeAuthModal();
    } catch (err: any) {
      setErrorMessage(typeof err?.message === 'string' ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    try {
      localStorage.setItem('learnloop_saved_email', trimmedEmail);
    } catch {}
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
        email: trimmedEmail,
        password,
        confirm_password: confirmPassword,
        full_name: trimmedName || 'Learner',
        terms_accepted: termsAccepted
      });
      closeAuthModal();
    } catch (err: any) {
      setErrorMessage(typeof err?.message === 'string' ? err.message : 'Registration failed. Please try again.');
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

  const handleGoogleClick = async () => {
    if (!googleClientId || googleClientId.trim() === '') {
      setShowGoogleConfigGuide(true);
      return;
    }
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
      } catch {
        setShowGoogleConfigGuide(true);
      }
    } else {
      setShowGoogleConfigGuide(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] flex flex-col bg-white dark:bg-[#182A42] text-[#17243A] dark:text-[#F1F5FB] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-[#243B5B] overflow-hidden transition-colors">
        {/* Header Banner - Midnight Academic Brand */}
        <div className="bg-[#243B63] dark:bg-[#14233A] px-5 sm:px-6 py-5 text-white relative shrink-0 border-b border-[#E2E8F0] dark:border-[#243B5B]">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-white/15 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-[#38B7A5]" />
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A8B7CC]">
              {authModal === 'profile' ? 'Account Profile' : 'Secure Learner Access'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold font-heading">
            {authModal === 'login' && 'Welcome Back to LearnLoop'}
            {authModal === 'register' && 'Create Your Learner Account'}
            {authModal === 'profile' && 'Learner Profile & Settings'}
          </h3>
          <p className="text-xs text-[#A8B7CC] mt-1">
            {authModal === 'login' && 'Sign in with your email and password to access your persistent mastery path.'}
            {authModal === 'register' && 'Track personal concept mastery across all 12 DSA topics with adaptive AI.'}
            {authModal === 'profile' && 'Manage your credentials and view account partition telemetry.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1" data-lenis-prevent>
          {inactivityNotice && (
            <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <div className="space-y-0.5">
                <span className="font-semibold block">Automatic Session Sign-Out</span>
                <span className="leading-relaxed">{inactivityNotice}</span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {errorMessage.toLowerCase().includes('already exists') && authModal === 'register' && (
                <div className="pt-1 pl-6">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      openAuthModal('login');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-medium rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Sign in to this account</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              )}
              {errorMessage.toLowerCase().includes('registered using google') && (
                <div className="pt-1 pl-6">
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Continue with Google</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {showGoogleConfigGuide && (
            <div className="mb-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-[#17243A] dark:text-[#F1F5FB] space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-bold font-heading text-sm text-[#243B63] dark:text-[#6C8FF5]">
                  <ShieldCheck className="w-4 h-4 text-[#38B7A5]" />
                  <span>Google Cloud Identity Services Configuration</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleConfigGuide(false)}
                  className="text-[#64748B] hover:text-[#17243A] dark:text-[#A8B7CC] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed">
                To enable Google Single Sign-On across preview and production environments:
              </p>
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#182A42] font-mono text-[11px] space-y-1 border border-[#E2E8F0] dark:border-[#243B5B]">
                <div><strong>Frontend Env:</strong> VITE_GOOGLE_CLIENT_ID=&lt;id&gt;.apps.googleusercontent.com</div>
                <div><strong>Backend Env:</strong> GOOGLE_CLIENT_ID=&lt;id&gt;.apps.googleusercontent.com</div>
                <div className="pt-1 text-[#38B7A5]"><strong>Authorized JavaScript Origins:</strong></div>
                <div className="pl-2">• http://localhost:3000</div>
                <div className="pl-2">• https://learnloop-ai-one.vercel.app</div>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#A8B7CC]">
                You can authenticate immediately with email & password, or click &quot;Start Demo Session&quot; for instant access.
              </p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {authModal === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Returning User Recognition Chip */}
              {(lastUser || email) && (
                <div className="p-3 rounded-xl bg-[#EDF2F8] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[#243B63] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(lastUser?.full_name || email || 'L').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] block">Recognized account:</span>
                      <strong className="text-[#17243A] dark:text-[#F1F5FB] font-semibold truncate block">
                        {lastUser?.full_name || email}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearLastUser();
                      setEmail('');
                      setPassword('');
                      try {
                        localStorage.removeItem('learnloop_saved_email');
                      } catch {}
                    }}
                    className="text-xs text-[#6C8FF5] hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    Switch Account
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#6C8FF5] hover:underline font-medium cursor-pointer flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to LearnLoop</span>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#243B5B]"></div>
                <span className="flex-shrink mx-3 text-xs text-[#64748B] dark:text-[#A8B7CC] font-medium">Or continue with</span>
                <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#243B5B]"></div>
              </div>

              <div className="space-y-2">
                <div ref={googleBtnContainerRef} className="w-full flex justify-center min-h-[40px] empty:hidden" />
                {!isGoogleBtnRendered && (
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="w-full py-2.5 px-4 bg-white dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] hover:bg-slate-50 dark:hover:bg-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                )}
              </div>

              <div className="pt-2 text-center text-xs text-[#64748B] dark:text-[#A8B7CC]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="text-[#6C8FF5] font-semibold hover:underline cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                    Password (min 8 characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#6C8FF5] hover:underline font-medium cursor-pointer flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl text-sm text-[#17243A] dark:text-[#F1F5FB] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#38B7A5] focus:bg-white dark:focus:bg-[#182A42] transition-all"
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
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#38B7A5] focus:ring-[#38B7A5]"
                />
                <label htmlFor="terms" className="text-xs text-[#64748B] dark:text-[#A8B7CC] leading-tight">
                  I agree to the LearnLoop educational terms and data isolation policy.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#243B5B]"></div>
                <span className="flex-shrink mx-3 text-xs text-[#64748B] dark:text-[#A8B7CC] font-medium">Or</span>
                <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#243B5B]"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleClick}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] hover:bg-slate-50 dark:hover:bg-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign up with Google</span>
              </button>

              <div className="pt-2 text-center text-xs text-[#64748B] dark:text-[#A8B7CC]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="text-[#6C8FF5] font-semibold hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* VIEW: USER PROFILE & SETTINGS */}
          {authModal === 'profile' && user && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#20344E] rounded-2xl border border-[#E2E8F0] dark:border-[#243B5B]">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#243B63] to-[#38B7A5] flex items-center justify-center text-white text-xl font-bold shadow-xs">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#17243A] dark:text-[#F1F5FB]">{user.full_name}</h4>
                  <p className="text-xs text-[#64748B] dark:text-[#A8B7CC]">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDF2F8] dark:bg-[#182A42] text-[#243B63] dark:text-[#38B7A5] uppercase tracking-wider border border-[#E2E8F0] dark:border-[#243B5B]">
                      {user.role}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-2 border-b border-[#E2E8F0] dark:border-[#243B5B] text-[#64748B] dark:text-[#A8B7CC]">
                  <span>Student Partition ID:</span>
                  <span className="font-mono text-[#17243A] dark:text-[#F1F5FB] font-medium">{user.student_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E2E8F0] dark:border-[#243B5B] text-[#64748B] dark:text-[#A8B7CC]">
                  <span>Authentication Method:</span>
                  <span className="font-medium text-[#17243A] dark:text-[#F1F5FB] capitalize">{user.auth_provider}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#E2E8F0] dark:border-[#243B5B] text-[#64748B] dark:text-[#A8B7CC]">
                  <span>Password Encryption:</span>
                  <span className="font-medium text-[#38B7A5]">Argon2id (OWASP standard)</span>
                </div>
              </div>

              {/* Change Password Collapsible Section */}
              {user.auth_provider === 'local' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(!showChangePassword)}
                    className="text-xs font-semibold text-[#6C8FF5] hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{showChangePassword ? 'Cancel Change Password' : 'Change Password'}</span>
                  </button>

                  {showChangePassword && (
                    <form onSubmit={handleChangePasswordSubmit} className="mt-3 space-y-3 p-3.5 bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] rounded-xl animate-in fade-in">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          required
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] rounded-lg text-xs text-[#17243A] dark:text-[#F1F5FB] focus:outline-none focus:ring-2 focus:ring-[#38B7A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                          New Password (min 8 chars)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] rounded-lg text-xs text-[#17243A] dark:text-[#F1F5FB] focus:outline-none focus:ring-2 focus:ring-[#38B7A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#17243A] dark:text-[#F1F5FB] mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] rounded-lg text-xs text-[#17243A] dark:text-[#F1F5FB] focus:outline-none focus:ring-2 focus:ring-[#38B7A5]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-1.5 px-3 bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                  className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 font-medium text-sm rounded-xl border border-rose-200 dark:border-rose-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
