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
    { id: 'tutor', label: 'AI Tutor (Wispr Flow)', icon: MessageSquare },
    { id: 'revision', label: 'Spaced Revision', icon: Calendar },
    { id: 'teacher', label: 'Teacher Dashboard', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 bg-edu-950/85 backdrop-blur-md border-b border-edu-700/60 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-loop-purple to-loop-blue flex items-center justify-center p-0.5 shadow-md shadow-purple-500/20">
              <div className="w-full h-full bg-edu-950 rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-loop-purple" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  LearnLoop<span className="text-loop-purple">.AI</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                  Adaptive DSA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
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
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-edu-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-950 text-rose-300 border border-rose-800 font-mono animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status Badges & Quick Reset */}
          <div className="flex items-center gap-3">
            {/* Student Mastery Pill */}
            {profile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-edu-900 border border-edu-700 text-xs font-mono">
                <span className="text-slate-400">Mastery:</span>
                <span className={`font-bold ${
                  profile.overall_mastery >= 75 ? 'text-emerald-400' :
                  profile.overall_mastery >= 45 ? 'text-amber-400' : 'text-purple-400'
                }`}>
                  {profile.overall_mastery}%
                </span>
              </div>
            )}

            {/* Engine Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-edu-900 border border-edu-700 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isAi ? 'bg-purple-400 animate-ping' : 'bg-emerald-400'}`} />
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className={isAi ? 'text-purple-300' : 'text-emerald-300'}>
                {isAi ? 'Gemini AI API' : 'Local Orchestrator'}
              </span>
            </div>

            {/* Reset Button for easy demoing */}
            <button
              onClick={onReset}
              className="p-2 rounded-lg bg-edu-900 hover:bg-edu-800 border border-edu-700 text-slate-400 hover:text-rose-400 transition-colors"
              title="Reset Learner Profile"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-edu-800 gap-1 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-medium text-[11px] ${
                  isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400'
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
