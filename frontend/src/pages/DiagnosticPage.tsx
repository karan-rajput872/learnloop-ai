import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, HelpCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface DiagnosticPageProps {
  onComplete: () => void;
}

export const DiagnosticPage: React.FC<DiagnosticPageProps> = ({ onComplete }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { option: string; reasoning: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuestions = () => {
    setLoading(true);
    api.getDiagnosticQuestions()
      .then((data) => setQuestions(data.questions))
      .catch((err) => console.error('Failed to load diagnostic', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();
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
          Could not load the 12 diagnostic onboarding questions. The backend server on Render may still be spinning up from cold sleep.
        </p>
        <button
          onClick={loadQuestions}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Loading Questions
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const isSelected = answers[currentQ.id]?.option;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium">
          <GraduationCap className="w-3.5 h-3.5" />
          Initial Diagnostic Assessment
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] font-sans tracking-tight">
          DSA Knowledge Baseline Test
        </h2>
        <p className="text-xs sm:text-sm text-[#667085] max-w-xl mx-auto font-sans">
          12 calibrated questions spanning the core DSA syllabus. This establishes your persistent concept mastery baseline and reveals prior misconceptions.
        </p>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-4 shadow-card space-y-2">
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
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 sm:p-7 shadow-card space-y-5">
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
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-sans flex items-start gap-3 transition-all ${selected
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
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-[#172033] text-xs font-sans placeholder-slate-400 focus:outline-none focus:border-[#5B5CE2] focus:bg-white transition-colors"
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E6E9EF]">
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-[#667085] text-xs font-medium border border-[#E6E9EF] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-medium shadow-sm transition-all"
            >
              Next Question
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={submitting || answeredCount === 0}
              className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-medium shadow-sm transition-all"
            >
              {submitting ? 'Calibrating Baseline...' : 'Complete & Generate Profile'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
