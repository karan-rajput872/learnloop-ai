import React from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, Calendar, User, Network, GraduationCap } from 'lucide-react';

interface FloatingMobileDockProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenTutor?: () => void;
  onOpenProfile?: () => void;
  unreadNotifications?: number;
}

export const FloatingMobileDock: React.FC<FloatingMobileDockProps> = ({
  activeTab,
  onSelectTab,
  onOpenTutor,
  onOpenProfile,
  unreadNotifications = 0
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnostic', label: 'Diagnostic', icon: GraduationCap },
    { id: 'center_action', label: 'AI Tutor', icon: Sparkles, isCenter: true },
    { id: 'revision', label: 'Revision', icon: Calendar },
    { id: 'profile_action', label: 'Profile', icon: User, isAction: true },
  ];

  return (
    <nav
      aria-label="Mobile Dock Navigation"
      className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md mx-auto px-2 py-1.5 rounded-full bento-pill-nav flex items-center justify-between shadow-2xl transition-all duration-300"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.isCenter) {
          return (
            <button
              key={item.id}
              onClick={() => {
                if (onOpenTutor) onOpenTutor();
                else onSelectTab('tutor');
              }}
              aria-label="Launch AI Tutor"
              className="relative -mt-5 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-[#243B63] to-[#38B7A5] text-white shadow-md border-2 border-white dark:border-[#101B2D] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </button>
          );
        }

        if (item.isAction) {
          return (
            <button
              key={item.id}
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
              }}
              aria-label="Open Learner Profile"
              className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </div>
              <span className="mt-0.5 text-[9px]">{item.label}</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-[#EEF0FD] dark:bg-white/10 text-[#5B5CE2] dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="mt-0.5 text-[9px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

