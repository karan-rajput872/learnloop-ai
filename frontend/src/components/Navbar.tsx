import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { HealthInfo, LearnerProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  healthInfo: HealthInfo | null;
  profile: LearnerProfile | null;
  onReset: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  healthInfo,
  profile,
  onReset,
  onRefresh,
  isRefreshing = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const isAi = healthInfo?.engine?.is_ai_configured;
  const engineModel = healthInfo?.engine?.model || (isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback');

  // Primary 5 navigation items shown on medium desktop
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'diagnostic', label: 'Diagnostic Test', icon: HelpCircle },
    { id: 'graph', label: 'Concept Graph', icon: Network },
    { id: 'quiz', label: 'Adaptive Quiz', icon: GraduationCap },
    { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
  ];

  // Secondary items accessible inline on large screens or via "More" dropdown on medium screens
  const secondaryNavItems = [
    { id: 'revision', label: 'Spaced Revision', icon: Calendar },
    { id: 'teacher', label: 'Teacher Portal', icon: Users },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  };

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E6E9EF] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[76px] gap-4">

          {/* ========================================================= */}
          {/* LEFT SECTION — Brand & Identity                           */}
          {/* ========================================================= */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0 max-w-[280px]"
            onClick={() => handleNavClick('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleNavClick('dashboard')}
            aria-label="LearnLoop AI Home"
          >
            <div className="w-10 h-10 rounded-xl bg-[#5B5CE2] flex items-center justify-center text-white shadow-sm shadow-[#5B5CE2]/25 group-hover:bg-[#494AC8] transition-colors shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-[#172033] font-sans">
                  LearnLoop<span className="text-[#5B5CE2]">.AI</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono whitespace-nowrap">
                  Adaptive DSA
                </span>
              </div>
              <p className="text-[11px] text-[#667085] font-sans truncate hidden xl:block leading-tight mt-0.5">
                Don&apos;t just learn the answers. Master the concepts.
              </p>
            </div>
          </div>

          {/* ========================================================= */}
          {/* CENTER SECTION — Main Navigation                          */}
          {/* ========================================================= */}

          {/* A. Large Desktop (>= 1280px): All 7 items in single row */}
          <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center min-w-0" aria-label="Main Navigation">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-sans whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold border border-[#C7D2FE] shadow-xs'
                      : 'text-[#667085] hover:text-[#172033] hover:bg-slate-50 border border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5B5CE2]' : 'text-[#667085]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* B. Medium Desktop (1024px – 1279px): Primary 5 + "More" Menu */}
          <nav className="hidden lg:flex xl:hidden items-center gap-1 flex-1 justify-center min-w-0" aria-label="Main Navigation">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold border border-[#C7D2FE] shadow-xs'
                      : 'text-[#667085] hover:text-[#172033] hover:bg-slate-50 border border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#5B5CE2]' : 'text-[#667085]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* "More" Dropdown Menu for secondary items */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap transition-colors ${
                  isSecondaryActive
                    ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold border border-[#C7D2FE]'
                    : 'text-[#667085] hover:text-[#172033] hover:bg-slate-50 border border-transparent font-medium'
                }`}
                aria-haspopup="true"
                aria-expanded={moreMenuOpen}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#E6E9EF] shadow-lg py-1.5 z-50 animate-fade-in">
                  {secondaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-sans text-left transition-colors ${
                          isActive
                            ? 'bg-[#EEF0FD] text-[#5B5CE2] font-semibold'
                            : 'text-[#172033] hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#5B5CE2]' : 'text-[#667085]'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* ========================================================= */}
          {/* RIGHT SECTION — System Status & Actions                   */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

            {/* 1. Learner Mastery Pill */}
            {profile && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs"
                title={`Overall DSA Mastery: ${profile.overall_mastery}% across 12 syllabus concepts`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    profile.overall_mastery >= 75 ? 'bg-teal-500' :
                    profile.overall_mastery >= 45 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                  }`}
                />
                <span className="text-[#667085] hidden 2xl:inline">Mastery:</span>
                <span
                  className={`font-bold ${
                    profile.overall_mastery >= 75 ? 'text-teal-700' :
                    profile.overall_mastery >= 45 ? 'text-amber-700' : 'text-[#5B5CE2]'
                  }`}
                >
                  {profile.overall_mastery}%
                </span>
              </div>
            )}

            {/* 2. AI Model & Engine Status Pill */}
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-[#E6E9EF] text-xs font-mono shadow-xs cursor-default group relative"
              title={`Active Pedagogical Engine: ${isAi ? 'Gemini 2.5 Flash API (Cloud Active)' : 'Deterministic Local Fallback Orchestrator'}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isAi ? 'bg-teal-500 ring-2 ring-teal-200 animate-pulse' : 'bg-[#5B5CE2]'
                }`}
              />
              <Cpu className="w-3.5 h-3.5 text-[#667085]" />
              <span className={`font-medium ${isAi ? 'text-teal-800' : 'text-slate-700'}`}>
                {isAi ? 'Gemini 2.5 Flash' : 'Deterministic Fallback'}
              </span>
            </div>

            {/* 3. Refresh / Sync Action */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#667085] hover:text-[#5B5CE2] transition-colors shadow-xs disabled:opacity-50"
                title="Refresh Learner Telemetry & Server Sync"
                aria-label="Refresh learner telemetry and server status"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#5B5CE2]' : ''}`} />
              </button>
            )}

            {/* 4. Reset Learner Profile Action (Demo utility) */}
            <button
              onClick={onReset}
              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-[#E6E9EF] hover:border-rose-200 text-[#667085] hover:text-rose-600 transition-colors shadow-xs"
              title="Reset Learner Profile to Baseline"
              aria-label="Reset learner profile"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 5. Mobile Hamburger Menu Toggle Button (< 1024px) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E6E9EF] text-[#172033] transition-colors"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#172033]" /> : <Menu className="w-5 h-5 text-[#172033]" />}
            </button>

          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE NAVIGATION DRAWER (< 1024px)                       */}
      {/* ========================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E6E9EF] bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl animate-fade-in">
          {/* Navigation Items List */}
          <div className="space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-sans transition-colors ${
                    isActive
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

          {/* Mobile System Status Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E6E9EF] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#667085]">
              <span>Learner Mastery:</span>
              <strong className="text-[#172033] font-bold">
                {profile ? `${profile.overall_mastery}%` : 'N/A'}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[#667085]">
              <span>AI Engine:</span>
              <span className={`font-semibold ${isAi ? 'text-teal-700' : 'text-[#5B5CE2]'}`}>
                {engineModel}
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
