import React, { useState, useEffect } from 'react';
import { Question, EvaluationResult, AgentToolLog } from '../types';
import { api } from '../services/api';
import { AgentTimeline } from '../components/AgentTimeline';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  BrainCircuit,
  Calendar
} from 'lucide-react';

interface AdaptiveQuizPageProps {
  initialConceptId?: string | null;
  onRefreshProfile: () => void;
}

export const AdaptiveQuizPage: React.FC<AdaptiveQuizPageProps> = ({
  initialConceptId,
  onRefreshProfile
}) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [targetConcept, setTargetConcept] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('novice');
  const [questionRationale, setQuestionRationale] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [initTools, setInitTools] = useState<AgentToolLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchNextQuestion = async (conceptId?: string) => {
    setLoading(true);
    setEvalResult(null);
    setSelectedOption('');
    setReasoning('');

    try {
      const data = await api.getAdaptiveQuestion(conceptId || initialConceptId || undefined);
      setQuestion(data.question);
      setTargetConcept(data.target_concept);
      setDifficulty(data.calibrated_difficulty);
      setQuestionRationale(data.decision_rationale || '');
      setInitTools(data.tools_executed || []);
    } catch (err) {
      console.error('Failed to load adaptive question', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion(initialConceptId || undefined);
  }, [initialConceptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !selectedOption) return;

    setSubmitting(true);
    try {
      const result = await api.submitAnswer(
        question.id,
        question.concept_id,
        selectedOption,
        reasoning,
        confidence
      );
      setEvalResult(result);
      onRefreshProfile();
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card animate-pulse space-y-3">
        <BrainCircuit className="w-8 h-8 text-[#5B5CE2] animate-spin mx-auto" />
        <div>Agent analyzing learner profile and calibrating adaptive question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-xl mx-auto p-10 text-center text-[#667085] font-sans text-sm bg-white rounded-2xl border border-[#E6E9EF] shadow-card space-y-4 animate-fade-in">
        <BrainCircuit className="w-10 h-10 text-[#5B5CE2] mx-auto" />
        <div className="text-[#172033] font-bold text-base">Adaptive Practice Pending</div>
        <p className="text-xs text-[#667085] leading-relaxed">
          The agent could not calibrate a question. The backend server on Render may still be spinning up from cold sleep.
        </p>
        <button
          onClick={() => fetchNextQuestion()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Generating Question
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            Dynamic Adaptive Evaluation
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            Adaptive Concept Practice
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-sans">
            Calibrated questions targeting boundary conditions and diagnosing cognitive flaws through student reasoning.
          </p>
        </div>

        <button
          onClick={() => fetchNextQuestion()}
          disabled={loading || submitting}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-[#667085] hover:text-[#172033] text-xs font-medium transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate Question
        </button>
      </div>

      {/* Concept & Difficulty Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E6E9EF] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold uppercase px-3 py-1 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
            {question.concept_id.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-50 text-[#667085] border border-[#E6E9EF] uppercase">
            Calibrated: {difficulty}
          </span>
        </div>
      </div>

      {/* Agent Question Calibration Rationale */}
      {questionRationale && (
        <div className="p-3.5 rounded-xl bg-[#EEF0FD]/70 border border-[#C7D2FE] text-xs font-sans text-[#172033] flex items-start gap-2.5 shadow-xs">
          <Sparkles className="w-4 h-4 text-[#5B5CE2] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[#5B5CE2] font-mono uppercase tracking-wider text-[11px] block">
              Agent Calibration Decision:
            </span>
            <p className="text-slate-700 leading-relaxed">
              {questionRationale}
            </p>
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 sm:p-7 shadow-card space-y-5">

        {/* Question Statement */}
        <div className="text-sm sm:text-base text-[#172033] font-sans leading-relaxed whitespace-pre-wrap font-medium">
          {question.question_text}
        </div>

        {/* 4 Choices */}
        <div className="space-y-2.5 pt-2">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            let optStyle = 'bg-slate-50/70 hover:bg-slate-100/70 border-[#E6E9EF] text-slate-800';

            if (evalResult) {
              if (opt.id === evalResult.correct_option) {
                optStyle = 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20';
              } else if (isSelected && !evalResult.is_correct) {
                optStyle = 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20';
              }
            } else if (isSelected) {
              optStyle = 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] shadow-xs';
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !evalResult && setSelectedOption(opt.id)}
                disabled={Boolean(evalResult)}
                className={`w-full text-left p-3.5 min-h-[48px] rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 transition-all cursor-pointer ${optStyle}`}
              >
                <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-[#5B5CE2] text-white' : 'bg-white text-[#667085] border border-[#E6E9EF]'
                }`}>
                  {opt.id}
                </span>
                <span className="leading-snug pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Input Form for Reasoning & Confidence */}
        {!evalResult && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-[#E6E9EF]">
            {/* Student Reasoning Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-semibold text-[#172033]">
                Explain your reasoning alongside your answer (Mandatory for misconception detection):
              </label>
              <textarea
                rows={3}
                required
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="e.g. I chose option A because the top pointer moves towards index C-1, and if we pop an empty stack it triggers an underflow..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-[#172033] text-[16px] sm:text-xs font-sans placeholder-slate-400 focus:outline-none focus:border-[#5B5CE2] focus:bg-white transition-colors"
              />
            </div>

            {/* Confidence Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-mono text-[#667085]">
                <span>Confidence:</span>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs uppercase font-mono font-semibold transition-colors border cursor-pointer ${
                      confidence === level
                        ? 'bg-[#EEF0FD] text-[#5B5CE2] border-[#C7D2FE]'
                        : 'bg-white text-[#667085] border-[#E6E9EF] hover:text-[#172033]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedOption || !reasoning.trim()}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] disabled:opacity-40 text-white font-medium text-xs shadow-sm transition-all flex items-center justify-center cursor-pointer"
              >
                {submitting ? 'Agent Evaluating Reasoning...' : 'Submit & Analyze Reasoning'}
              </button>
            </div>
          </form>
        )}

        {/* Evaluation Results Card */}
        {evalResult && (
          <div className="space-y-4 pt-4 border-t border-[#E6E9EF] animate-fade-in">
            {/* Verdict Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              evalResult.is_correct
                ? 'bg-teal-50 border-teal-200 text-teal-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              {evalResult.is_correct ? (
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-sans font-bold text-sm">
                    {evalResult.is_correct ? 'Correct Answer! Mastery Increased' : 'Incorrect. Misconception Identified'}
                  </h4>
                  <span className="font-mono font-bold text-xs">
                    {evalResult.score_delta > 0 ? `+${evalResult.score_delta}%` : `${evalResult.score_delta}%`} (New: {evalResult.new_mastery}%)
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90 font-sans">
                  {evalResult.agent_feedback}
                </p>
              </div>
            </div>

            {/* Agent Decision Rationale & Learner Model Mutation Card */}
            {evalResult.decision_rationale && (
              <div className="p-4 rounded-xl bg-[#EEF0FD]/60 border border-[#C7D2FE] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#5B5CE2] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#5B5CE2]" />
                    Agent Decision Rationale & Pedagogical Reflection
                  </span>
                  {evalResult.classification && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-[#C7D2FE] text-[#5B5CE2]">
                      Reasoning: {evalResult.classification.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {evalResult.decision_rationale}
                </p>
              </div>
            )}

            {/* Misconception Remediation Card if Incorrect */}
            {evalResult.detected_misconception && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Detected Flaw: {evalResult.detected_misconception.name}
                </div>
                <p className="text-xs text-amber-800 font-sans leading-relaxed">
                  <strong>Why it happens:</strong> {evalResult.detected_misconception.description}
                </p>
                <div className="p-3 rounded-lg bg-white border border-amber-200 text-xs text-amber-950 font-mono">
                  <strong>Remediation Strategy:</strong> {evalResult.detected_misconception.remediation_tip}
                </div>
              </div>
            )}

            {/* Next Recommended Concept & Spaced Repetition Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-[#E6E9EF] flex items-center justify-between">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-[#5B5CE2]" />
                  Next Target Concept:
                </span>
                <span className="font-bold text-[#172033] uppercase">
                  {evalResult.next_recommended_concept}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-[#E6E9EF] flex items-center justify-between">
                <span className="text-[#667085] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Spaced Revision Due:
                </span>
                <span className="font-bold text-teal-700">
                  {evalResult.next_revision_date}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => fetchNextQuestion(evalResult.next_recommended_concept)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                Proceed to Next Adaptive Question
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Visible Agent Activity Timeline */}
      <AgentTimeline
        tools={evalResult ? evalResult.tools_executed : initTools}
        title={evalResult ? "Agent Evaluation & Model Mutation Timeline" : "Agent Question Generation Trace"}
      />

    </div>
  );
};
