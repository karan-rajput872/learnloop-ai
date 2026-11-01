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
  Award,
  Sparkles,
  Camera
} from 'lucide-react';
import { HealthInfo, LearnerProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from './AccountMenu';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthInfo: HealthInfo | null;
  profile: LearnerProfile | null;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenLiveVideo?: () => void;
  onOpenMyProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenPreferences?: () => void;
  onOpenNotifications?: () => void;
  onOpenPrivacySecurity?: () => void;
  onOpenHelpSupport?: () => void;
  onOpenTermsPrivacy?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  healthInfo,
  profile,
  onReset,
  onRefresh,
  isRefreshing = false,
  onOpenMyProfile,
  onOpenSettings,
  onOpenPreferences,
  onOpenNotifications,
  onOpenPrivacySecurity,
  onOpenHelpSupport,
  onOpenTermsPrivacy,
  onOpenLiveVideo,
  unreadNotificationsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, openAuthModal, startDemoSession, logout } = useAuth();

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
    // If visitor is unauthenticated and not in demo mode, protect student tabs
    if (!isAuthenticated && !user && tabId !== 'dashboard' && tabId !== 'teacher') {
      openAuthModal('login');
      return;
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E6E9EF] shadow-[0_1px_3px_rgba(16,24,40,0.05)] w-full max-w-[100vw] overflow-x-clip">
      {/* ========================================================= */}
      {/* TIER 1 (UPWARD): Brand, Information & System Telemetry    */}
      {/* ========================================================= */}
      <div className="border-b border-[#E6E9EF]/80 px-3 sm:px-6 lg:px-8 py-2.5 w-full max-w-[100vw]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: Brand Identity & Syllabus Scope */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#172033] font-sans">
                  LearnLoop<span className="text-[#5B5CE2]">.AI</span>
                </span>
                <span className="hidden min-[480px]:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono whitespace-nowrap">
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

            {/* 1. Overall Learner Mastery Pill (Desktop >= xl) */}
            {profile && (
              <div
                className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs"
                title={`Overall DSA Syllabus Mastery: ${profile.overall_mastery}% across 12 concepts`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${profile.overall_mastery >= 75 ? 'bg-teal-500' :
                    profile.overall_mastery >= 45 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                    }`}
                />
                <span className="text-[#667085]">Mastery:</span>
                <span
                  className={`font-bold ${profile.overall_mastery >= 75 ? 'text-teal-700' :
                    profile.overall_mastery >= 45 ? 'text-amber-700' : 'text-[#5B5CE2]'
                    }`}
                >
                  {profile.overall_mastery}%
                </span>
              </div>
            )}

            {/* 2. AI Model Status Pill (Desktop >= xl) */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs cursor-default"
              title={`Active Pedagogical Engine: ${isAi ? 'Gemini 2.5 Flash API (Cloud Active)' : 'Deterministic Local Fallback'}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isAi ? 'bg-teal-500 ring-2 ring-teal-200 animate-pulse' : 'bg-[#5B5CE2]'
                  }`}
              />
              <Cpu className="w-3.5 h-3.5 text-[#667085]" />
              <span className={`font-medium ${isAi ? 'text-teal-800' : 'text-slate-700'}`}>
                {isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}
              </span>
            </div>

            {/* 3. Explore Live Video Button (Desktop >= lg) */}
            {onOpenLiveVideo && (
              <button
                type="button"
                onClick={onOpenLiveVideo}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-xl bg-gradient-to-r from-[#5B5CE2] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all transform hover:scale-105 cursor-pointer"
                title="Launch Live Video Socratic Problem Solver (Gemini 2.5 Flash Vision)"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-200" />
                <span>Explore Live Video</span>
              </button>
            )}

            {/* 4. Account / User Profile Controls */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5">
                {user.is_demo && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-mono font-bold shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    DEMO MODE
                  </span>
                )}
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
                <AccountMenu
                  user={user}
                  unreadNotificationsCount={unreadNotificationsCount}
                  isRefreshing={isRefreshing}
                  onOpenProfile={() => onOpenMyProfile ? onOpenMyProfile() : openAuthModal('profile')}
                  onOpenSettings={() => onOpenSettings && onOpenSettings()}
                  onOpenPreferences={() => onOpenPreferences && onOpenPreferences()}
                  onOpenNotifications={() => onOpenNotifications && onOpenNotifications()}
                  onRefreshDashboard={() => onRefresh && onRefresh()}
                  onOpenPrivacySecurity={() => onOpenPrivacySecurity && onOpenPrivacySecurity()}
                  onOpenHelpSupport={() => onOpenHelpSupport && onOpenHelpSupport()}
                  onOpenTermsPrivacy={() => onOpenTermsPrivacy && onOpenTermsPrivacy()}
                  onLogout={logout}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-xl bg-slate-50 hover:bg-indigo-50 border border-[#E6E9EF] hover:border-indigo-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="hidden md:inline-flex items-center px-3.5 py-1.5 min-h-[38px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>
            )}

            {/* 4. Refresh Sync Action (Desktop >= lg) */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="hidden lg:inline-flex p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#667085] hover:text-[#5B5CE2] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                title="Refresh Learner Telemetry & Server Sync"
                aria-label="Refresh learner telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#5B5CE2]' : ''}`} />
              </button>
            )}

            {/* 5. Reset Learner Profile Action (Desktop >= lg) */}
            <button
              onClick={onReset}
              className="hidden lg:inline-flex p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-[#E6E9EF] hover:border-rose-200 text-[#667085] hover:text-rose-600 transition-colors shadow-xs cursor-pointer"
              title="Reset Learner Profile to Baseline"
              aria-label="Reset learner profile"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 6. Mobile & Tablet Drawer Toggle (< 1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#172033] transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#172033]" /> : <Menu className="w-5 h-5 text-[#172033]" />}
            </button>

          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* TIER 2 (DOWNWARD): Dedicated Working Navigation Bar       */}
      {/* ========================================================= */}
      <div className="w-full max-w-[100vw] overflow-x-auto no-scrollbar touch-pan-x px-3 sm:px-6 lg:px-8 py-1.5 bg-[#FAFBFD] border-b border-[#E6E9EF]/50">
        <div className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 py-0.5 w-max sm:w-auto min-w-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 rounded-xl text-xs font-sans whitespace-nowrap transition-all shrink-0 cursor-pointer ${isActive
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
      {/* MOBILE & TABLET EXPANDED MENU DRAWER                      */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E6E9EF] bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {onOpenLiveVideo && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLiveVideo();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-3.5 min-h-[44px] rounded-xl bg-gradient-to-r from-[#5B5CE2] to-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Camera className="w-4 h-4 text-indigo-200" />
              <span>Explore Live Video (Camera & Voice)</span>
            </button>
          )}

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-sans transition-colors cursor-pointer ${isActive
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

          {/* Quick Actions inside mobile drawer */}
          <div className="flex items-center gap-2 pt-1">
            {onRefresh && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRefresh();
                }}
                disabled={isRefreshing}
                className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-50 border border-[#E6E9EF] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#5B5CE2]' : ''}`} />
                <span>Refresh Data</span>
              </button>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onReset();
              }}
              className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-50 hover:bg-rose-50 border border-[#E6E9EF] text-slate-700 hover:text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Profile</span>
            </button>
          </div>

          {/* Mobile Auth Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('profile');
                }}
                className="w-full py-3 px-3 min-h-[44px] rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
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
                  className="flex-1 py-3 px-3 min-h-[44px] rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="flex-1 py-3 px-3 min-h-[44px] rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center cursor-pointer"
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
