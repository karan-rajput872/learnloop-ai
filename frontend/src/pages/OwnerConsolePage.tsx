import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  Users,
  Activity,
  LogIn,
  BookOpen,
  PieChart as PieIcon,
  Download,
  FileText,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Key,
  Calendar,
  LogOut,
  Eye,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api, setAuthToken, getAuthToken } from '../services/api';
import { authService } from '../services/auth';

const PIE_COLORS = ['#5B5CE2', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const OwnerConsolePage: React.FC = () => {
  // Navigation / active section
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'logins' | 'learning' | 'engagement' | 'exports' | 'audit'>('overview');

  // Auth / session states
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated' | 'forbidden'>('checking');
  const [ownerUser, setOwnerUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Login form states (for unauthenticated owner access)
  const [loginEmail, setLoginEmail] = useState('karanrajput872@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auto-refresh timer
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 30 = 30s, 60 = 60s
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTimeUTC, setCurrentTimeUTC] = useState<string>('');

  // Range filters
  const [rangeDays, setRangeDays] = useState<number>(30);

  // Data states
  const [overviewData, setOverviewData] = useState<any>(null);
  const [userDirectoryData, setUserDirectoryData] = useState<any>(null);
  const [loginActivityData, setLoginActivityData] = useState<any>(null);
  const [learningData, setLearningData] = useState<any>(null);
  const [engagementData, setEngagementData] = useState<any>(null);
  const [auditLogsData, setAuditLogsData] = useState<any>(null);

  // User directory filters & pagination
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userOffset, setUserOffset] = useState(0);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);

  // Login activity filters & pagination
  const [loginSearch, setLoginSearch] = useState('');
  const [loginStatusFilter, setLoginStatusFilter] = useState('all');
  const [loginProviderFilter, setLoginProviderFilter] = useState('all');
  const [loginOffset, setLoginOffset] = useState(0);

  // Audit log filter
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Exporting state
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUTC(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Check current session for owner authorization
  const verifySession = useCallback(async () => {
    setAuthStatus('checking');
    try {
      const res = await api.ownerVerifySession();
      if (res && res.is_owner) {
        setOwnerUser(res);
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('forbidden');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('403')) {
        setAuthStatus('forbidden');
      } else {
        setAuthStatus('unauthenticated');
      }
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Fetch Section Data
  const loadSectionData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      if (activeSection === 'overview') {
        const ov = await api.getOwnerOverview(rangeDays);
        setOverviewData(ov);
      } else if (activeSection === 'users') {
        const ud = await api.getOwnerUsers({
          search: userSearch,
          role: userRoleFilter,
          status: userStatusFilter,
          limit: 20,
          offset: userOffset
        });
        setUserDirectoryData(ud);
      } else if (activeSection === 'logins') {
        const ld = await api.getOwnerLoginActivity({
          search: loginSearch,
          status: loginStatusFilter,
          provider: loginProviderFilter,
          limit: 30,
          offset: loginOffset
        });
        setLoginActivityData(ld);
      } else if (activeSection === 'learning') {
        const lrn = await api.getOwnerLearningAnalytics(rangeDays);
        setLearningData(lrn);
      } else if (activeSection === 'engagement') {
        const eng = await api.getOwnerEngagementAnalytics(rangeDays);
        setEngagementData(eng);
      } else if (activeSection === 'audit') {
        const al = await api.getOwnerAuditLogs({
          action: auditActionFilter,
          limit: 50,
          offset: 0
        });
        setAuditLogsData(al);
      }
    } catch (err: any) {
      console.error('Error loading owner console section:', err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, [activeSection, rangeDays, userSearch, userRoleFilter, userStatusFilter, userOffset, loginSearch, loginStatusFilter, loginProviderFilter, loginOffset, auditActionFilter]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadSectionData();
    }
  }, [authStatus, activeSection, loadSectionData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval > 0 && authStatus === 'authenticated') {
      const timer = setInterval(() => {
        loadSectionData();
      }, autoRefreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [autoRefreshInterval, authStatus, loadSectionData]);

  // Handle Owner Sign-In
  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await api.ownerLogin({
        email: loginEmail,
        password: loginPassword
      });
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        setOwnerUser(res.user);
        setAuthStatus('authenticated');
        setLoginPassword('');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Owner authentication failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Inspect User Detail
  const handleOpenUserDetail = async (userId: string) => {
    setIsLoadingUserDetail(true);
    try {
      const detail = await api.getOwnerUserDetail(userId);
      setSelectedUserDetail(detail);
    } catch (err: any) {
      alert(`Failed to load user details: ${err.message}`);
    } finally {
      setIsLoadingUserDetail(false);
    }
  };

  // CSV Report Export
  const handleExportReport = async (reportType: string) => {
    setExportingReport(reportType);
    try {
      await api.downloadOwnerReportCsv(reportType, rangeDays);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingReport(null);
    }
  };

  // Log Out Owner
  const handleOwnerLogout = async () => {
    if (window.confirm('Sign out of the Private Owner Console?')) {
      try {
        await authService.logout();
      } catch {}
      setAuthToken(null);
      setOwnerUser(null);
      setAuthStatus('unauthenticated');
    }
  };

  // --------------------------------------------------------------------------
  // STATE 1: CHECKING SESSION
  // --------------------------------------------------------------------------
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold font-sans tracking-wide text-slate-200">Verifying Owner Credentials...</h2>
            <p className="text-xs text-slate-400">Validating administrative cryptography and backend session authorization.</p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 2: 403 FORBIDDEN (STUDENT OR TEACHER TRIED TO ACCESS)
  // --------------------------------------------------------------------------
  if (authStatus === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111827] border border-rose-500/30 rounded-2xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-medium">
              HTTP 403 — Access Denied
            </div>
            <h2 className="text-xl font-bold font-sans text-white">Private Owner Console Restricted</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              This administrative interface is strictly reserved for authorized platform owners. Student and standard educator accounts are not authorized to view platform telemetry or user activity logs.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Learner Dashboard
            </button>
            <button
              onClick={() => setAuthStatus('unauthenticated')}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4" />
              Sign In as Owner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 3: UNAUTHENTICATED (SECURE OWNER LOGIN SCREEN)
  // --------------------------------------------------------------------------
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">Restricted Portal</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <h1 className="text-lg font-bold font-sans text-white">LearnLoop Owner Console</h1>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Authentication required. Enter your verified platform owner credentials to access production registration metrics, learning activity, and security audit logs.
          </p>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 font-sans">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Owner Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D16] border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="owner@learnloop.ai"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Owner Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D16] border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-all shadow-md cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate to Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">IP Rate Limiting Active</span>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Exit to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 4: AUTHENTICATED OWNER CONSOLE
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans">
      {/* Top Console Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#090D16]/95 backdrop-blur-md border-b border-slate-800 w-full px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">LearnLoop AI</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-400/30">
                  OWNER CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Confidential Administrative Telemetry</p>
            </div>
          </div>

          {/* Right Controls: Clocks, Auto-refresh, Export, Exit */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Live Clock Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentTimeUTC}</span>
            </div>

            {/* Auto-refresh selector */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
              <span className="text-slate-500 font-mono">Auto:</span>
              <button
                onClick={() => setAutoRefreshInterval(0)}
                className={`px-1.5 py-0.5 rounded ${autoRefreshInterval === 0 ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'}`}
              >
                Off
              </button>
              <button
                onClick={() => setAutoRefreshInterval(30)}
                className={`px-1.5 py-0.5 rounded ${autoRefreshInterval === 30 ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'}`}
              >
                30s
              </button>
              <button
                onClick={() => setAutoRefreshInterval(60)}
                className={`px-1.5 py-0.5 rounded ${autoRefreshInterval === 60 ? 'bg-indigo-600 text-white font-bold' : 'hover:text-white'}`}
              >
                60s
              </button>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadSectionData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh console telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Quick Export Button */}
            <button
              onClick={() => setActiveSection('exports')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Sign Out Owner */}
            <button
              onClick={handleOwnerLogout}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-colors cursor-pointer"
              title="Sign out of owner console"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            {/* Public Site Link */}
            <button
              onClick={() => { window.location.href = '/'; }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] transition-colors"
            >
              <span>Main Site</span>
              <ArrowLeft className="w-3 h-3 rotate-180" />
            </button>
          </div>
        </div>

        {/* Console Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-3 pt-2 border-t border-slate-800/60 overflow-x-auto no-scrollbar touch-pan-x">
          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium min-w-max pb-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'overview'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveSection('users')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'users'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Directory</span>
            </button>

            <button
              onClick={() => setActiveSection('logins')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'logins'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Activity</span>
            </button>

            <button
              onClick={() => setActiveSection('learning')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'learning'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Learning Activity</span>
            </button>

            <button
              onClick={() => setActiveSection('engagement')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'engagement'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Retention & Cohorts</span>
            </button>

            <button
              onClick={() => setActiveSection('exports')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'exports'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Reports & CSV</span>
            </button>

            <button
              onClick={() => setActiveSection('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 min-h-[38px] rounded-lg transition-all cursor-pointer ${
                activeSection === 'audit'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Security & Audit</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ================================================================== */}
        {/* TAB 1: OVERVIEW METRICS */}
        {/* ================================================================== */}
        {activeSection === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Platform Telemetry Overview</h2>
                <p className="text-xs text-slate-400">Authentic database-backed metrics covering user registrations, active sessions, and engagement.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Date Range:</span>
                <select
                  value={rangeDays}
                  onChange={(e) => setRangeDays(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* KPI Cards Grid */}
            {overviewData ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Total Users */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Registered</span>
                    <div className="text-2xl font-bold font-mono text-white">{overviewData.total_registered_users}</div>
                    <div className="text-[11px] text-indigo-400">Database verified</div>
                  </div>

                  {/* New Today */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">New Today (UTC)</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">+{overviewData.new_registrations_today}</div>
                    <div className="text-[11px] text-slate-400">Past 24h: +{overviewData.new_registrations_week} / week</div>
                  </div>

                  {/* DAU */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">DAU (Active 24h)</span>
                    <div className="text-2xl font-bold font-mono text-indigo-400">{overviewData.dau}</div>
                    <div className="text-[11px] text-slate-400">WAU: {overviewData.wau} | MAU: {overviewData.mau}</div>
                  </div>

                  {/* Successful Logins */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Logins</span>
                    <div className="text-2xl font-bold font-mono text-white">{overviewData.total_successful_logins}</div>
                    <div className="text-[11px] text-slate-400">Returning: {overviewData.returning_users}</div>
                  </div>

                  {/* Active Sessions */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Sessions</span>
                    <div className="text-2xl font-bold font-mono text-amber-400">{overviewData.active_sessions}</div>
                    <div className="text-[11px] text-slate-400">Valid rotating tokens</div>
                  </div>

                  {/* Engagement Rate */}
                  <div className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Engagement Rate</span>
                    <div className="text-2xl font-bold font-mono text-teal-400">{overviewData.engagement_rate}%</div>
                    <div className="text-[11px] text-slate-400">MAU / Registered</div>
                  </div>
                </div>

                {/* Trend Visualizations (Recharts) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Registrations Chart */}
                  <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-sm text-white">Daily Registration Volume</h3>
                        <p className="text-[11px] text-slate-400">New student and educator accounts registered over {rangeDays} days</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">Count</span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overviewData.registration_trends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                          <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }}
                            labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="registrations" name="New Registrations" fill="#5B5CE2" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Active Users & Logins Chart */}
                  <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-sm text-white">Active Users & Logins Trend</h3>
                        <p className="text-[11px] text-slate-400">Unique daily active learners vs total authentication events</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">Daily</span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={overviewData.active_user_trends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                          <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }}
                            labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                          <Line type="monotone" dataKey="active_users" name="Active Users" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} />
                          <Line type="monotone" dataKey="logins" name="Successful Logins" stroke="#6366F1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Engagement Breakdown & Devices */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Daily Learning Events Area Chart */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-sm text-white">Learning Activity Volume (Tutor, Quiz, Diagnostic)</h3>
                        <p className="text-[11px] text-slate-400">Actual educational events executed across all active students</p>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewData.engagement_trends}>
                          <defs>
                            <linearGradient id="learnGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                          <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }}
                            labelStyle={{ color: '#E5E7EB', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="events" name="Learning Events" stroke="#8B5CF6" fillOpacity={1} fill="url(#learnGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Device Telemetry Pie Chart */}
                  <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                    <h3 className="font-bold text-sm text-white">Client Device Category</h3>
                    <div className="h-52 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overviewData.device_breakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {overviewData.device_breakdown.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-[11px] text-slate-400 text-center">Privacy preserved: Zero hardware fingerprinting.</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading overview telemetry...</div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: USER DIRECTORY */}
        {/* ================================================================== */}
        {activeSection === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Registered User Directory</h2>
                <p className="text-xs text-slate-400">Searchable, paginated user registry with login counts, activity summaries, and status.</p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserOffset(0);
                    }}
                    placeholder="Search name, email, ID..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserOffset(0);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="owner">Owner</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserOffset(0);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            {userDirectoryData ? (
              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">User Details</th>
                        <th className="py-3 px-4">Role / Provider</th>
                        <th className="py-3 px-4">Registered (UTC)</th>
                        <th className="py-3 px-4">Logins</th>
                        <th className="py-3 px-4">Last Activity</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {userDirectoryData.users.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{u.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                                u.role === 'owner' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' :
                                u.role === 'teacher' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' :
                                'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {u.role}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">({u.auth_provider})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {u.created_at ? u.created_at.replace('T', ' ').slice(0, 19) : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            {u.total_successful_logins || 1}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                            {u.last_activity_at ? u.last_activity_at.replace('T', ' ').slice(0, 19) : (u.last_login_at ? u.last_login_at.replace('T', ' ').slice(0, 19) : '—')}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              u.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenUserDetail(u.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors cursor-pointer text-[11px]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Showing <span className="font-mono text-white">{userOffset + 1}</span> to{' '}
                    <span className="font-mono text-white">{Math.min(userOffset + 20, userDirectoryData.total)}</span> of{' '}
                    <span className="font-mono text-white">{userDirectoryData.total}</span> users
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={userOffset === 0}
                      onClick={() => setUserOffset(Math.max(0, userOffset - 20))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      disabled={userOffset + 20 >= userDirectoryData.total}
                      onClick={() => setUserOffset(userOffset + 20)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading user registry...</div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: LOGIN ACTIVITY */}
        {/* ================================================================== */}
        {activeSection === 'logins' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Authentication & Login Activity</h2>
                <p className="text-xs text-slate-400">Complete audit log of successful authentications, failed attempts, and browser telemetry.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={loginSearch}
                  onChange={(e) => {
                    setLoginSearch(e.target.value);
                    setLoginOffset(0);
                  }}
                  placeholder="Filter email, IP..."
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-44"
                />

                <select
                  value={loginStatusFilter}
                  onChange={(e) => {
                    setLoginStatusFilter(e.target.value);
                    setLoginOffset(0);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>

                <select
                  value={loginProviderFilter}
                  onChange={(e) => {
                    setLoginProviderFilter(e.target.value);
                    setLoginOffset(0);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">All Providers</option>
                  <option value="local">Local</option>
                  <option value="google">Google</option>
                  <option value="demo">Demo Session</option>
                </select>
              </div>
            </div>

            {loginActivityData ? (
              <div className="space-y-6">
                {/* Visual browser and status breakdown summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#111827] border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Total Events Recorded</span>
                    <div className="text-xl font-bold font-mono text-white">{loginActivityData.total}</div>
                  </div>
                  {loginActivityData.status_breakdown.map((sb: any) => (
                    <div key={sb.name} className="p-3.5 rounded-xl bg-[#111827] border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{sb.name} Events</span>
                      <div className={`text-xl font-bold font-mono ${sb.name === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>{sb.value}</div>
                    </div>
                  ))}
                </div>

                {/* Logins Table */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Timestamp (UTC)</th>
                          <th className="py-3 px-4">User / Email</th>
                          <th className="py-3 px-4">Event & Provider</th>
                          <th className="py-3 px-4">Status / Reason</th>
                          <th className="py-3 px-4">Device & Browser</th>
                          <th className="py-3 px-4">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {loginActivityData.events.map((ev: any) => (
                          <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                              {ev.created_at ? ev.created_at.replace('T', ' ').slice(0, 19) : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono text-slate-200">{ev.email}</div>
                              {ev.user_id && <div className="text-[10px] font-mono text-slate-500">ID: {ev.user_id}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-300">{ev.event_type}</span>
                              <div className="text-[11px] text-slate-500 font-mono">provider: {ev.auth_provider}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                ev.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {ev.status}
                              </span>
                              {ev.failure_reason && (
                                <div className="text-[10px] text-rose-400/80 font-mono mt-0.5">{ev.failure_reason}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <div className="flex items-center gap-1.5">
                                {ev.device_category === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> :
                                 ev.device_category === 'tablet' ? <Tablet className="w-3.5 h-3.5 text-amber-400" /> :
                                 <Laptop className="w-3.5 h-3.5 text-teal-400" />}
                                <span className="font-medium capitalize">{ev.device_category || 'Desktop'}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-400">{ev.browser || 'Browser'} ({ev.os || 'OS'})</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {ev.ip_address || '127.0.0.1'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Showing <span className="font-mono text-white">{loginOffset + 1}</span> to{' '}
                      <span className="font-mono text-white">{Math.min(loginOffset + 30, loginActivityData.total)}</span> of{' '}
                      <span className="font-mono text-white">{loginActivityData.total}</span> events
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={loginOffset === 0}
                        onClick={() => setLoginOffset(Math.max(0, loginOffset - 30))}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={loginOffset + 30 >= loginActivityData.total}
                        onClick={() => setLoginOffset(loginOffset + 30)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading login telemetry...</div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: LEARNING ACTIVITY & FEATURE USAGE */}
        {/* ================================================================== */}
        {activeSection === 'learning' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Learning Activity & Feature Adoption</h2>
              <p className="text-xs text-slate-400">Granular educational telemetry without recording private conversation text or raw answers.</p>
            </div>

            {learningData ? (
              <div className="space-y-6">
                {/* Event Types Aggregation Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {learningData.events_by_type.map((eb: any) => (
                    <div key={eb.event_type} className="p-4 rounded-2xl bg-[#111827] border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">{eb.event_type.replace(/_/g, ' ')}</span>
                      <div className="text-2xl font-bold font-mono text-white">{eb.event_count}</div>
                      <div className="text-[11px] text-slate-400">{eb.unique_users} unique learners</div>
                    </div>
                  ))}
                </div>

                {/* Top Engaged Concepts Table */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                  <h3 className="font-bold text-sm text-white">Top Engaged DSA Concepts</h3>
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Concept Name</th>
                          <th className="py-2.5 px-3">Concept ID</th>
                          <th className="py-2.5 px-3">Total Submissions</th>
                          <th className="py-2.5 px-3">Average Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {learningData.top_concepts.map((tc: any) => (
                          <tr key={tc.concept_id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-medium text-white">{tc.concept_name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{tc.concept_id}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{tc.attempts_count}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                                tc.accuracy >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
                                tc.accuracy >= 40 ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {tc.accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily Learning Volume Stacked Chart */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                  <h3 className="font-bold text-sm text-white">Daily Learning Volume Breakdown</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={learningData.volume_series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.75rem', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="quiz_attempts" name="Quizzes" fill="#5B5CE2" stackId="a" />
                        <Bar dataKey="tutor_questions" name="AI Tutor Turns" fill="#10B981" stackId="a" />
                        <Bar dataKey="diagnostics" name="Diagnostics" fill="#F59E0B" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading educational analytics...</div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 5: RETENTION & COHORTS */}
        {/* ================================================================== */}
        {activeSection === 'engagement' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">User Engagement & Weekly Cohort Retention</h2>
              <p className="text-xs text-slate-400">Standard retention cohorts tracking weekly recurring educational activity.</p>
            </div>

            {engagementData ? (
              <div className="space-y-6">
                {/* Feature Adoption Progress Bars */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                  <h3 className="font-bold text-sm text-white">Platform Feature Adoption Rates</h3>
                  <p className="text-xs text-slate-400">Percentage of total registered user base that actively engaged each core feature</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {engagementData.feature_adoption.map((fa: any) => (
                      <div key={fa.feature} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-200">{fa.feature}</span>
                          <span className="font-mono font-bold text-indigo-400">{fa.adoption_percentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
                            style={{ width: `${Math.min(fa.adoption_percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{fa.unique_users} unique learners engaged</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Cohort Retention Table */}
                <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
                  <h3 className="font-bold text-sm text-white">Weekly User Retention Matrix (Cohorts)</h3>
                  <p className="text-xs text-slate-400">Percentage of registered cohort members returning to complete learning sessions in subsequent weeks</p>

                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Registration Cohort</th>
                          <th className="py-2.5 px-3">Cohort Size</th>
                          <th className="py-2.5 px-3">Week 0</th>
                          <th className="py-2.5 px-3">Week +1</th>
                          <th className="py-2.5 px-3">Week +2</th>
                          <th className="py-2.5 px-3">Week +3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {engagementData.cohort_retention.map((c: any) => (
                          <tr key={c.week} className="hover:bg-slate-800/30">
                            <td className="py-3 px-3 font-medium text-white">{c.week}</td>
                            <td className="py-3 px-3 text-slate-300 font-bold">{c.size} users</td>
                            <td className="py-3 px-3 text-emerald-400 font-bold">100%</td>
                            <td className="py-3 px-3">
                              {c.w1 !== null ? (
                                <span className={`inline-flex px-2 py-0.5 rounded font-bold ${
                                  c.w1 >= 40 ? 'bg-emerald-500/20 text-emerald-300' :
                                  c.w1 >= 20 ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {c.w1}%
                                </span>
                              ) : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-3">
                              {c.w2 !== null ? (
                                <span className={`inline-flex px-2 py-0.5 rounded font-bold ${
                                  c.w2 >= 30 ? 'bg-emerald-500/20 text-emerald-300' :
                                  c.w2 >= 15 ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {c.w2}%
                                </span>
                              ) : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-3">
                              {c.w3 !== null ? (
                                <span className={`inline-flex px-2 py-0.5 rounded font-bold ${
                                  c.w3 >= 20 ? 'bg-emerald-500/20 text-emerald-300' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {c.w3}%
                                </span>
                              ) : <span className="text-slate-600">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading engagement cohorts...</div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 6: REPORTS & CSV EXPORTS */}
        {/* ================================================================== */}
        {activeSection === 'exports' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Platform Telemetry Reports & CSV Exports</h2>
              <p className="text-xs text-slate-400">Download authorized CSV files for compliance, external audits, and business intelligence.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Report 1: Registrations */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">User Registrations Report</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Complete listing of all registered users with unique identifiers, student IDs, registration timestamps, and last login.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">Columns: ID, Student ID, Name, Email, Role, Auth Provider, Created At</div>
                </div>
                <button
                  onClick={() => handleExportReport('registrations')}
                  disabled={exportingReport === 'registrations'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingReport === 'registrations' ? 'animate-bounce' : ''}`} />
                  <span>{exportingReport === 'registrations' ? 'Generating CSV...' : 'Download Registrations CSV'}</span>
                </button>
              </div>

              {/* Report 2: Logins */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Login & Session Activity</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Complete authentication audit trail containing timestamps, success/failure status, device categories, and browsers.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">Columns: Timestamp, User ID, Email, Provider, Status, Device, Browser, IP</div>
                </div>
                <button
                  onClick={() => handleExportReport('logins')}
                  disabled={exportingReport === 'logins'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingReport === 'logins' ? 'animate-bounce' : ''}`} />
                  <span>{exportingReport === 'logins' ? 'Generating CSV...' : 'Download Login Activity CSV'}</span>
                </button>
              </div>

              {/* Report 3: Learning Activity */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">Learning Activity Telemetry</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Event logs for Socratic queries, quizzes attempted, diagnostics completed, and spaced revision sessions.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">Columns: Timestamp, User ID, Student ID, Event Type, Concept ID, Duration</div>
                </div>
                <button
                  onClick={() => handleExportReport('learning-activity')}
                  disabled={exportingReport === 'learning-activity'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingReport === 'learning-activity' ? 'animate-bounce' : ''}`} />
                  <span>{exportingReport === 'learning-activity' ? 'Generating CSV...' : 'Download Learning Activity CSV'}</span>
                </button>
              </div>

              {/* Report 4: Feature Usage */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <h3 className="font-bold text-sm text-white">Feature Adoption Report</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    High-level rollups of total events and unique learners per platform feature across the selected date range.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">Columns: Feature Name, Event Type, Total Events, Unique Users</div>
                </div>
                <button
                  onClick={() => handleExportReport('feature-usage')}
                  disabled={exportingReport === 'feature-usage'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingReport === 'feature-usage' ? 'animate-bounce' : ''}`} />
                  <span>{exportingReport === 'feature-usage' ? 'Generating CSV...' : 'Download Feature Usage CSV'}</span>
                </button>
              </div>

              {/* Report 5: Audit Logs */}
              <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">Administrative Security Audit</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Full immutable log of owner console logins, access checks, user profile views, and security alerts.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500">Columns: Timestamp, Actor, Action, Target, Status, IP, Details</div>
                </div>
                <button
                  onClick={() => handleExportReport('audit-logs')}
                  disabled={exportingReport === 'audit-logs'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${exportingReport === 'audit-logs' ? 'animate-bounce' : ''}`} />
                  <span>{exportingReport === 'audit-logs' ? 'Generating CSV...' : 'Download Audit Trail CSV'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 7: SECURITY & AUDIT LOGS */}
        {/* ================================================================== */}
        {activeSection === 'audit' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Security & Administrative Audit Trail</h2>
                <p className="text-xs text-slate-400">Tamper-evident, immutable event log for console sessions, privilege elevations, and access checks.</p>
              </div>

              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none"
              >
                <option value="all">All Actions</option>
                <option value="OWNER_LOGIN_SUCCESS">Owner Login Success</option>
                <option value="CONSOLE_ACCESS_VERIFIED">Console Access Verified</option>
                <option value="VIEW_USER_DETAIL">View User Detail</option>
                <option value="EXPORT_REPORT">Export Report</option>
                <option value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized Probes</option>
              </select>
            </div>

            {auditLogsData ? (
              <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp (UTC)</th>
                        <th className="py-3 px-4">Actor Email</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {auditLogsData.logs.map((al: any) => (
                        <tr key={al.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                            {al.created_at ? al.created_at.replace('T', ' ').slice(0, 19) : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-200">{al.actor_email}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-indigo-300">{al.action}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{al.target || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              al.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {al.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{al.ip_address || '127.0.0.1'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[10px] max-w-xs truncate">
                            {al.details_json || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-mono text-xs">Loading audit trail...</div>
            )}
          </div>
        )}
      </main>

      {/* User Detail Slide-over / Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-3xl w-full max-h-[calc(100dvh-2rem)] flex flex-col bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{selectedUserDetail.full_name}</h3>
                  <div className="text-xs font-mono text-slate-400">{selectedUserDetail.email} · {selectedUserDetail.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Account Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400">Role & Provider</span>
                  <div className="font-bold text-white capitalize">{selectedUserDetail.role} ({selectedUserDetail.auth_provider})</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400">Registration Date</span>
                  <div className="font-mono text-white text-[11px]">{selectedUserDetail.created_at?.slice(0, 10)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400">Last Login (UTC)</span>
                  <div className="font-mono text-white text-[11px]">{selectedUserDetail.last_login_at?.slice(0, 19).replace('T', ' ') || '—'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400">Verified Proficiency</span>
                  <div className="font-bold text-teal-400">{selectedUserDetail.learner?.verified_proficiency_level || 'Beginner'}</div>
                </div>
              </div>

              {/* Concept Mastery Progress */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white">Concept Mastery Progress</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUserDetail.concept_mastery?.map((cm: any) => (
                    <div key={cm.concept_id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-200">{cm.concept_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">attempts: {cm.questions_attempted} | correct: {cm.correct_answers}</div>
                      </div>
                      <span className="font-mono font-bold text-indigo-400 text-xs">{cm.mastery_percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Learning Activity */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white">Recent Educational Activity Events</h4>
                <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="divide-y divide-slate-800 text-[11px]">
                    {selectedUserDetail.recent_activity?.length ? (
                      selectedUserDetail.recent_activity.map((ra: any) => (
                        <div key={ra.id} className="p-2.5 flex items-center justify-between">
                          <span className="font-medium text-slate-300">{ra.event_type}</span>
                          <span className="font-mono text-slate-500">{ra.created_at?.slice(0, 19).replace('T', ' ')}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500">No educational events logged yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
