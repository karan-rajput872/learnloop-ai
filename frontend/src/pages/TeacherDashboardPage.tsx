import React, { useState, useEffect } from 'react';
import { TeacherDashboardData } from '../types';
import { api } from '../services/api';
import {
  Users,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PIE_COLORS = ['#A855F7', '#EC4899', '#38BDF8', '#F59E0B', '#10B981', '#6366F1'];

export const TeacherDashboardPage: React.FC = () => {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeacherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTeacherDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load teacher dashboard', err);
      setError(err?.message || 'Failed to aggregate class metrics. Server may still be waking up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-16 text-center text-slate-400 font-mono text-sm bg-edu-900 rounded-2xl border border-edu-800 animate-pulse space-y-3">
        <Users className="w-8 h-8 text-purple-400 animate-bounce mx-auto" />
        <div>Aggregating class-wide learner models & misconception distributions...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center text-slate-400 font-mono text-sm bg-edu-900 rounded-2xl border border-edu-800 space-y-4 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <div className="text-white font-bold text-base">Teacher Analytics Pending</div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          {error || 'Unable to retrieve cohort metrics. The backend server on Render may still be spinning up from sleep mode.'}
        </p>
        <button
          onClick={fetchTeacherData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-loop-purple hover:bg-purple-600 text-white font-bold text-xs transition-all shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Class Aggregation
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Sample Demonstration Notice (Mandatory Requirement) */}
      <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs flex items-start gap-3 shadow-md">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="font-mono font-bold uppercase tracking-wider text-amber-300">
            Demonstration Cohort Notice
          </h4>
          <p className="font-sans leading-relaxed opacity-90">
            {data.sample_notice}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono mb-1.5">
            <Users className="w-3.5 h-3.5" />
            Class-Wide Diagnostic Intelligence
          </div>
          <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
            Teacher & Educator Intervention Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Monitor conceptual learning gaps, recurring cognitive flaws, and automated student intervention signals.
          </p>
        </div>

        <button
          onClick={fetchTeacherData}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-edu-900 hover:bg-edu-800 border border-edu-700 text-slate-300 transition-colors"
          title="Refresh Class Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-5 shadow-sm space-y-1">
          <span className="text-xs font-mono uppercase text-slate-400">Total Demo Learners</span>
          <div className="text-3xl font-extrabold font-mono text-white">{data.total_demo_learners}</div>
          <div className="text-[11px] text-slate-400">Enrolled in DSA curriculum</div>
        </div>

        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-5 shadow-sm space-y-1">
          <span className="text-xs font-mono uppercase text-slate-400">Class Average Mastery</span>
          <div className="text-3xl font-extrabold font-mono text-purple-400">{data.average_concept_mastery}%</div>
          <div className="text-[11px] text-purple-300/70">Across all 12 syllabus concepts</div>
        </div>

        <div className="bg-edu-900/90 rounded-2xl border border-rose-900/50 p-5 shadow-sm space-y-1">
          <span className="text-xs font-mono uppercase text-rose-300">Intervention Alerts</span>
          <div className="text-3xl font-extrabold font-mono text-rose-400">{data.students_requiring_intervention.length}</div>
          <div className="text-[11px] text-rose-300/70">Struggling learners flagged by agent</div>
        </div>
      </div>

      {/* Visual Analytics Row: Weakest Concepts & Misconceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Weakest Concepts Bar Chart */}
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-edu-800 pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                Weakest Concepts Across Cohort
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Number of learners scoring below 40% threshold
              </p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weakest_concepts} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="concept" stroke="#64748b" fontSize={11} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1120', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#C084FC' }}
                />
                <Bar dataKey="struggling_students" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Misconception Distribution Pie / Bar */}
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-edu-800 pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-loop-blue" />
                Class-Wide Misconception Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dominant conceptual flaws diagnosed by reasoning analysis
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 max-h-64 overflow-y-auto">
            {data.class_misconception_distribution.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-edu-950 border border-edu-800 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-200 truncate max-w-xs sm:max-w-sm">{m.misconception}</span>
                </div>
                <span className="text-purple-300 font-bold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800 shrink-0">
                  {m.count} student(s)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Actionable Student Intervention Alerts */}
      <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Students Requiring Timely Intervention ({data.students_requiring_intervention.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated recommendations generated by the learner model based on stagnant mastery and recurring misconceptions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.students_requiring_intervention.map((st) => (
            <div
              key={st.student_id}
              className="p-4 rounded-xl bg-edu-950 border border-rose-900/60 shadow-sm space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono font-bold text-sm text-white">{st.name}</h4>
                  <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                    {st.mastery}% Mastery
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Weakest Area: <strong className="text-purple-300">{st.weakest_concept}</strong>
                </div>

                <div className="text-xs font-sans text-slate-300 bg-edu-900/70 p-2.5 rounded-lg border border-edu-800">
                  <span className="text-rose-400 font-semibold font-mono text-[10px] block uppercase mb-0.5">Primary Flaw:</span>
                  {st.primary_misconception}
                </div>
              </div>

              <div className="pt-2 border-t border-edu-800/80 text-[11px] font-sans text-purple-200">
                <strong>Recommended Action:</strong> {st.recommended_intervention}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
