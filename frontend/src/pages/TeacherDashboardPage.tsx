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

const PIE_COLORS = ['#5B5CE2', '#0F9F91', '#D99027', '#2563EB', '#EC4899', '#8B5CF6'];

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
      <div className="max-w-7xl mx-auto p-16 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card animate-pulse space-y-3">
        <Users className="w-8 h-8 text-[#5B5CE2] animate-bounce mx-auto" />
        <div>Aggregating class-wide learner models & misconception distributions...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-4 animate-fade-in">
        <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
        <div className="text-[#172033] font-bold text-base">Teacher Analytics Pending</div>
        <p className="text-xs text-[#667085] leading-relaxed">
          {error || 'Unable to retrieve cohort metrics. The backend server on Render may still be spinning up from sleep mode.'}
        </p>
        <button
          onClick={fetchTeacherData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Class Aggregation
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Sample Demonstration Notice (Mandatory Hackathon Transparency) */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="font-mono font-bold uppercase tracking-wider text-amber-900">
            Demonstration Cohort Disclosure
          </h4>
          <p className="font-sans leading-relaxed text-amber-800">
            {data.sample_notice}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1.5">
            <Users className="w-3.5 h-3.5" />
            Class-Wide Diagnostic Intelligence
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            Teacher & Educator Intervention Portal
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-sans">
            Monitor conceptual learning gaps, recurring cognitive flaws, and automated student intervention signals.
          </p>
        </div>

        <button
          onClick={fetchTeacherData}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-[#667085] transition-colors shadow-xs"
          title="Refresh Class Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#5B5CE2]' : ''}`} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-1">
          <span className="text-xs font-mono uppercase text-[#667085]">Total Demo Learners</span>
          <div className="text-3xl font-extrabold font-mono text-[#172033]">{data.total_demo_learners}</div>
          <div className="text-[11px] text-[#667085]">Enrolled in DSA curriculum</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-1">
          <span className="text-xs font-mono uppercase text-[#667085]">Class Average Mastery</span>
          <div className="text-3xl font-extrabold font-mono text-[#5B5CE2]">{data.average_concept_mastery}%</div>
          <div className="text-[11px] text-[#667085]">Across all 12 syllabus concepts</div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-card space-y-1">
          <span className="text-xs font-mono uppercase text-rose-700">Intervention Alerts</span>
          <div className="text-3xl font-extrabold font-mono text-[#D64545]">{data.students_requiring_intervention.length}</div>
          <div className="text-[11px] text-rose-600">Struggling learners flagged by agent</div>
        </div>
      </div>

      {/* Visual Analytics Row: Weakest Concepts & Misconceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Weakest Concepts Bar Chart */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-[#E6E9EF] pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#172033] tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                Weakest Concepts Across Cohort
              </h3>
              <p className="text-[11px] text-[#667085] mt-0.5 font-sans">
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
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E6E9EF', borderRadius: '12px', fontSize: '12px', color: '#172033', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#5B5CE2' }}
                />
                <Bar dataKey="struggling_students" fill="#5B5CE2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Misconception Distribution List */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-[#E6E9EF] pb-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#172033] tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-[#5B5CE2]" />
                Class-Wide Misconception Distribution
              </h3>
              <p className="text-[11px] text-[#667085] mt-0.5 font-sans">
                Dominant conceptual flaws diagnosed by reasoning analysis
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 max-h-64 overflow-y-auto">
            {data.class_misconception_distribution.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50/80 border border-[#E6E9EF] flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-[#172033] font-sans font-medium truncate max-w-xs sm:max-w-sm">{m.misconception}</span>
                </div>
                <span className="text-[#5B5CE2] font-bold bg-[#EEF0FD] px-2 py-0.5 rounded border border-[#C7D2FE] shrink-0 font-mono text-[11px]">
                  {m.count} student(s)
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Actionable Student Intervention Alerts */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase text-[#172033] tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Students Requiring Timely Intervention ({data.students_requiring_intervention.length})
          </h3>
          <p className="text-xs text-[#667085] mt-0.5 font-sans">
            Automated recommendations generated by the learner model based on stagnant mastery and recurring misconceptions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.students_requiring_intervention.map((st) => (
            <div
              key={st.student_id}
              className="p-4 rounded-xl bg-white border border-rose-200 shadow-sm space-y-2.5 flex flex-col justify-between card-hover"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#172033] font-sans">{st.name}</h4>
                  <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {st.mastery}% Mastery
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[#667085]">
                  Weakest Area: <strong className="text-[#5B5CE2]">{st.weakest_concept}</strong>
                </div>

                <div className="text-xs font-sans text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-[#E6E9EF]">
                  <span className="text-rose-700 font-semibold font-mono text-[10px] block uppercase mb-0.5">Primary Flaw:</span>
                  {st.primary_misconception}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E6E9EF] text-[11px] font-sans text-[#5B5CE2]">
                <strong className="text-[#172033]">Recommended Action:</strong> {st.recommended_intervention}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
