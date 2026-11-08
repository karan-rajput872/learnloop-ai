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
import { api } from '../services/api';

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
  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'notifications' | 'security'>('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
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

  // Auto-detect browser timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {
      // Keep default
    }
  }, []);

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch settings from server on modal open
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    api.getUserSettings(studentId)
      .then((data) => {
        if (data) {
          if (data.theme) setTheme(data.theme);
          if (data.daily_learning_goal_minutes) setDailyGoal(data.daily_learning_goal_minutes);
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
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, studentId]);

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
      await api.updateUserSettings({
        student_id: user?.student_id,
        ...payload
      });

      // Apply theme changes to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved(payload);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings. Please try again.');
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E6E9EF] flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF0FD] flex items-center justify-center text-[#5B5CE2] shadow-xs shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172033] font-sans">Account & Application Settings</h2>
              <p className="text-xs text-[#667085]">Personalize your learning environment and notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#E6E9EF] bg-white px-4 sm:px-6 pt-1 gap-2 sm:gap-4 text-xs font-medium overflow-x-auto no-scrollbar touch-pan-x shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'preferences'
                ? 'border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Learning Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2.5 sm:pb-2.5 border-b-2 min-h-[44px] transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
              <Loader2 className="w-6 h-6 animate-spin text-[#5B5CE2]" />
              <p className="text-xs">Loading persisted settings...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMessage}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Settings successfully saved and persisted!</span>
                </div>
              )}

              {/* TAB 1: GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  {/* Theme Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
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
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                              isSel
                                ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#5B5CE2] shadow-xs'
                                : 'bg-white border-[#E6E9EF] text-slate-600 hover:bg-slate-50'
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
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5B5CE2]" />
                      Daily Learning Goal (Minutes)
                    </label>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDailyGoal(mins)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                            dailyGoal === mins
                              ? 'bg-[#5B5CE2] border-[#5B5CE2] text-white shadow-xs'
                              : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {mins} mins
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#5B5CE2]" />
                      Timezone (For Spaced Revision Scheduling)
                    </label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E6E9EF] text-xs font-mono text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PREFERENCES */}
              {activeTab === 'preferences' && (
                <div className="space-y-4">
                  <p className="text-xs text-[#667085]">
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
                              ? 'bg-[#EEF0FD] border-[#C7D2FE] text-[#172033]'
                              : 'bg-white border-[#E6E9EF] text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded text-[#5B5CE2] focus:ring-[#5B5CE2]"
                          />
                          <div>
                            <div className="text-xs font-semibold">{item.label}</div>
                            <div className="text-[11px] text-[#667085] leading-tight mt-0.5">{item.desc}</div>
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
                  <p className="text-xs text-[#667085]">
                    Manage in-app notifications and study alerts for spaced repetition:
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] bg-slate-50/50 cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">In-App Notifications</div>
                        <div className="text-[11px] text-[#667085]">Receive alerts when spaced revision tasks become due</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={inAppNotifications}
                        onChange={(e) => setInAppNotifications(e.target.checked)}
                        className="rounded text-[#5B5CE2] focus:ring-[#5B5CE2] w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] bg-slate-50/50 cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Streak & Achievement Celebrations</div>
                        <div className="text-[11px] text-[#667085]">Sound effects and visual toasts upon unlocking badges</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEffects}
                        onChange={(e) => setSoundEffects(e.target.checked)}
                        className="rounded text-[#5B5CE2] focus:ring-[#5B5CE2] w-4 h-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E6E9EF] bg-slate-50/50 cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Email Digest Reminders</div>
                        <div className="text-[11px] text-[#667085]">Weekly concept retention summaries</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="rounded text-[#5B5CE2] focus:ring-[#5B5CE2] w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Security & Identity Telemetry</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-700">
                      <div><strong className="text-slate-900">Email:</strong> {user?.email || 'unauthenticated'}</div>
                      <div><strong className="text-slate-900">Account Role:</strong> {user?.role || 'student'}</div>
                      <div><strong className="text-slate-900">Auth Method:</strong> {user?.auth_provider || 'local (Argon2id)'}</div>
                      <div><strong className="text-slate-900">Password Hashing:</strong> OWASP-compliant Argon2id (zero plaintext)</div>
                      <div><strong className="text-slate-900">Session Tokens:</strong> HttpOnly SameSite=Lax Secure Cookies</div>
                      <div><strong className="text-slate-900">Privacy Guarantee:</strong> Strict Multi-Tenant Isolation & FERPA Compliant</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Account passwords cannot be retrieved because LearnLoop AI never stores plaintext passwords. If you need to reset your password or delete your account data, contact your course administrator.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E6E9EF] bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E6E9EF] bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
