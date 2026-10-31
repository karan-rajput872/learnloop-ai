import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Network,
  HelpCircle,
  MessageSquare,
  Calendar,
  Users,
  Cpu,
  RotateCcw,
  RefreshCw,
  Menu,
  X,
  User as UserIcon,
  LogIn,
  Award
} from 'lucide-react';
import { HealthInfo, LearnerProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthInfo: HealthInfo | null;
  profile: LearnerProfile | null;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenMyProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  healthInfo,
  profile,
  onReset,
  onRefresh,
  isRefreshing = false,
  onOpenMyProfile
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const isAi = healthInfo?.engine?.is_ai_configured;
  const engineModel = healthInfo?.engine?.model || (isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback');

  // Working tabs
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnostic', label: 'Diagnostic Test', icon: HelpCircle },
    { id: 'graph', label: 'Concept Graph', icon: Network },
    { id: 'quiz', label: 'Adaptive Quiz', icon: GraduationCap },
    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
    { id: 'revision', label: 'Spaced Revision', icon: Calendar },
    { id: 'teacher', label: 'Teacher Dashboard', icon: Users },
  ];

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E6E9EF] shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      {/* ========================================================= */}
      {/* TIER 1 (UPWARD): Brand, Information & System Telemetry    */}
      {/* ========================================================= */}
      <div className="border-b border-[#E6E9EF]/80 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: Brand Identity & Syllabus Scope */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0"
            onClick={() => handleNavClick('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavClick('dashboard')}
            aria-label="LearnLoop AI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#5B5CE2] flex items-center justify-center text-white shadow-sm shadow-[#5B5CE2]/25 group-hover:bg-[#494AC8] transition-colors shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#172033] font-sans">
                  LearnLoop<span className="text-[#5B5CE2]">.AI</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono whitespace-nowrap">
                  Adaptive DSA
                </span>
              </div>
              <p className="text-[11px] text-[#667085] font-sans truncate hidden sm:block leading-tight">
                Don&apos;t just learn the answers. Master the concepts.
              </p>
            </div>
          </div>

          {/* Right: Information Related Metadata & System Telemetry */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

            {/* 1. Overall Learner Mastery Pill */}
            {profile && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs"
                title={`Overall DSA Syllabus Mastery: ${profile.overall_mastery}% across 12 concepts`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${profile.overall_mastery >= 75 ? 'bg-teal-500' :
                      profile.overall_mastery >= 45 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                    }`}
                />
                <span className="text-[#667085] hidden md:inline">Mastery:</span>
                <span
                  className={`font-bold ${profile.overall_mastery >= 75 ? 'text-teal-700' :
                      profile.overall_mastery >= 45 ? 'text-amber-700' : 'text-[#5B5CE2]'
                    }`}
                >
                  {profile.overall_mastery}%
                </span>
              </div>
            )}

            {/* 2. AI Model Status Pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs cursor-default"
              title={`Active Pedagogical Engine: ${isAi ? 'Gemini 2.5 Flash API (Cloud Active)' : 'Deterministic Local Fallback'}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isAi ? 'bg-teal-500 ring-2 ring-teal-200 animate-pulse' : 'bg-[#5B5CE2]'
                  }`}
              />
              <Cpu className="w-3.5 h-3.5 text-[#667085]" />
              <span className={`font-medium ${isAi ? 'text-teal-800' : 'text-slate-700'} hidden sm:inline`}>
                {isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}
              </span>
              <span className={`font-medium ${isAi ? 'text-teal-800' : 'text-slate-700'} sm:hidden`}>
                {isAi ? 'Gemini' : 'Fallback'}
              </span>
            </div>

            {/* 3. Account / User Profile Controls */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5">
                {onOpenMyProfile && (
                  <button
                    onClick={onOpenMyProfile}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF0FD] hover:bg-indigo-100 border border-[#C7D2FE] text-xs font-semibold text-[#5B5CE2] transition-colors shadow-xs"
                    title="View Personalized Learning Profile"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Learning Profile</span>
                  </button>
                )}
                <button
                  onClick={() => openAuthModal('profile')}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs text-indigo-900 transition-colors shadow-xs"
                  title={`Signed in as ${user.full_name} (${user.email})`}
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="font-semibold hidden md:inline truncate max-w-[120px]">
                    {user.full_name}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-[#E6E9EF] hover:border-indigo-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="hidden md:inline-flex items-center px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* 4. Refresh Sync Action */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#667085] hover:text-[#5B5CE2] transition-colors shadow-xs disabled:opacity-50"
                title="Refresh Learner Telemetry & Server Sync"
                aria-label="Refresh learner telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-[#5B5CE2]' : ''}`} />
              </button>
            )}

            {/* 5. Reset Learner Profile Action */}
            <button
              onClick={onReset}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-[#E6E9EF] hover:border-rose-200 text-[#667085] hover:text-rose-600 transition-colors shadow-xs"
              title="Reset Learner Profile to Baseline"
              aria-label="Reset learner profile"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* 5. Mobile Drawer Toggle (< 640px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#172033] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-[#172033]" /> : <Menu className="w-4 h-4 text-[#172033]" />}
            </button>

          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* TIER 2 (DOWNWARD): Dedicated Working Navigation Bar       */}
      {/* ========================================================= */}
      <div className="px-4 sm:px-6 lg:px-8 py-1.5 bg-[#FAFBFD]">
        <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar gap-1 sm:gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition-all shrink-0 ${isActive
                    ? 'bg-[#5B5CE2] text-white font-semibold shadow-xs'
                    : 'text-[#667085] hover:text-[#172033] hover:bg-white border border-transparent font-medium'
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#667085]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE EXPANDED MENU DRAWER                               */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#E6E9EF] bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-sans transition-colors ${isActive
                      ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold border border-[#C7D2FE]'
                      : 'text-[#172033] hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#5B5CE2]' : 'text-[#667085]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#5B5CE2]" />}
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-[#E6E9EF] space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-[#667085]">
              <span>Overall Mastery:</span>
              <strong className="text-[#172033] font-bold">
                {profile ? `${profile.overall_mastery}%` : '0%'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[#667085]">
              <span>Engine:</span>
              <span className={`font-semibold ${isAi ? 'text-teal-700' : 'text-[#5B5CE2]'}`}>
                {engineModel}
              </span>
            </div>
          </div>

          {/* Mobile Auth Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('profile');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>Account ({user.full_name})</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
