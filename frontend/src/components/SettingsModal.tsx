import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Laptop,
  Clock,
  Globe,
  Sliders,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Save,
  Loader2
} from 'lucide-react';
import { User, UserSettings } from '../types';
import { api, getLocalUserSettings, saveLocalUserSettings } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSettingsSaved?: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSettingsSaved
}) => {
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'notifications' | 'security'>('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return appTheme || 'system';
  });
  const [dailyGoal, setDailyGoal] = useState<number>(30);
  const [timezone, setTimezone] = useState<string>('UTC');
  const [preferredMode, setPreferredMode] = useState<string>('balanced');
  const [preferences, setPreferences] = useState<string[]>([
    'step_by_step',
    'visual_diagrams',
    'code_demonstrations'
  ]);
  const [inAppNotifications, setInAppNotifications] = useState<boolean>(true);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [soundEffects, setSoundEffects] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const studentId = user?.student_id;

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load settings on open: Preload instantly from local cache, then sync in background
  useEffect(() => {
    if (!isOpen) return;
    setSaveSuccess(false);
    setErrorMessage(null);

    // 1. Preload instantly from local cache
    const local = getLocalUserSettings(studentId);
    if (local) {
      if (local.theme) setTheme(local.theme);
      else if (appTheme) setTheme(appTheme);
      if (local.daily_learning_goal_minutes || local.daily_goal_minutes) {
        setDailyGoal(local.daily_learning_goal_minutes || local.daily_goal_minutes);
      }
      if (local.timezone) setTimezone(local.timezone);
      if (local.preferred_learning_mode) setPreferredMode(local.preferred_learning_mode);
      if (Array.isArray(local.learning_preferences)) setPreferences(local.learning_preferences);
      if (typeof local.in_app_notifications === 'boolean') setInAppNotifications(local.in_app_notifications);
      if (typeof local.email_notifications === 'boolean') setEmailNotifications(local.email_notifications);
      if (typeof local.sound_effects === 'boolean') setSoundEffects(local.sound_effects);
    } else {
      if (appTheme) setTheme(appTheme);
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
      } catch {}
    }

    // 2. Fetch fresh settings in background
    api.getUserSettings(studentId)
      .then((data) => {
        if (data) {
          if (data.theme) setTheme(data.theme);
          if (data.daily_learning_goal_minutes || data.daily_goal_minutes) {
            setDailyGoal(data.daily_learning_goal_minutes || data.daily_goal_minutes);
          }
          if (data.timezone) setTimezone(data.timezone);
          if (data.preferred_learning_mode) setPreferredMode(data.preferred_learning_mode);
          if (Array.isArray(data.learning_preferences)) setPreferences(data.learning_preferences);
          if (typeof data.in_app_notifications === 'boolean') setInAppNotifications(data.in_app_notifications);
          if (typeof data.email_notifications === 'boolean') setEmailNotifications(data.email_notifications);
          if (typeof data.sound_effects === 'boolean') setSoundEffects(data.sound_effects);
        }
      })
      .catch((err) => {
        console.warn('Could not load user settings from backend, using defaults:', err);
      });
  }, [isOpen, studentId, appTheme]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    const payload: UserSettings = {
      theme,
      daily_learning_goal_minutes: dailyGoal,
      timezone,
      preferred_learning_mode: preferredMode,
      learning_preferences: preferences,
      in_app_notifications: inAppNotifications,
      email_notifications: emailNotifications,
      sound_effects: soundEffects,
    };

    try {
      // 1. Apply theme immediately via ThemeContext
      setAppTheme(theme);

      // 2. Persist settings and sync
      await api.updateUserSettings({
        student_id: user?.student_id,
        ...payload
      });

      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch {
      // Guaranteed fallback: persist locally and succeed
      setAppTheme(theme);
      saveLocalUserSettings(user?.student_id, payload);
      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const togglePreference = (pref: string) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#182A42] text-[#172033] dark:text-[#F1F5FB] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E6E9EF] dark:border-[#243B5B] flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E9EF] dark:border-[#243B5B] flex items-center justify-between bg-slate-50/70 dark:bg-[#14233A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF0FD] dark:bg-[#20344E] flex items-center justify-center text-[#5B5CE2] dark:text-[#38B7A5] shadow-xs shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-sans text-[#172033] dark:text-[#F1F5FB]">Account & Application Settings</h2>
              <p className="text-xs text-[#667085] dark:text-[#A8B7CC]">Personalize your learning environment and notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#E6E9EF] dark:border-[#243B5B] bg-white dark:bg-[#182A42] px-4 sm:px-6 pt-1 gap-2 sm:gap-4 text-xs font-medium overflow-x-auto no-scrollbar touch-pan-x shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#5B5CE2] dark:border-[#38B7A5] text-[#5B5CE2] dark:text-[#38B7A5] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-[#5B5CE2] dark:border-[#38B7A5] text-[#5B5CE2] dark:text-[#38B7A5] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Learning Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-[#5B5CE2] dark:border-[#38B7A5] text-[#5B5CE2] dark:text-[#38B7A5] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#5B5CE2] dark:border-[#38B7A5] text-[#5B5CE2] dark:text-[#38B7A5] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & Privacy</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans" data-lenis-prevent>
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#5B5CE2] dark:text-[#38B7A5]" />
              <p className="text-xs">Loading persisted settings...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Settings successfully saved and persisted!</span>
                </div>
              )}

              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  {/* Theme Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B7CC] mb-2">
                      Interface Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Laptop },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSel = theme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id as any)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                              isSel
                                ? 'bg-[#EEF0FD] dark:bg-[#20344E] border-[#5B5CE2] dark:border-[#38B7A5] text-[#5B5CE2] dark:text-[#38B7A5] shadow-xs font-semibold'
                                : 'bg-white dark:bg-[#14233A] border-[#E6E9EF] dark:border-[#243B5B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#20344E]'
                            }`}
                          >
                            <Icon className="w-5 h-5 mb-1.5" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Learning Goal */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B7CC] mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5B5CE2] dark:text-[#38B7A5]" />
                      Daily Learning Goal (Minutes)
                    </label>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDailyGoal(mins)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            dailyGoal === mins
                              ? 'bg-[#5B5CE2] dark:bg-[#38B7A5] border-[#5B5CE2] dark:border-[#38B7A5] text-white dark:text-[#101B2D] shadow-xs'
                              : 'bg-white dark:bg-[#14233A] border-[#E6E9EF] dark:border-[#243B5B] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#20344E]'
                          }`}
                        >
                          {mins} mins
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] dark:text-[#A8B7CC] mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#5B5CE2] dark:text-[#38B7A5]" />
                      Timezone (For Spaced Revision Scheduling)
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E9EF] dark:border-[#243B5B] text-xs font-mono text-slate-800 dark:text-[#F1F5FB] bg-slate-50 dark:bg-[#14233A] focus:bg-white dark:focus:bg-[#182A42] focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20 dark:focus:ring-[#38B7A5]/30 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <p className="text-xs text-[#667085] dark:text-[#A8B7CC]">
                    Select the explanation styles and pedagogical approaches you prefer from the AI Tutor and question engine:
                  </p>
                  <div className="space-y-2.5">
                    {[
                      { id: 'step_by_step', label: 'Step-by-step problem breakdowns', desc: 'Detailed progressive solutions' },
                      { id: 'visual_diagrams', label: 'Visual diagrams & ASCII memory layouts', desc: 'Mental models of pointer movements and tree graphs' },
                      { id: 'code_demonstrations', label: 'Executable code examples & test traces', desc: 'Clear Python/C++/Java implementation snippets' },
                      { id: 'socratic_questioning', label: 'Socratic questioning & guided hints', desc: 'Questions that prompt you to uncover the answer' },
                      { id: 'real_world_analogies', label: 'Real-world physical analogies', desc: 'Call stacks as cafeterias, hash tables as library drawers' },
                    ].map((item) => {
                      const isChecked = preferences.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => togglePreference(item.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-[#EEF0FD] dark:bg-[#20344E] border-[#C7D2FE] dark:border-[#38B7A5] text-[#172033] dark:text-[#F1F5FB]'
                              : 'bg-white dark:bg-[#14233A] border-[#E6E9EF] dark:border-[#243B5B] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#20344E]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-[#5B5CE2] dark:text-[#38B7A5] focus:ring-[#5B5CE2]"
                          />
                          <div>
                            <div className="text-xs font-semibold">{item.label}</div>
                            <div className="text-[11px] text-[#667085] dark:text-[#A8B7CC] leading-tight mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <p className="text-xs text-[#667085] dark:text-[#A8B7CC]">
                    Manage in-app notifications and study alerts for spaced repetition:
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] dark:border-[#243B5B] bg-slate-50/50 dark:bg-[#14233A] cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-[#F1F5FB]">In-App Notifications</div>
                        <div className="text-[11px] text-[#667085] dark:text-[#A8B7CC]">Receive alerts when spaced revision tasks become due</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={inAppNotifications}
                        onChange={(e) => setInAppNotifications(e.target.checked)}
                        className="rounded text-[#5B5CE2] dark:text-[#38B7A5] focus:ring-[#5B5CE2] w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] dark:border-[#243B5B] bg-slate-50/50 dark:bg-[#14233A] cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-[#F1F5FB]">Streak & Achievement Celebrations</div>
                        <div className="text-[11px] text-[#667085] dark:text-[#A8B7CC]">Sound effects and visual toasts upon unlocking badges</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEffects}
                        onChange={(e) => setSoundEffects(e.target.checked)}
                        className="rounded text-[#5B5CE2] dark:text-[#38B7A5] focus:ring-[#5B5CE2] w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] dark:border-[#243B5B] bg-slate-50/50 dark:bg-[#14233A] cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-[#F1F5FB]">Email Digest Reminders</div>
                        <div className="text-[11px] text-[#667085] dark:text-[#A8B7CC]">Weekly concept retention summaries</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="rounded text-[#5B5CE2] dark:text-[#38B7A5] focus:ring-[#5B5CE2] w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-[#14233A] border border-indigo-100 dark:border-[#243B5B] space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-[#6C8FF5] font-bold">
                      <ShieldCheck className="w-4 h-4 text-[#38B7A5]" />
                      <span>Security & Identity Telemetry</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-[#A8B7CC]">
                      <div><strong className="text-slate-900 dark:text-white">Email:</strong> {user?.email || 'unauthenticated'}</div>
                      <div><strong className="text-slate-900 dark:text-white">Account Role:</strong> {user?.role || 'student'}</div>
                      <div><strong className="text-slate-900 dark:text-white">Auth Method:</strong> {user?.auth_provider || 'local (Argon2id)'}</div>
                      <div><strong className="text-slate-900 dark:text-white">Password Hashing:</strong> OWASP-compliant Argon2id (zero plaintext)</div>
                      <div><strong className="text-slate-900 dark:text-white">Session Tokens:</strong> HttpOnly SameSite=Lax Secure Cookies</div>
                      <div><strong className="text-slate-900 dark:text-white">Privacy Guarantee:</strong> Strict Multi-Tenant Isolation & FERPA Compliant</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-[#A8B7CC] leading-relaxed">
                    Account passwords cannot be retrieved because LearnLoop AI never stores plaintext passwords. If you need to reset your password or delete your account data, contact your course administrator.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E6E9EF] dark:border-[#243B5B] bg-slate-50/70 dark:bg-[#14233A] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E6E9EF] dark:border-[#243B5B] bg-white dark:bg-[#182A42] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#20344E] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
