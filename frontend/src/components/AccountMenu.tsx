import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Sliders,
  Bell,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
  FileText,
  LogOut,
  MoreVertical,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface AccountMenuProps {
  user: User;
  unreadNotificationsCount?: number;
  isRefreshing?: boolean;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenPreferences: () => void;
  onOpenNotifications: () => void;
  onRefreshDashboard: () => void;
  onOpenPrivacySecurity: () => void;
  onOpenHelpSupport: () => void;
  onOpenTermsPrivacy: () => void;
  onLogout: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  user,
  unreadNotificationsCount = 0,
  isRefreshing = false,
  onOpenProfile,
  onOpenSettings,
  onOpenPreferences,
  onOpenNotifications,
  onRefreshDashboard,
  onOpenPrivacySecurity,
  onOpenHelpSupport,
  onOpenTermsPrivacy,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger: User avatar pill with 3-dot trigger */}
      <div className="flex items-center gap-1.5 p-0.5 rounded-full bg-slate-50 border border-[#E6E9EF] hover:border-indigo-300 transition-all shadow-xs">
        <button
          onClick={() => handleAction(onOpenProfile)}
          className="flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
          title={`Signed in as ${user.full_name} (${user.email})`}
          aria-label="View learner profile"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#5B5CE2] to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shadow-xs shrink-0">
            {initials}
          </div>
          <div className="text-left hidden md:block max-w-[110px]">
            <span className="block text-xs font-semibold text-[#172033] truncate leading-tight">
              {user.full_name}
            </span>
            <span className="block text-[10px] text-[#667085] font-mono leading-none">
              {user.is_demo ? 'Demo Mode' : user.role === 'teacher' ? 'Educator' : 'Learner'}
            </span>
          </div>
        </button>

        {/* 3-dot trigger button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="Account and application options"
          className={`p-1.5 rounded-full transition-colors ${
            isOpen ? 'bg-[#EEF0FD] text-[#5B5CE2]' : 'text-[#667085] hover:text-[#172033] hover:bg-slate-100'
          }`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#E6E9EF] shadow-2xl py-2 z-50 animate-fade-in text-xs font-sans divide-y divide-slate-100 focus:outline-none"
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          {/* Header Section */}
          <div className="px-4 py-2.5 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B5CE2] to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate text-xs">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
              </div>
            </div>
            {user.is_demo && (
              <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Isolated Synthetic Demo Session</span>
              </div>
            )}
          </div>

          {/* Group 1: Core Learner Actions */}
          <div className="py-1">
            {/* 1. My Profile */}
            <button
              onClick={() => handleAction(onOpenProfile)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5B5CE2] transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-[#5B5CE2]" />
                <span className="font-medium">My Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5B5CE2]" />
            </button>

            {/* 2. Settings */}
            <button
              onClick={() => handleAction(onOpenSettings)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5B5CE2] transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-4 h-4 text-slate-400 group-hover:text-[#5B5CE2]" />
                <span className="font-medium">Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5B5CE2]" />
            </button>

            {/* 3. Learning Preferences */}
            <button
              onClick={() => handleAction(onOpenPreferences)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5B5CE2] transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-slate-400 group-hover:text-[#5B5CE2]" />
                <span className="font-medium">Learning Preferences</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#5B5CE2]" />
            </button>

            {/* 4. Notifications */}
            <button
              onClick={() => handleAction(onOpenNotifications)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-[#EEF0FD] hover:text-[#5B5CE2] transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-400 group-hover:text-[#5B5CE2]" />
                <span className="font-medium">Notifications</span>
              </div>
              {unreadNotificationsCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                  {unreadNotificationsCount}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">0 unread</span>
              )}
            </button>
          </div>

          {/* Group 2: Dashboard Refresh & Maintenance */}
          <div className="py-1">
            {/* 5. Refresh Dashboard */}
            <button
              onClick={() => handleAction(onRefreshDashboard)}
              disabled={isRefreshing}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors group disabled:opacity-50"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-indigo-600 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                <span className="font-medium">Refresh Dashboard</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Sync</span>
            </button>
          </div>

          {/* Group 3: Privacy, Help & Compliance */}
          <div className="py-1">
            {/* 6. Privacy & Security */}
            <button
              onClick={() => handleAction(onOpenPrivacySecurity)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                <span className="font-medium">Privacy & Security</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {/* 7. Help & Support */}
            <button
              onClick={() => handleAction(onOpenHelpSupport)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                <span className="font-medium">Help & Support</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {/* 8. Terms and Privacy */}
            <button
              onClick={() => handleAction(onOpenTermsPrivacy)}
              className="w-full flex items-center justify-between px-4 py-2 text-left text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                <span className="font-medium">Terms & Privacy</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* Group 4: Logout */}
          <div className="py-1">
            {/* 9. Logout */}
            <button
              onClick={() => handleAction(onLogout)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 transition-colors group"
              role="menuitem"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-rose-500 group-hover:text-rose-600" />
                <span className="font-semibold">Sign Out</span>
              </div>
              <span className="text-[10px] text-rose-400 font-mono">Exit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
