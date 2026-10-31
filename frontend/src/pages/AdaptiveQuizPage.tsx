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
      <div className="max-w-3xl mx-auto p-12 text-center text-slate-400 font-mono text-sm bg-edu-900 rounded-2xl border border-edu-800 animate-pulse space-y-3">
        <BrainCircuit className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
        <div>Agent analyzing learner profile and calibrating adaptive question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center text-slate-400 font-mono text-sm bg-edu-900 rounded-2xl border border-edu-800 space-y-4 animate-fade-in">
        <BrainCircuit className="w-10 h-10 text-purple-400 mx-auto" />
        <div className="text-white font-bold text-base">Adaptive Practice Pending</div>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          The agent could not calibrate a question. The backend server on Render may still be spinning up from cold sleep.
        </p>
        <button
          onClick={() => fetchNextQuestion()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-loop-purple hover:bg-purple-600 text-white font-bold text-xs transition-all shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Generating Question
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
            {question.concept_id.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-edu-850 text-slate-300 border border-edu-700 uppercase">
            Calibrated: {difficulty}
          </span>
        </div>

        <button
          onClick={() => fetchNextQuestion()}
          disabled={loading || submitting}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-purple-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate Question
        </button>
      </div>

      {/* Agent Question Calibration Rationale */}
      {questionRationale && (
        <div className="p-3.5 rounded-2xl bg-purple-950/70 border border-purple-850 text-xs font-mono text-purple-200 flex items-start gap-2.5 shadow-md">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              Agent Calibration Decision:
            </span>
            <p className="text-slate-300 font-sans leading-relaxed">
              {questionRationale}
            </p>
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="bg-edu-900 rounded-2xl border border-edu-700/80 p-6 sm:p-7 shadow-xl space-y-5">

        {/* Question Statement */}
        <div className="text-sm sm:text-base text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
          {question.question_text}
        </div>

        {/* 4 Choices */}
        <div className="space-y-2.5 pt-2">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            let optStyle = 'bg-edu-950 hover:bg-edu-850 border-edu-800 text-slate-300';

            if (evalResult) {
              if (opt.id === evalResult.correct_option) {
                optStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/20';
              } else if (isSelected && !evalResult.is_correct) {
                optStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/20';
              }
            } else if (isSelected) {
              optStyle = 'bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-500/10';
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !evalResult && setSelectedOption(opt.id)}
                disabled={Boolean(evalResult)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 transition-all ${optStyle}`}
              >
                <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-edu-900 text-slate-400 border border-edu-800'
                  }`}>
                  {opt.id}
                </span>
                <span className="leading-snug pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Input Form for Reasoning & Confidence (Shown before evaluation) */}
        {!evalResult && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-edu-800">
            {/* Student Reasoning Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-semibold text-slate-300">
                Explain your reasoning alongside your answer (Mandatory for misconception detection):
              </label>
              <textarea
                rows={3}
                required
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                placeholder="e.g. I chose option A because the top pointer moves towards index C-1, and if we pop an empty stack it triggers an underflow..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-edu-950 border border-edu-700 text-slate-200 text-xs font-sans placeholder-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Confidence Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Confidence:</span>
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`px-2.5 py-1 rounded text-[11px] uppercase font-mono font-semibold transition-colors border ${confidence === level
                        ? 'bg-purple-950 text-purple-300 border-purple-600'
                        : 'bg-edu-950 text-slate-400 border-edu-800 hover:text-slate-200'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedOption || !reasoning.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-loop-purple to-loop-indigo hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 transition-all"
              >
                {submitting ? 'Agent Evaluating Reasoning...' : 'Submit & Analyze Reasoning'}
              </button>
            </div>
          </form>
        )}

        {/* Evaluation Results Card (Shown after evaluation) */}
        {evalResult && (
          <div className="space-y-4 pt-4 border-t border-edu-800 animate-fade-in">
            {/* Verdict Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${evalResult.is_correct
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                : 'bg-rose-950/80 border-rose-700/80 text-rose-200'
              }`}>
              {evalResult.is_correct ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono font-bold text-sm">
                    {evalResult.is_correct ? 'Correct Answer! Mastery Increased' : 'Incorrect. Misconception Identified'}
                  </h4>
                  <span className="font-mono font-extrabold text-xs">
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-edu-950 to-edu-950 border border-purple-700/60 space-y-2 shadow-md">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Agent Decision Rationale & Pedagogical Reflection
                  </span>
                  {evalResult.classification && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-edu-900 border border-purple-800 text-purple-300">
                      Reasoning: {evalResult.classification.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {evalResult.decision_rationale}
                </p>
              </div>
            )}

            {/* Misconception Remediation Card if Incorrect */}
            {evalResult.detected_misconception && (
              <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-800/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Detected Flaw: {evalResult.detected_misconception.name}
                </div>
                <p className="text-xs text-amber-200 font-sans leading-relaxed">
                  <strong>Why it happens:</strong> {evalResult.detected_misconception.description}
                </p>
                <div className="p-3 rounded-lg bg-edu-950/80 border border-amber-900/60 text-xs text-amber-100 font-mono">
                  <strong>Remediation Strategy:</strong> {evalResult.detected_misconception.remediation_tip}
                </div>
              </div>
            )}

            {/* Next Recommended Concept & Spaced Repetition Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-edu-950 border border-edu-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  Next Target Concept:
                </span>
                <span className="font-bold text-purple-300 uppercase">
                  {evalResult.next_recommended_concept}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-edu-950 border border-edu-800 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-loop-blue" />
                  Spaced Revision Due:
                </span>
                <span className="font-bold text-loop-blue">
                  {evalResult.next_revision_date}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => fetchNextQuestion(evalResult.next_recommended_concept)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-loop-purple to-loop-indigo hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
              >
                Proceed to Next Adaptive Question
                <ArrowRight className="w-4 h-4" />
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
