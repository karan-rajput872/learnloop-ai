import React from 'react';
import {
  LayoutDashboard,
  Network,
  Route,
  MessageSquare,
  GraduationCap,
  Calendar,
  Briefcase,
  FolderGit2,
  TrendingUp,
  Award,
  Users,
  School,
  ClipboardCheck,
  BarChart3,
  User as UserIcon,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LearnerProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  profile: LearnerProfile | null;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenHelpSupport: () => void;
  onOpenRoadmap?: () => void;
  onOpenSkills?: () => void;
  onOpenProjects?: () => void;
  onOpenAchievements?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  profile,
  onOpenProfile,
  onOpenSettings,
  onOpenHelpSupport,
  onOpenRoadmap,
  onOpenSkills,
  onOpenProjects,
  onOpenAchievements
}) => {
  const { user, logout } = useAuth();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'owner' || user?.is_demo;

  const handleNavClick = (tabId: string) => {
    if (tabId === 'profile') {
      onOpenProfile();
      return;
    }
    if (tabId === 'settings') {
      onOpenSettings();
      return;
    }
    if (tabId === 'help') {
      onOpenHelpSupport();
      return;
    }
    if (tabId === 'roadmap') {
      if (onOpenRoadmap) onOpenRoadmap();
      else setActiveTab('dashboard');
      return;
    }
    if (tabId === 'skills') {
      if (onOpenSkills) onOpenSkills();
      else setActiveTab('dashboard');
      return;
    }
    if (tabId === 'projects') {
      if (onOpenProjects) onOpenProjects();
      else setActiveTab('dashboard');
      return;
    }
    if (tabId === 'achievements') {
      if (onOpenAchievements) onOpenAchievements();
      else setActiveTab('dashboard');
      return;
    }
    setActiveTab(tabId);
  };

  const navGroups = [
    {
      group: 'LEARN',
      items: [
        { id: 'dashboard', label: 'Overview / Dashboard', icon: LayoutDashboard },
        { id: 'graph', label: 'My Learning & Syllabus', icon: Network },
        { id: 'roadmap', label: 'Learning Roadmap', icon: Route },
        { id: 'tutor', label: 'AI Tutor', icon: MessageSquare },
        { id: 'quiz', label: 'Assessments & Practice', icon: GraduationCap },
        { id: 'revision', label: 'Revision & Practice', icon: Calendar }
      ]
    },
    {
      group: 'GROW',
      items: [
        { id: 'skills', label: 'Skills & Career', icon: Briefcase },
        { id: 'projects', label: 'Projects & Code', icon: FolderGit2 },
        { id: 'progress', label: 'My Progress', icon: TrendingUp },
        { id: 'achievements', label: 'Achievements', icon: Award }
      ]
    },
    ...(isTeacherOrAdmin
      ? [
        {
          group: 'TEACH',
          items: [
            { id: 'teacher', label: 'Teacher Studio', icon: Users },
            { id: 'classrooms', label: 'Classrooms', icon: School },
            { id: 'assignments', label: 'Assignments', icon: ClipboardCheck },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ]
        }
      ]
      : []),
    {
      group: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'help', label: 'Help & Support', icon: HelpCircle }
      ]
    }
  ];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-white dark:bg-[#14233A] border-r border-[#E2E8F0] dark:border-[#243B5B] transition-all duration-300 z-30 sticky top-[112px] h-[calc(100dvh-112px)] overflow-hidden self-start ${isCollapsed ? 'w-16' : 'w-64'
        }`}
      aria-label="Main Navigation Sidebar"
    >
      {/* 1. Header with Section Title & Collapse Trigger */}
      <div className="h-12 flex items-center justify-between px-3.5 border-b border-[#E2E8F0] dark:border-[#243B5B] shrink-0 bg-slate-50/60 dark:bg-[#101B2D]/60">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#64748B] dark:text-[#A8B7CC]">
              {user?.role === 'owner' ? 'Owner Portal' : user?.role === 'teacher' ? 'Faculty Studio' : 'Workspace'}
            </span>
          </div>
        )}

        {isCollapsed && (
          <div
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 rounded-lg bg-[#EEF0FD] dark:bg-[#20344E] text-[#5B5CE2] dark:text-[#38B7A5] flex items-center justify-center cursor-pointer mx-auto transition-transform hover:scale-105"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </div>
        )}

        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#A8B7CC] hover:text-[#17243A] dark:hover:text-[#F1F5FB] hover:bg-slate-200/60 dark:hover:bg-[#20344E] transition-colors cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 no-scrollbar" data-lenis-prevent>
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#A8B7CC]/70 font-mono">
                {group.group}
              </div>
            )}
            {isCollapsed && (
              <div className="w-6 h-px bg-[#E2E8F0] dark:bg-[#243B5B] mx-auto my-2" />
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${isActive
                      ? 'bg-[#243B63] dark:bg-[#38B7A5] text-white dark:text-[#101B2D] font-semibold shadow-xs'
                      : 'text-[#64748B] dark:text-[#A8B7CC] hover:text-[#17243A] dark:hover:text-[#F1F5FB] hover:bg-[#EDF2F8] dark:hover:bg-[#20344E]'
                    } ${isCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive
                        ? 'text-white dark:text-[#101B2D]'
                        : 'text-[#64748B] dark:text-[#A8B7CC]'
                      }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Bottom User Profile & Logout Cluster */}
      <div className="p-3 border-t border-[#E2E8F0] dark:border-[#243B5B] bg-[#F5F7FB] dark:bg-[#101B2D] shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#243B63] to-[#38B7A5] text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#17243A] dark:text-[#F1F5FB] truncate block leading-tight group-hover:text-[#38B7A5] transition-colors">
                  {user?.full_name || 'Learner'}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] truncate block">
                  {user?.email || 'student@learnloop.edu'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[#64748B] dark:text-[#A8B7CC] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={onOpenProfile}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#243B63] to-[#38B7A5] text-white flex items-center justify-center font-bold text-xs cursor-pointer"
              title={`Signed in as ${user?.full_name || 'Learner'}`}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[#64748B] dark:text-[#A8B7CC] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

