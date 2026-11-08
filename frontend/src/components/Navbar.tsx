import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Network,
  HelpCircle,
  MessageSquare,
  Calendar,
  Users,
  RotateCcw,
  RefreshCw,
  Menu,
  X,
  LogIn,
  Award,
  Sparkles,
  Camera,
  Share2,
  Check
} from 'lucide-react';
import { HealthInfo, LearnerProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { AccountMenu } from './AccountMenu';
import { ThemeToggle } from './ThemeToggle';

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
  onOpenRoadmap?: () => void;
  onOpenSkills?: () => void;
  onOpenProjects?: () => void;
  onOpenAchievements?: () => void;
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
  onOpenRoadmap,
  onOpenSkills,
  onOpenProjects,
  onOpenAchievements,
  unreadNotificationsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const isAi = healthInfo?.engine?.is_ai_configured;
  const engineModel = healthInfo?.engine?.model || (isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback');

  // Working application modules (Preserved exactly)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnostic', label: 'Diagnostic', icon: HelpCircle },
    { id: 'graph', label: 'Concept Graph', icon: Network },
    { id: 'quiz', label: 'Adaptive Quiz', icon: GraduationCap },
    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
    { id: 'revision', label: 'Spaced Revision', icon: Calendar },
    { id: 'teacher', label: 'Teacher Studio', icon: Users },
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

  const handleShare = async () => {
    const shareData = {
      title: 'LearnLoop AI — The Intelligent Learning & Growth Platform',
      text: 'Adaptive Data Structures & Algorithms learning with real-time AI mentoring and concept mastery.',
      url: window.location.href,
    };
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const getWorkspaceTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Personalized Dashboard';
      case 'diagnostic': return 'Adaptive Diagnostic';
      case 'graph': return 'Concept Knowledge Graph';
      case 'quiz': return 'Adaptive Socratic Assessment';
      case 'tutor': return 'AI Socratic Dialogue';
      case 'revision': return 'Spaced Repetition Engine';
      case 'teacher': return 'Teacher Studio Cohort';
      default: return 'Workspace';
    }
  };

  return (
    <header className="sticky top-0 z-50 transition-colors duration-200 w-full max-w-[100vw] shadow-xs">
      
      {/* ─────────────────────────────────────────────────────────────
          UPPER BAR — Brand Identity & All Utility Controls (Tier 1)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-white/95 dark:bg-[#101B2D]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#243B5B] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3 sm:gap-4">

          {/* Left: Brand Identity, Logo, Tagline & Category Badge */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => handleNavClick('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavClick('dashboard')}
            aria-label="LearnLoop AI Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#243B63] to-[#38B7A5] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold font-heading tracking-tight text-[#17243A] dark:text-[#F1F5FB]">
                  LearnLoop<span className="text-[#38B7A5]">.AI</span>
                </span>
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] border border-[#E2E8F0] dark:border-[#243B5B] font-mono whitespace-nowrap">
                  Adaptive DSA
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] font-sans truncate hidden md:block leading-tight">
                The Intelligent Learning & Growth Platform
              </p>
            </div>
          </div>

          {/* Right: All Utility Controls Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Light / Dark Theme Toggle */}
            <ThemeToggle />

            {/* Share Platform Action */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-[#E6E9EF] dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
              title="Share LearnLoop AI"
              aria-label="Share platform link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {/* Live Video Socratic Action */}
            {onOpenLiveVideo && (
              <button
                type="button"
                onClick={onOpenLiveVideo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-full bg-gradient-to-r from-[#5B5CE2] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all transform hover:scale-105 cursor-pointer"
                title="Launch Live Video Socratic Solver (Gemini 2.5 Flash Vision)"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-200" />
                <span className="hidden sm:inline">Live Video</span>
              </button>
            )}

            {/* User Account / Sign In / Get Started */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {user.is_demo && (
                  <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    DEMO MODE
                  </span>
                )}
                {onOpenMyProfile && (
                  <button
                    onClick={onOpenMyProfile}
                    className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[34px] sm:min-h-[36px] rounded-full bg-[#EEF0FD] dark:bg-white/10 hover:bg-indigo-100 dark:hover:bg-white/20 border border-[#C7D2FE] dark:border-white/15 text-xs font-semibold text-[#5B5CE2] dark:text-[#38B7A5] transition-colors shadow-xs cursor-pointer"
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
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1 px-3 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-[#E6E9EF] dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 min-h-[34px] sm:min-h-[36px] rounded-full bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
              </div>
            )}

            {/* Refresh Telemetry Button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-[#E6E9EF] dark:border-slate-700 text-[#667085] dark:text-slate-300 hover:text-[#5B5CE2] dark:hover:text-[#38B7A5] transition-colors shadow-xs disabled:opacity-50 cursor-pointer min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:min-w-[36px] items-center justify-center"
                title="Refresh Telemetry"
                aria-label="Refresh learner telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin text-[#5B5CE2]' : ''}`} />
              </button>
            )}

            {/* Mobile Drawer Menu Toggle (< 1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-w-[36px] min-h-[36px] p-2 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-[#E6E9EF] dark:border-slate-700 text-[#172033] dark:text-slate-200 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LOWER BAR — Application Workspace Navigation (Tier 2)
          ───────────────────────────────────────────────────────────── */}
      <div className="w-full bg-[#F8FAFC]/90 dark:bg-[#0D1524]/90 backdrop-blur-md border-b border-[#E2E8F0]/80 dark:border-[#243B5B]/80 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex items-center justify-center">

          {/* Exact Existing 7 Working Workspace Items (Centered in the Lower Tier) */}
          <nav
            aria-label="Application Workspaces"
            className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1.5 sm:px-2 rounded-full bento-pill-nav max-w-full mx-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#5B5CE2] text-white font-semibold shadow-xs'
                      : 'text-[#667085] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/10 font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#667085] dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE EXPANDED DRAWER MENU (< 1024px)
          ───────────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E2E8F0] dark:border-[#243B5B] bg-white dark:bg-[#182A42] px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in max-h-[calc(100dvh-5.5rem)] overflow-y-auto" data-lenis-prevent>
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
                  className={`w-full flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-sans transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] font-semibold border border-[#E2E8F0] dark:border-[#243B5B]'
                      : 'text-[#17243A] dark:text-[#F1F5FB] hover:bg-slate-50 dark:hover:bg-[#20344E]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#243B63] dark:text-[#38B7A5]' : 'text-[#64748B] dark:text-[#A8B7CC]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#38B7A5]" />}
                </button>
              );
            })}
          </div>

          {/* Quick Hub Navigation for Growth & Career */}
          <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#243B5B] grid grid-cols-2 gap-2">
            {onOpenRoadmap && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRoadmap();
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] text-center"
              >
                Learning Roadmap
              </button>
            )}
            {onOpenSkills && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSkills();
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] text-center"
              >
                Skills & Career
              </button>
            )}
            {onOpenProjects && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProjects();
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] text-center"
              >
                Projects & Code
              </button>
            )}
            {onOpenAchievements && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAchievements();
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] text-center"
              >
                Achievements
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E6E9EF] dark:border-slate-700/60 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-[#667085] dark:text-slate-400">
              <span>Overall Mastery:</span>
              <strong className="text-[#172033] dark:text-white font-bold">
                {profile ? `${profile.overall_mastery}%` : '0%'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[#667085] dark:text-slate-400">
              <span>Engine:</span>
              <span className={`font-semibold ${isAi ? 'text-teal-700 dark:text-teal-400' : 'text-[#5B5CE2] dark:text-indigo-400'}`}>
                {engineModel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {onRefresh && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onRefresh();
                }}
                disabled={isRefreshing}
                className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-800 border border-[#E6E9EF] dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
              className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#E6E9EF] dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Profile</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
