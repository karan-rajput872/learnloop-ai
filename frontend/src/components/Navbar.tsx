import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Network,
  HelpCircle,
  MessageSquare,
  Calendar,
  Users,
  Cpu,
  RotateCcw
} from 'lucide-react';
import { HealthInfo, LearnerProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthInfo: HealthInfo | null;
  profile: LearnerProfile | null;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  healthInfo,
  profile,
  onReset
}) => {
  const isAi = healthInfo?.engine?.is_ai_configured;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnostic', label: 'Diagnostic Test', icon: HelpCircle, badge: !profile?.diagnostic_completed ? 'Required' : undefined },
    { id: 'graph', label: 'Concept Graph', icon: Network },
    { id: 'quiz', label: 'Adaptive Quiz', icon: GraduationCap },
    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
    { id: 'revision', label: 'Spaced Revision', icon: Calendar },
    { id: 'teacher', label: 'Teacher Portal', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E6E9EF] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo & Tagline */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-[#5B5CE2] flex items-center justify-center text-white shadow-sm shadow-[#5B5CE2]/30 group-hover:bg-[#494AC8] transition-colors">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#172033] font-sans">
                  LearnLoop<span className="text-[#5B5CE2]">.AI</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono">
                  Adaptive DSA
                </span>
              </div>
              <p className="text-[11px] text-[#667085] hidden sm:block font-sans">
                Don&apos;t just learn the answers. Master the concepts.
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                      ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold border border-[#C7D2FE]'
                      : 'text-[#667085] hover:text-[#172033] hover:bg-slate-100/70 border border-transparent'
                    }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5B5CE2]' : 'text-[#667085]'}`} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Badges & Reset Button */}
          <div className="flex items-center gap-2.5">
            {/* Student Mastery Pill */}
            {profile && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono">
                <span className="text-[#667085]">Mastery:</span>
                <span className={`font-bold ${profile.overall_mastery >= 75 ? 'text-teal-700' :
                    profile.overall_mastery >= 45 ? 'text-amber-700' : 'text-[#5B5CE2]'
                  }`}>
                  {profile.overall_mastery}%
                </span>
              </div>
            )}

            {/* Engine Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isAi ? 'bg-teal-500 ring-2 ring-teal-200' : 'bg-indigo-500'}`} />
              <Cpu className="w-3.5 h-3.5 text-[#667085]" />
              <span className={isAi ? 'text-teal-800 font-medium' : 'text-slate-700 font-medium'}>
                {isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}
              </span>
            </div>

            {/* Reset Button for demonstration */}
            <button
              onClick={onReset}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-[#E6E9EF] hover:border-rose-200 text-[#667085] hover:text-rose-600 transition-colors"
              title="Reset Learner Profile"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-[#E6E9EF] gap-1 text-xs no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium text-[11px] transition-colors ${isActive
                    ? 'bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-semibold'
                    : 'text-[#667085] hover:text-[#172033]'
                  }`}
              >
                <Icon className="w-3 h-3" />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
