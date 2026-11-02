import React, { useState, useEffect, useCallback } from 'react';
import { TeacherDashboardData } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  BrainCircuit,
  GraduationCap,
  ShieldCheck,
  Lock,
  LayoutDashboard,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const PIE_COLORS = ['#5B5CE2', '#0F9F91', '#D99027', '#2563EB', '#EC4899', '#8B5CF6'];

interface TeacherDashboardPageProps {
  onNavigateToTab?: (tab: string) => void;
}

export const TeacherDashboardPage: React.FC<TeacherDashboardPageProps> = ({ onNavigateToTab }) => {
  const { user, isAuthenticated } = useAuth();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isStudentAccount = user && user.role === 'student' && !user.is_demo;

  // View modes: 'real' (authorized educators), 'demo' (safe synthetic cohort), 'restricted' (student access barrier)
  const [viewMode, setViewMode] = useState<'real' | 'demo' | 'restricted'>(() => {
    try {
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('learnloop_cached_user') : null;
      const u = cached ? JSON.parse(cached) : user;
      if (u?.role === 'teacher' || u?.role === 'admin') return 'real';
      if (u?.role === 'student' && !u?.is_demo) {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('teacher_demo_mode_active') === 'true') {
          return 'demo';
        }
        return 'restricted';
      }
    } catch {
      // fallback
    }
    if (isTeacherOrAdmin) return 'real';
    if (isStudentAccount) return 'restricted';
    return 'demo';
  });

  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAggregating, setIsAggregating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAggregatedAt, setLastAggregatedAt] = useState<string | null>(null);
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  // Sync viewMode if user role changes or session restores
  useEffect(() => {
    if (isTeacherOrAdmin) {
      setViewMode('real');
    } else if (isStudentAccount) {
      const isExplicitDemo = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('teacher_demo_mode_active') === 'true';
      setViewMode(isExplicitDemo ? 'demo' : 'restricted');
    } else {
      setViewMode('demo');
    }
  }, [user, isTeacherOrAdmin, isStudentAccount]);

  const loadData = useCallback(async (modeToLoad: 'real' | 'demo') => {
    setLoading(true);
    setError(null);
    setAggregationNotice(null);

    try {
      if (modeToLoad === 'demo') {
        const res = await api.getTeacherDemoDashboard();
        setData(res);
        setLastAggregatedAt(res.last_aggregated_at || new Date().toISOString());
      } else {
        const res = await api.getTeacherDashboard();
        setData(res);
        setLastAggregatedAt(res.last_aggregated_at || new Date().toISOString());
      }
    } catch (err: any) {
      console.warn('Teacher dashboard fetch error:', err);
      const is403 = err?.message?.includes('403') || err?.status === 403;
      if (is403) {
        setViewMode('restricted');
      } else {
        setError(err?.message || 'Unable to connect to the analytics service. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'restricted') {
      setLoading(false);
    } else {
      loadData(viewMode);
    }
  }, [viewMode, loadData]);

  // Recalculate Class Aggregation (working implementation)
  const handleRecalculateAggregation = async () => {
    if (isAggregating) return;
    setIsAggregating(true);
    setError(null);
    setAggregationNotice(null);

    try {
      if (viewMode === 'demo') {
        const res = await api.aggregateDemoMetrics();
        setData(res.data);
        setLastAggregatedAt(res.data.last_aggregated_at || new Date().toISOString());
        setAggregationNotice('Demonstration cohort telemetry re-aggregated successfully.');
      } else {
        const res = await api.aggregateTeacherMetrics();
        setData(res.data);
        setLastAggregatedAt(res.data.last_aggregated_at || new Date().toISOString());
        setAggregationNotice('Class telemetry re-aggregated across all active learners.');
      }
    } catch (err: any) {
      console.error('Aggregation failed:', err);
      const is403 = err?.message?.includes('403') || err?.status === 403;
      if (is403) {
        setViewMode('restricted');
      } else {
        setError(err?.message || 'Aggregation failed. Backend service may be reconnecting.');
      }
    } finally {
      setIsAggregating(false);
    }
  };

  // =========================================================================
  // STATE 1: Student Role Restricted Screen (Replaces broken 403 loop)
  // =========================================================================
  if (viewMode === 'restricted') {
    return (
      <div className="max-w-2xl mx-auto my-4 sm:my-6 p-5 sm:p-8 bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[#EEF0FD] border border-[#C7D2FE] flex items-center justify-center mx-auto text-[#5B5CE2]">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium">
            <Lock className="w-3.5 h-3.5" />
            Educator Authorization Required • Privacy Protected
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            Teacher & Educator Intervention Portal
          </h2>
          <p className="text-sm text-[#667085] leading-relaxed font-sans max-w-lg mx-auto">
            Teacher analytics are available to authorized teacher accounts. You can continue using your student dashboard or explore the Teacher Demo Dashboard.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-[#E6E9EF] text-left text-xs font-sans text-[#667085] space-y-2">
          <div className="font-bold text-[#172033] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#5B5CE2]" />
            Student Privacy & Role-Based Access Control
          </div>
          <p className="leading-relaxed">
            To protect individual learner data privacy, student accounts cannot view class telemetry or peer learning records. Your personal learning progress, mastery DAG, and revision schedules are securely tracked in your personal Student Dashboard.
          </p>
        </div>

        {/* Action Options */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('teacher_demo_mode_active', 'true');
              }
              setViewMode('demo');
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            Explore Teacher Demo Dashboard
          </button>

          {onNavigateToTab && (
            <button
              onClick={() => {
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.removeItem('teacher_demo_mode_active');
                }
                onNavigateToTab('dashboard');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-[#172033] font-medium text-xs border border-[#E6E9EF] transition-colors shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4 text-[#5B5CE2]" />
              Back to My Student Dashboard
            </button>
          )}
        </div>

        {/* Demo Credentials Helper */}
        <div className="pt-4 border-t border-[#E6E9EF] text-xs font-mono text-[#667085] flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="text-slate-400">Evaluating Educator RBAC?</span>
          <span>Sign in as <strong className="text-[#5B5CE2]">teacher@learnloop.ai</strong> (Password: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#172033]">TeacherDemo2026!</code>)</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 2: Loading Skeleton
  // =========================================================================
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-16 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card animate-pulse space-y-4">
        <Users className="w-9 h-9 text-[#5B5CE2] animate-bounce mx-auto" />
        <div className="font-medium text-[#172033]">
          {viewMode === 'demo'
            ? 'Loading synthetic teacher demonstration cohort...'
            : 'Aggregating class-wide learner models & misconception distributions...'}
        </div>
        <p className="text-xs text-[#667085] max-w-sm mx-auto">
          Computing average concept masteries, clustering dominant misconceptions, and flagging students needing intervention.
        </p>
      </div>
    );
  }

  // =========================================================================
  // STATE 3: Network / Server Error
  // =========================================================================
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-6 p-10 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-4 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
        <div className="text-[#172033] font-bold text-base">Analytics Service Notice</div>
        <p className="text-xs text-[#667085] leading-relaxed">
          {error || 'Unable to connect to the analytics service. Please check your connection and try again.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => loadData(viewMode)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
          <button
            onClick={() => setViewMode('demo')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-[#172033] font-medium text-xs transition-colors shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-[#5B5CE2]" />
            Switch to Demo Mode
          </button>
        </div>
      </div>
    );
  }

  // Check if live educator cohort is empty
  const isCohortEmpty = viewMode === 'real' && data.total_demo_learners === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Demonstration Disclosure Banner (Mandatory for Demo Mode) */}
      {(viewMode === 'demo' || data.is_demo) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="font-mono font-bold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <span>Demonstration Cohort Mode</span>
                {isStudentAccount && (
                  <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-sans font-medium">
                    Student Preview
                  </span>
                )}
              </h4>
              <p className="font-sans leading-relaxed text-amber-800">
                {data.sample_notice ||
                  'Demonstration Cohort Notice: Metrics displayed here represent seeded demonstration cohorts for educational demonstration as required by the hackathon specifications.'}
              </p>
            </div>
          </div>

          {onNavigateToTab && isStudentAccount && (
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-medium shrink-0 transition-colors shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              My Dashboard
            </button>
          )}
        </div>
      )}

      {/* Aggregation Notification Toast */}
      {aggregationNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{aggregationNotice}</span>
          {lastAggregatedAt && (
            <span className="text-emerald-700 font-mono text-[11px] ml-auto">
              Aggregated at {new Date(lastAggregatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium">
              <Users className="w-3.5 h-3.5" />
              Class-Wide Diagnostic Intelligence
            </div>

            {viewMode === 'demo' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-mono">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Demo Cohort
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Live Educator Telemetry
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            Teacher & Educator Intervention Portal
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-sans">
            Monitor conceptual learning gaps, recurring cognitive flaws, and automated student intervention signals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Mode Switcher for Educators */}
          {isTeacherOrAdmin && (
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-[#E6E9EF] text-xs font-medium">
              <button
                onClick={() => setViewMode('real')}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 rounded-lg transition-all cursor-pointer ${viewMode === 'real'
                    ? 'bg-white text-[#172033] shadow-xs font-bold'
                    : 'text-[#667085] hover:text-[#172033]'
                  }`}
              >
                Live Class
              </button>
              <button
                onClick={() => setViewMode('demo')}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 rounded-lg transition-all cursor-pointer ${viewMode === 'demo'
                    ? 'bg-white text-[#172033] shadow-xs font-bold'
                    : 'text-[#667085] hover:text-[#172033]'
                  }`}
              >
                Sample Cohort
              </button>
            </div>
          )}

          {/* Working Aggregation Button */}
          <button
            onClick={handleRecalculateAggregation}
            disabled={isAggregating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            title={viewMode === 'demo' ? 'Refresh Demonstration Cohort Telemetry' : 'Recalculate Live Class Aggregation'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAggregating ? 'animate-spin' : ''}`} />
            <span>
              {isAggregating
                ? 'Aggregating...'
                : viewMode === 'demo'
                  ? 'Refresh Demo Aggregation'
                  : 'Recalculate Class Aggregation'}
            </span>
          </button>
        </div>
      </div>

      {/* Empty State for Real Classes with No Learner Submissions Yet */}
      {isCohortEmpty ? (
        <div className="p-12 rounded-2xl bg-white border border-[#E6E9EF] shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-[#667085]">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-sans text-[#172033]">
              No Class Practice Sessions Recorded Yet
            </h3>
            <p className="text-xs text-[#667085] max-w-md mx-auto leading-relaxed">
              Enrolled learners will appear here automatically once they complete diagnostic assessments or adaptive quiz questions.
            </p>
          </div>
          <button
            onClick={() => setViewMode('demo')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Preview Demonstration Cohort Analytics
          </button>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-[#E6E9EF] dark:border-white/10 p-5 shadow-card space-y-1">
              <span className="text-xs font-mono uppercase text-[#667085] dark:text-slate-400">
                {viewMode === 'demo' ? 'Total Demo Learners' : 'Enrolled Learners'}
              </span>
              <div className="text-3xl font-extrabold font-mono text-[#172033] dark:text-white">
                {data.total_demo_learners}
              </div>
              <div className="text-[11px] text-[#667085] dark:text-slate-400">
                {viewMode === 'demo' ? 'Sample students in cohort' : 'Active students in curriculum'}
              </div>
            </div>

            <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-[#E6E9EF] dark:border-white/10 p-5 shadow-card space-y-1">
              <span className="text-xs font-mono uppercase text-[#667085] dark:text-slate-400">Class Average Mastery</span>
              <div className="text-3xl font-extrabold font-mono text-[#5B5CE2] dark:text-[#38B7A5]">
                {data.average_concept_mastery}%
              </div>
              <div className="text-[11px] text-[#667085] dark:text-slate-400">Across all 12 syllabus concepts</div>
            </div>

            <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-rose-200 dark:border-rose-900/60 p-5 shadow-card space-y-1">
              <span className="text-xs font-mono uppercase text-rose-700 dark:text-rose-400">Intervention Alerts</span>
              <div className="text-3xl font-extrabold font-mono text-[#D64545] dark:text-rose-400">
                {data.students_requiring_intervention.length}
              </div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400">Learners flagged by cognitive agent</div>
            </div>
          </div>

          {/* Visual Analytics Row: Weakest Concepts & Misconceptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Weakest Concepts Bar Chart */}
            <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-[#E6E9EF] dark:border-white/10 p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-[#E6E9EF] dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-[#172033] dark:text-white tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    Weakest Concepts Across Cohort
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 font-sans">
                    Number of learners scoring below 40% mastery threshold
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                {data.weakest_concepts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weakest_concepts} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <XAxis dataKey="concept" stroke="#64748b" fontSize={11} angle={-25} textAnchor="end" />
                      <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F8FAFC',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                        itemStyle={{ color: '#38B7A5' }}
                      />
                      <Bar dataKey="struggling_students" fill="#5B5CE2" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#667085] dark:text-slate-400">
                    All learners currently above the mastery threshold.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Misconception Distribution List */}
            <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-[#E6E9EF] dark:border-white/10 p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-[#E6E9EF] dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-[#172033] dark:text-white tracking-wider flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-[#5B5CE2] dark:text-[#38B7A5]" />
                    Class-Wide Misconception Distribution
                  </h3>
                  <p className="text-[11px] text-[#667085] dark:text-slate-400 mt-0.5 font-sans">
                    Dominant conceptual flaws diagnosed by reasoning analysis
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 max-h-64 overflow-y-auto">
                {data.class_misconception_distribution.length > 0 ? (
                  data.class_misconception_distribution.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-[#E6E9EF] dark:border-white/10 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-[#172033] dark:text-white font-sans font-medium truncate max-w-xs sm:max-w-sm">
                          {m.misconception}
                        </span>
                      </div>
                      <span className="text-[#5B5CE2] dark:text-[#38B7A5] font-bold bg-[#EEF0FD] dark:bg-white/10 px-2 py-0.5 rounded-full border border-[#C7D2FE] dark:border-white/10 shrink-0 font-mono text-[11px]">
                        {m.count} student(s)
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-[#667085] dark:text-slate-400">
                    No recurring misconceptions isolated for this cohort.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Actionable Student Intervention Alerts */}
          <div className="bg-white dark:bg-[#101B2D] rounded-3xl border border-[#E6E9EF] dark:border-white/10 p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#172033] dark:text-white tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Students Requiring Timely Intervention ({data.students_requiring_intervention.length})
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5 font-sans">
                Automated recommendations generated by the learner model based on stagnant mastery and recurring misconceptions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.students_requiring_intervention.map((st) => (
                <div
                  key={st.student_id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#182A42] border border-rose-200 dark:border-rose-900/50 shadow-sm space-y-2.5 flex flex-col justify-between bento-card-hover"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#172033] dark:text-white font-sans">{st.name}</h4>
                      <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                        {st.mastery}% Mastery
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-[#667085] dark:text-slate-400">
                      Weakest Area: <strong className="text-[#5B5CE2] dark:text-[#38B7A5]">{st.weakest_concept}</strong>
                    </div>

                    <div className="text-xs font-sans text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-[#E6E9EF] dark:border-white/10">
                      <span className="text-rose-700 dark:text-rose-400 font-semibold font-mono text-[10px] block uppercase mb-0.5">
                        Primary Flaw:
                      </span>
                      {st.primary_misconception}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6E9EF] dark:border-white/10 text-[11px] font-sans text-[#5B5CE2] dark:text-indigo-400">
                    <strong className="text-[#172033] dark:text-white">Recommended Action:</strong> {st.recommended_intervention}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
