import React, { useState, useEffect } from 'react';
import { Question, DiagnosticResult, DiagnosticQuestionReview, DiagnosticAttemptSummary } from '../types';
import { api } from '../services/api';
import { getAuthoritativeDiagnosticQuestions } from '../services/questionBank';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  LayoutDashboard,
  Eye,
  History,
  Sparkles,
  HelpCircle,
  RefreshCw,
  BookOpen,
  Check,
  Award,
  Target,
  Zap,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

interface DiagnosticPageProps {
  onComplete?: () => void;
  onNavigateToDashboard?: () => void;
  onRefreshProfile?: () => void;
  initialMode?: 'quick' | 'comprehensive';
}

export const DiagnosticPage: React.FC<DiagnosticPageProps> = ({
  onComplete,
  onNavigateToDashboard,
  onRefreshProfile,
  initialMode = 'comprehensive'
}) => {
  const [testMode, setTestMode] = useState<'quick' | 'comprehensive'>(initialMode);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { option: string; reasoning: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // View state machine: 'test' | 'summary' | 'review' | 'history'
  const [mode, setMode] = useState<'test' | 'summary' | 'review' | 'history'>('test');
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  // Review screen state
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [reviewIndex, setReviewIndex] = useState(0);

  // History state
  const [attemptsHistory, setAttemptsHistory] = useState<DiagnosticAttemptSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadQuestions = (selectedMode: 'quick' | 'comprehensive' = testMode) => {
    setLoading(true);
    setAnswers({});
    setCurrentIndex(0);
    api.getDiagnosticQuestions(selectedMode)
      .then((data) => {
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        } else {
          setQuestions(getAuthoritativeDiagnosticQuestions(selectedMode));
        }
        setTestMode(selectedMode);
      })
      .catch((err) => {
        console.warn('Backend sync failed, using authoritative diagnostic question bank:', err);
        setQuestions(getAuthoritativeDiagnosticQuestions(selectedMode));
        setTestMode(selectedMode);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions(initialMode);
  }, [initialMode]);

  const handleSelectOption = (optionId: string) => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        option: optionId,
        reasoning: prev[qId]?.reasoning || ''
      }
    }));
  };

  const handleReasoningChange = (text: string) => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        option: prev[qId]?.option || '',
        reasoning: text
      }
    }));
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      const submissions = questions.map(q => ({
        question_id: q.id,
        concept_id: q.concept_id,
        selected_option: answers[q.id]?.option || '',
        student_reasoning: answers[q.id]?.reasoning || ''
      }));

      const res = await api.submitDiagnostic(submissions);
      setResult(res);
      setMode('summary');
      if (onRefreshProfile) onRefreshProfile();
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to submit diagnostic assessment', err);
    } finally {
      setSubmitting(false);
    }
  };

  const loadPastAttempts = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getDiagnosticAttempts();
      setAttemptsHistory(res.attempts || []);
      setMode('history');
    } catch (err) {
      console.error('Failed to fetch past diagnostic attempts', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReviewSpecificAttempt = async (attemptId: string) => {
    try {
      const res = await api.getDiagnosticAttempt(attemptId);
      if (res && res.attempt) {
        setResult(res.attempt);
        setMode('review');
        setReviewFilter('all');
        setReviewIndex(0);
      }
    } catch (err) {
      console.error('Failed to load past attempt review', err);
    }
  };

  const handleRetake = () => {
    if (window.confirm('Retake the diagnostic test? This will reset your answers and launch a fresh assessment.')) {
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setMode('test');
    }
  };

  // --------------------------------------------------------------------------
  // VIEW 1: LOADING & ERROR STATES
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-3 animate-pulse">
        <GraduationCap className="w-8 h-8 text-[#5B5CE2] mx-auto animate-bounce" />
        <div>Loading diagnostic assessment battery (12 foundational DSA questions)...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-4 animate-fade-in">
        <GraduationCap className="w-10 h-10 text-[#5B5CE2] mx-auto" />
        <div className="text-[#172033] font-bold text-base">Diagnostic Battery Pending</div>
        <p className="text-xs text-[#667085] leading-relaxed">
          Could not load the 12 diagnostic onboarding questions. The backend server may still be spinning up from cold sleep.
        </p>
        <button
          onClick={() => loadQuestions()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Loading Questions
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 2: HISTORICAL ATTEMPTS VIEW
  // --------------------------------------------------------------------------
  if (mode === 'history') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1">
              <History className="w-3.5 h-3.5" />
              Assessment History
            </div>
            <h2 className="text-2xl font-bold font-sans text-[#172033]">
              Diagnostic Assessment Attempts
            </h2>
            <p className="text-xs text-[#667085]">
              Review past diagnostic attempts without altering your current learner profile.
            </p>
          </div>

          <button
            onClick={() => setMode(result ? 'summary' : 'test')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-xs font-medium text-[#172033]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to {result ? 'Score Summary' : 'Test'}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4">
          {attemptsHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#667085]">
              No past diagnostic attempts recorded. Complete a diagnostic assessment to see historical records!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#E6E9EF] text-[#667085] font-mono text-[11px] uppercase">
                    <th className="py-2.5 px-3">Attempt ID</th>
                    <th className="py-2.5 px-3">Completed Date</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Accuracy</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E9EF]">
                  {attemptsHistory.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#5B5CE2]">{att.id}</td>
                      <td className="py-3 px-3 text-[#667085]">
                        {new Date(att.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#172033]">
                        {att.score} / {att.total_questions}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${att.percentage >= 80 ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            att.percentage >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                          {att.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleReviewSpecificAttempt(att.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EEF0FD] hover:bg-[#5B5CE2] hover:text-white text-[#5B5CE2] text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review Answers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 3: SUMMARY SCREEN (Post-submission performance report)
  // --------------------------------------------------------------------------
  if (mode === 'summary' && result) {
    const incorrectCount = result.total_questions - result.score;
    const donutData = [
      { name: 'Correct', value: result.score, color: '#0F9F91' },
      { name: 'Incorrect', value: incorrectCount, color: '#E11D48' }
    ];

    const chartData = (result.concept_breakdown || []).map(c => ({
      name: c.concept_name.length > 12 ? c.concept_name.slice(0, 10) + '...' : c.concept_name,
      fullName: c.concept_name,
      accuracy: c.accuracy,
      mastery: c.calibrated_mastery
    }));

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-mono font-medium mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Diagnostic Evaluation Completed
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-[#172033] tracking-tight">
              Assessment Results & Concept Calibration
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
              Completed on {new Date(result.completed_at).toLocaleString()} • Attempt ID: <span className="font-mono text-[#5B5CE2]">{result.attempt_id}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPastAttempts}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-xs font-medium text-[#172033] shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-[#5B5CE2]" />
              Past Attempts
            </button>
            {onNavigateToDashboard && (
              <button
                onClick={onNavigateToDashboard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-xs font-medium text-[#172033] shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#5B5CE2]" />
                Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Score */}
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-3.5 sm:p-5 shadow-card space-y-1">
            <div className="text-[11px] sm:text-xs font-mono text-[#667085] uppercase">Total Score</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#172033] font-sans">
              {result.score} <span className="text-sm sm:text-lg font-normal text-[#667085]">/ {result.total_questions}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#667085] leading-tight">Calibrated across DSA concepts</div>
          </div>

          {/* Card 2: Accuracy */}
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-3.5 sm:p-5 shadow-card space-y-1">
            <div className="text-[11px] sm:text-xs font-mono text-[#667085] uppercase">Accuracy</div>
            <div className={`text-2xl sm:text-3xl font-extrabold font-sans ${result.percentage >= 80 ? 'text-teal-700' :
                result.percentage >= 50 ? 'text-amber-700' : 'text-rose-600'
              }`}>
              {result.percentage}%
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#667085] leading-tight">Calibrated score percentage</div>
          </div>

          {/* Card 3: Correct Answers */}
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-3.5 sm:p-5 shadow-card space-y-1">
            <div className="text-[11px] sm:text-xs font-mono text-[#667085] uppercase">Correct</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-sans flex items-center gap-1.5 sm:gap-2">
              {result.score}
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
            </div>
            <div className="text-[10px] sm:text-[11px] text-teal-800 leading-tight">80% mastery baseline</div>
          </div>

          {/* Card 4: Incorrect Answers */}
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-3.5 sm:p-5 shadow-card space-y-1">
            <div className="text-[11px] sm:text-xs font-mono text-[#667085] uppercase">Identified Gaps</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-sans flex items-center gap-1.5 sm:gap-2">
              {incorrectCount}
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
            </div>
            <div className="text-[10px] sm:text-[11px] text-rose-800 leading-tight">Flagged for targeted revision</div>
          </div>
        </div>

        {/* Verified Proficiency Level & Personalized Learning Path Banner */}
        {result.verified_proficiency && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-purple-50/60 border border-indigo-200 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 font-mono">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Verified Algorithmic Proficiency Established
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-indigo-950 font-sans">
                  {result.verified_proficiency.level_title || result.verified_proficiency.title}
                </h3>
                <p className="text-xs text-indigo-900/80 leading-relaxed max-w-2xl">
                  {result.verified_proficiency.description}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <div className="text-3xl font-black text-indigo-600 font-mono">
                  {result.verified_proficiency.proficiency_score || result.verified_proficiency.score}%
                </div>
                <span className="text-[10px] font-mono uppercase bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold">
                  Level {result.verified_proficiency.level_number || 1} Calibrated
                </span>
              </div>
            </div>

            {/* Personalized Learning Path Highlights */}
            {result.learning_path && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                  <span className="text-[#667085] font-semibold flex items-center gap-1 text-[11px]">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Target Strategy
                  </span>
                  <p className="font-semibold text-slate-800 leading-snug">
                    {result.learning_path.focus_strategy}
                  </p>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                  <span className="text-[#667085] font-semibold flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Recommended Daily Target
                  </span>
                  <p className="font-semibold text-slate-800 leading-snug">
                    {result.learning_path.daily_question_target} questions/day ({result.learning_path.daily_practice_target?.pace || 'Optimal pace'})
                  </p>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
                  <span className="text-[#667085] font-semibold flex items-center gap-1 text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    First Recommended Target
                  </span>
                  <p className="font-semibold text-slate-800 leading-snug">
                    {result.learning_path.recommended_next_concepts?.[0]?.concept_name || 'Arrays & Invariants'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Donut */}
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033]">
                Performance Distribution
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">Ratio of correct vs missed questions</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-xs font-mono text-[#667085] pt-2 border-t border-[#E6E9EF]">
              Overall Initial Mastery: <strong className="text-[#5B5CE2]">{result.overall_mastery}%</strong>
            </div>
          </div>

          {/* Concept Mastery Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033]">
                Concept-Wise Baseline Mastery Calibration
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Calibrated prior probability established across DSA syllabus topics
              </p>
            </div>
            <div className="h-56 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val}%`, name === 'mastery' ? 'Calibrated Mastery' : 'Accuracy']}
                    labelFormatter={(label: any, items: any) => items[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="mastery" fill="#5B5CE2" radius={[4, 4, 0, 0]} name="mastery" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Concept Breakdown Table */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E9EF] pb-3">
            <div>
              <h3 className="text-sm font-bold font-sans text-[#172033]">
                Concept-by-Concept Diagnostic Analysis (12 Topics)
              </h3>
              <p className="text-xs text-[#667085]">
                Classification: Strong (&ge; 80%), Developing (50–79%), Needs Improvement (&lt; 50%)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#E6E9EF] text-[#667085] font-mono text-[11px] uppercase">
                  <th className="py-2.5 px-3">Concept</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Diagnostic Result</th>
                  <th className="py-2.5 px-3">Accuracy</th>
                  <th className="py-2.5 px-3">Calibrated Mastery</th>
                  <th className="py-2.5 px-3 text-right">Performance Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E9EF]">
                {(result.concept_breakdown || []).map((c) => {
                  const isStrong = c.status === 'Strong' || c.accuracy >= 80;
                  const isDeveloping = c.status === 'Developing' || (c.accuracy >= 50 && c.accuracy < 80);
                  return (
                    <tr key={c.concept_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#172033]">{c.concept_name}</td>
                      <td className="py-3 px-3 text-[#667085]">{c.category}</td>
                      <td className="py-3 px-3">
                        {c.correct_answers > 0 ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Incorrect
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#172033]">
                        {c.accuracy}%
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#5B5CE2]">
                        {c.calibrated_mastery}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${isStrong ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            isDeveloping ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                          {isStrong ? 'Strong' : isDeveloping ? 'Developing' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Primary Action Button Toolbar */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button */}
            <button
              onClick={() => {
                setReviewFilter('all');
                setReviewIndex(0);
                setMode('review');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all"
            >
              <Eye className="w-4 h-4" />
              View Detailed Answers
            </button>

            {/* Review Incorrect Answers Button */}
            {incorrectCount > 0 && (
              <button
                onClick={() => {
                  setReviewFilter('incorrect');
                  setReviewIndex(0);
                  setMode('review');
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs transition-colors"
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                Review Incorrect Answers ({incorrectCount})
              </button>
            )}

            {/* Retake Diagnostic Test Button */}
            <button
              onClick={handleRetake}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-[#667085] hover:text-[#172033] font-medium text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Diagnostic Test
            </button>
          </div>

          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 4: QUESTION-BY-QUESTION REVIEW SCREEN
  // --------------------------------------------------------------------------
  if (mode === 'review' && result) {
    const allReviews = result.question_reviews || [];
    const filteredReviews = allReviews.filter(q => {
      if (reviewFilter === 'correct') return q.is_correct;
      if (reviewFilter === 'incorrect') return !q.is_correct;
      return true;
    });

    const activeReview = filteredReviews[reviewIndex] || allReviews[0];
    const correctCount = allReviews.filter(q => q.is_correct).length;
    const incorrectCount = allReviews.length - correctCount;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Comprehensive Question Review
            </div>
            <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
              Diagnostic Answer-by-Answer Audit
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Examine answer rationales, identify misconception root causes, and inspect remediation advice.
            </p>
          </div>

          <button
            onClick={() => setMode('summary')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-xs font-medium text-[#172033] shadow-xs shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Score Summary
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 border-b border-[#E6E9EF] pb-3 text-xs font-mono">
          <span className="text-[#667085] mr-2">Filter View:</span>
          <button
            onClick={() => { setReviewFilter('all'); setReviewIndex(0); }}
            className={`px-3 py-1 rounded-lg transition-colors ${reviewFilter === 'all'
                ? 'bg-[#5B5CE2] text-white font-bold'
                : 'bg-slate-100 text-[#667085] hover:bg-slate-200'
              }`}
          >
            All Questions ({allReviews.length})
          </button>
          <button
            onClick={() => { setReviewFilter('correct'); setReviewIndex(0); }}
            className={`px-3 py-1 rounded-lg transition-colors ${reviewFilter === 'correct'
                ? 'bg-teal-600 text-white font-bold'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
          >
            Correct ({correctCount})
          </button>
          <button
            onClick={() => { setReviewFilter('incorrect'); setReviewIndex(0); }}
            className={`px-3 py-1 rounded-lg transition-colors ${reviewFilter === 'incorrect'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
          >
            Incorrect ({incorrectCount})
          </button>
        </div>

        {/* Question Pill Navigator */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 shadow-card space-y-2">
          <div className="text-xs font-mono text-[#667085] flex justify-between">
            <span>Question Navigator:</span>
            <span>Viewing Question {reviewIndex + 1} of {filteredReviews.length}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredReviews.map((q, idx) => {
              const isActive = idx === reviewIndex;
              return (
                <button
                  key={q.question_id}
                  onClick={() => setReviewIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all ${isActive
                      ? 'ring-2 ring-offset-2 ring-[#5B5CE2] shadow-sm'
                      : 'opacity-85 hover:opacity-100'
                    } ${q.is_correct
                      ? 'bg-teal-50 text-teal-700 border border-teal-300'
                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                    }`}
                >
                  <span>Q{idx + 1}</span>
                  {q.is_correct ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Review Card */}
        {activeReview && (
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 sm:p-7 shadow-card space-y-6">
            {/* Top metadata line */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E9EF] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded-md bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
                  {activeReview.concept_name}
                </span>
                <span className="text-xs font-mono text-[#667085]">
                  Tier: {activeReview.difficulty}
                </span>
              </div>

              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-mono text-xs font-bold ${activeReview.is_correct
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                {activeReview.is_correct ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Correct (+80% Baseline)
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    Incorrect (20% Baseline)
                  </>
                )}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-base text-[#172033] font-sans leading-relaxed whitespace-pre-wrap font-medium">
              {activeReview.question_text}
            </div>

            {/* 4 Choices with Detailed Visual Differentiation */}
            <div className="space-y-2.5">
              <div className="text-xs font-mono text-[#667085] uppercase">Response Options:</div>
              {activeReview.options.map((opt) => {
                const isStudentChoice = activeReview.selected_option === opt.id;
                const isCorrectOption = activeReview.correct_option === opt.id;

                let borderBg = 'bg-slate-50/70 border-[#E6E9EF] text-slate-800';
                let badge = null;

                if (isStudentChoice && activeReview.is_correct) {
                  borderBg = 'bg-teal-50/80 border-teal-400 text-teal-950 ring-1 ring-teal-400';
                  badge = (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-600 text-white font-mono text-[10px] font-bold">
                      <Check className="w-3 h-3" /> Your Answer (Correct)
                    </span>
                  );
                } else if (isStudentChoice && !activeReview.is_correct) {
                  borderBg = 'bg-rose-50/80 border-rose-400 text-rose-950 ring-1 ring-rose-400';
                  badge = (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white font-mono text-[10px] font-bold">
                      <XCircle className="w-3 h-3" /> Your Answer (Incorrect)
                    </span>
                  );
                } else if (isCorrectOption && !activeReview.is_correct) {
                  borderBg = 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400';
                  badge = (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 text-white font-mono text-[10px] font-bold">
                      <Check className="w-3 h-3" /> Correct Answer
                    </span>
                  );
                }

                return (
                  <div
                    key={opt.id}
                    className={`w-full p-3.5 rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 ${borderBg}`}
                  >
                    <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${isStudentChoice && activeReview.is_correct ? 'bg-teal-600 text-white' :
                        isStudentChoice && !activeReview.is_correct ? 'bg-rose-600 text-white' :
                          isCorrectOption ? 'bg-emerald-700 text-white' :
                            'bg-white text-[#667085] border border-[#E6E9EF]'
                      }`}>
                      {opt.id}
                    </span>
                    <span className="leading-snug pt-0.5 flex-1">{opt.text}</span>
                    {badge}
                  </div>
                );
              })}
            </div>

            {/* Explanation Block */}
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5 text-xs text-teal-950 font-sans">
              <div className="font-mono font-bold text-teal-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Why Option {activeReview.correct_option} is Correct:
              </div>
              <p className="leading-relaxed">{activeReview.explanation}</p>
            </div>

            {/* Misconception Deep-Dive (If incorrect) */}
            {!activeReview.is_correct && activeReview.misconception && (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs text-amber-950 font-sans">
                <div className="font-mono font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Diagnosed Conceptual Flaw: {activeReview.misconception.name}
                </div>
                <p className="leading-relaxed text-[#172033]">
                  {activeReview.misconception.description}
                </p>
                {activeReview.misconception.remediation_tip && (
                  <div className="pt-1.5 border-t border-amber-200/70 font-mono text-[11px] text-amber-800">
                    <span className="font-bold">Remediation Tip:</span> {activeReview.misconception.remediation_tip}
                  </div>
                )}
              </div>
            )}

            {/* Student Reasoning Note (If provided) */}
            {activeReview.student_reasoning && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-xs font-sans space-y-1">
                <div className="font-mono font-semibold text-[#667085] text-[11px]">
                  Your Submitted Thought Process:
                </div>
                <p className="italic text-[#172033]">&ldquo;{activeReview.student_reasoning}&rdquo;</p>
              </div>
            )}

            {/* Question Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EF]">
              <button
                type="button"
                onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
                disabled={reviewIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-[#667085] text-xs font-medium border border-[#E6E9EF] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Question
              </button>

              <button
                type="button"
                onClick={() => setMode('summary')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172033] text-xs font-medium transition-colors"
              >
                Score Summary
              </button>

              <button
                type="button"
                onClick={() => setReviewIndex(prev => Math.min(filteredReviews.length - 1, prev + 1))}
                disabled={reviewIndex >= filteredReviews.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] disabled:opacity-40 text-white text-xs font-medium shadow-sm transition-all"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW 5: TEST-TAKING VIEW (12 Questions)
  // --------------------------------------------------------------------------
  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isSelected = answers[currentQ?.id]?.option;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium">
          <GraduationCap className="w-3.5 h-3.5" />
          Initial Diagnostic Assessment ({testMode === 'quick' ? 'Quick Mode' : 'Comprehensive Mode'})
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] font-sans tracking-tight">
          DSA Knowledge Baseline Test
        </h2>
        <p className="text-xs sm:text-sm text-[#667085] max-w-xl mx-auto font-sans">
          {testMode === 'quick'
            ? '6 high-signal questions covering core foundational topics for a rapid skill estimate (~5 mins).'
            : '12 calibrated questions spanning the complete DSA syllabus for maximum precision (~12 mins).'}
        </p>

        {/* Mode Selector */}
        <div className="flex items-center justify-center gap-2 pt-1.5">
          <button
            type="button"
            onClick={() => loadQuestions('quick')}
            className={`px-3.5 py-1.5 rounded-xl text-xs transition-all ${testMode === 'quick'
                ? 'bg-[#5B5CE2] text-white shadow-xs font-semibold'
                : 'bg-white border border-[#E6E9EF] text-slate-600 hover:bg-slate-50 font-medium'
              }`}
          >
            Quick Mode (6 Qs)
          </button>
          <button
            type="button"
            onClick={() => loadQuestions('comprehensive')}
            className={`px-3.5 py-1.5 rounded-xl text-xs transition-all ${testMode === 'comprehensive'
                ? 'bg-[#5B5CE2] text-white shadow-xs font-semibold'
                : 'bg-white border border-[#E6E9EF] text-slate-600 hover:bg-slate-50 font-medium'
              }`}
          >
            Comprehensive Mode (12 Qs)
          </button>
        </div>
      </div>

      {/* Progress & Jump Navigator */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 shadow-card space-y-3">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-[#5B5CE2] font-bold">Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-[#667085]">{answeredCount} of {questions.length} Answered</span>
        </div>
        <div className="h-2 w-full bg-[#E6E9EF] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5B5CE2] rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Quick jump pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {questions.map((q, idx) => {
            const isAnswered = Boolean(answers[q.id]?.option);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${isCurrent
                    ? 'ring-2 ring-[#5B5CE2] bg-[#EEF0FD] text-[#5B5CE2]'
                    : isAnswered
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                title={`Jump to Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 sm:p-7 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded-md bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
              {currentQ.concept_id.replace('_', ' ')}
            </span>
            <span className="text-xs font-mono text-[#667085]">
              Single Choice
            </span>
          </div>

          {/* Question Text */}
          <div className="text-sm sm:text-base text-[#172033] font-sans leading-relaxed whitespace-pre-wrap font-medium">
            {currentQ.question_text}
          </div>

          {/* 4 Choices */}
          <div className="space-y-2.5 pt-2">
            {currentQ.options.map((opt) => {
              const selected = answers[currentQ.id]?.option === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-3.5 min-h-[48px] rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 transition-all cursor-pointer ${selected
                      ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/70 border-[#E6E9EF] text-slate-800'
                    }`}
                >
                  <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${selected ? 'bg-[#5B5CE2] text-white' : 'bg-white text-[#667085] border border-[#E6E9EF]'
                    }`}>
                    {opt.id}
                  </span>
                  <span className="leading-snug pt-0.5">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Student Reasoning Input */}
          <div className="space-y-1.5 pt-3 border-t border-[#E6E9EF]">
            <label className="block text-xs font-mono font-semibold text-[#172033]">
              Reasoning / Mental Model (Optional for diagnostic baseline):
            </label>
            <textarea
              rows={2}
              value={answers[currentQ.id]?.reasoning || ''}
              onChange={(e) => handleReasoningChange(e.target.value)}
              placeholder="e.g. I picked B because binary search splits the search interval in half at each step..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-[#172033] text-[16px] sm:text-xs font-sans placeholder-slate-400 focus:outline-none focus:border-[#5B5CE2] focus:bg-white transition-colors"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EF] gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-[#667085] text-xs font-medium border border-[#E6E9EF] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={submitting || answeredCount === 0}
                className="flex items-center gap-1.5 px-6 py-2.5 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                {submitting ? 'Calibrating Baseline...' : 'Complete & View Results'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
