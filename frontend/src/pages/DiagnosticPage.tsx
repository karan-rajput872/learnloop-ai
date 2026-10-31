import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

interface DiagnosticPageProps {
  onComplete: () => void;
}

export const DiagnosticPage: React.FC<DiagnosticPageProps> = ({ onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { option: string; reasoning: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDiagnosticQuestions()
      .then((data) => setQuestions(data.questions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        option: optionId,
        reasoning: prev[currentQ.id]?.reasoning || ''
      }
    }));
  };

  const handleReasoningChange = (text: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        option: prev[currentQ.id]?.option || '',
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
        selected_option: answers[q.id]?.option || 'A',
        student_reasoning: answers[q.id]?.reasoning || ''
      }));

      await api.submitDiagnostic(submissions);
      onComplete();
    } catch (err) {
      console.error('Failed to submit diagnostic assessment', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm animate-pulse">
        Loading diagnostic assessment battery (12 foundational DSA questions)...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        No diagnostic questions loaded. Please verify backend service.
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const isSelected = answers[currentQ.id]?.option;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono">
          <GraduationCap className="w-3.5 h-3.5" />
          Initial Diagnostic Assessment
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
          DSA Knowledge Baseline Test
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          12 calibrated questions spanning the DSA syllabus. This establishes your persistent concept mastery baseline and reveals prior misconceptions.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-edu-900 rounded-2xl border border-edu-700/80 p-4 shadow-sm space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-purple-400 font-bold">Question {currentIndex + 1} of {questions.length}</span>
          <span className="text-slate-400">{answeredCount} of {questions.length} Answered</span>
        </div>
        <div className="h-2 w-full bg-edu-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-loop-purple to-loop-blue rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-edu-900 rounded-2xl border border-edu-700/80 p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
            Concept: {currentQ.concept_id.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-[11px] font-mono text-slate-400 uppercase">
            Difficulty: {currentQ.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <div className="text-sm sm:text-base text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
          {currentQ.question_text}
        </div>

        {/* 4 Options */}
        <div className="space-y-2.5 pt-2">
          {currentQ.options.map((opt) => {
            const isOptSelected = answers[currentQ.id]?.option === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 transition-all ${
                  isOptSelected
                    ? 'bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-500/10'
                    : 'bg-edu-950 hover:bg-edu-850 border-edu-800 text-slate-300'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                  isOptSelected ? 'bg-purple-600 text-white' : 'bg-edu-900 text-slate-400 border border-edu-800'
                }`}>
                  {opt.id}
                </span>
                <span className="leading-snug pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Reasoning Textarea */}
        <div className="pt-3 border-t border-edu-800 space-y-1.5">
          <label className="block text-xs font-mono text-slate-400 flex items-center justify-between">
            <span>Explain your reasoning (Helps LearnLoop detect misconceptions):</span>
            <span className="text-[10px] text-purple-400">Optional for diagnostic</span>
          </label>
          <textarea
            rows={2}
            value={answers[currentQ.id]?.reasoning || ''}
            onChange={(e) => handleReasoningChange(e.target.value)}
            placeholder="e.g. I picked this because in arrays we multiply index by element size, or..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-edu-950 border border-edu-700 text-slate-200 text-xs font-sans placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-edu-800">
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded-xl bg-edu-800 hover:bg-edu-750 disabled:opacity-30 text-slate-300 text-xs font-mono border border-edu-700 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              Next Question
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={submitting || answeredCount === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-loop-blue hover:from-emerald-400 hover:to-cyan-400 text-edu-950 text-xs font-mono font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Calibrating Baseline...' : 'Submit Diagnostic Assessment'}
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
