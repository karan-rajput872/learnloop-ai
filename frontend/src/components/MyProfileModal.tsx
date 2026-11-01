import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Target,
  Clock,
  Code,
  BookOpen,
  Award,
  Edit3,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar
} from 'lucide-react';
import { LearnerProfile, OnboardingProfile, PersonalizedLearningPath } from '../types';
import { api } from '../services/api';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
  onOpenEditWizard: () => void;
  onStartDiagnostic: (mode?: 'quick' | 'comprehensive') => void;
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenEditWizard,
  onStartDiagnostic
}) => {
  const [learningPath, setLearningPath] = useState<PersonalizedLearningPath | null>(null);
  const [loadingPath, setLoadingPath] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingPath(true);
      api.getPersonalizedLearningPath()
        .then(res => setLearningPath(res.learning_path))
        .catch(err => console.warn('Could not load learning path', err))
        .finally(() => setLoadingPath(false));

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onboarding = profile?.onboarding_data || ({} as Partial<OnboardingProfile>);
  const category = profile?.learner_category || onboarding.learner_category || 'General Learner';
  const verifiedLevel = profile?.verified_proficiency_level || 1;
  const verifiedScore = profile?.verified_proficiency_score || 0;
  const selfLevel = onboarding.self_assessed_skill_level || 'Intermediate';

  const levelName = typeof verifiedLevel === 'number'
    ? { 1: 'Level 1 — Beginner', 2: 'Level 2 — Elementary', 3: 'Level 3 — Intermediate', 4: 'Level 4 — Advanced', 5: 'Level 5 — Proficient' }[verifiedLevel] || 'Level 1 — Beginner'
    : String(verifiedLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-[#E6E9EF] shadow-2xl rounded-2xl w-full max-w-2xl my-auto flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#FAFBFD] border-b border-[#E6E9EF] p-5 sm:p-6 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5B5CE2] text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#172033] font-sans">
                  {profile?.name || 'Learner Profile'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
                  {category}
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                {profile?.target_exam || 'Data Structures & Algorithms Exam Preparation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
          
          {/* Dual Skill Level Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Verified Proficiency Level */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Verified Skill Level
                </span>
                <span className="text-xs font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                  {verifiedScore.toFixed(1)}% Score
                </span>
              </div>
              <div className="text-base font-bold text-indigo-950 font-sans">
                {levelName}
              </div>
              <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
                {profile?.diagnostic_completed
                  ? 'Computed from your diagnostic assessment results and misconception evaluation.'
                  : 'Provisional baseline. Complete a diagnostic assessment to verify your skill level.'}
              </p>
            </div>

            {/* Self-Assessed Skill Level */}
            <div className="p-4 rounded-xl bg-slate-50 border border-[#E6E9EF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  Self-Reported Baseline
                </span>
                <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {selfLevel}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Initial Assessment Starting Point
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Recorded during onboarding. Independent from verified proficiency to prevent bias.
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div className="p-4 rounded-xl bg-slate-50 border border-[#E6E9EF] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172033]">
              Personalized Learning Preferences & Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#667085] block">Preferred Language for Explanations:</span>
                <span className="font-semibold text-[#172033] font-mono">
                  {onboarding.preferred_language || 'Python'}
                </span>
              </div>

              <div>
                <span className="text-[#667085] block">Daily Practice Availability:</span>
                <span className="font-semibold text-[#172033] flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#5B5CE2]" />
                  {onboarding.daily_availability || '30–60 minutes'}
                </span>
              </div>

              <div>
                <span className="text-[#667085] block">Target Timeline:</span>
                <span className="font-semibold text-[#172033] flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#5B5CE2]" />
                  {onboarding.target_timeline || 'Within 3 months'}
                </span>
              </div>

              <div>
                <span className="text-[#667085] block">Programming Experience:</span>
                <span className="font-semibold text-[#172033]">
                  {onboarding.programming_experience || 'Intermediate'}
                </span>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[#667085] block">Primary Learning Goals:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(onboarding.primary_goals && onboarding.primary_goals.length > 0
                    ? onboarding.primary_goals
                    : ['Technical interviews', 'DSA fundamentals']
                  ).map(g => (
                    <span key={g} className="px-2 py-0.5 rounded-md bg-white border border-[#E6E9EF] text-slate-700 font-medium">
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[#667085] block">Preferred Learning Styles:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(onboarding.learning_preferences && onboarding.learning_preferences.length > 0
                    ? onboarding.learning_preferences
                    : ['step_by_step', 'visual_diagrams', 'code_demonstrations']
                  ).map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-medium border border-indigo-100">
                      {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Missing Prerequisites Notice from Learning Path */}
          {learningPath && learningPath.missing_prerequisites && learningPath.missing_prerequisites.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Missing Prerequisite Dependencies Detected
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                The concept prerequisite DAG identified foundational topics that require reinforcement:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {learningPath.missing_prerequisites.map(mp => (
                  <span key={mp.prerequisite_id} className="px-2 py-1 rounded bg-white border border-amber-300 font-mono text-[11px] text-amber-900">
                    {mp.prerequisite_name} (needed for {mp.needed_for})
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-[#FAFBFD] border-t border-[#E6E9EF] p-3 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenEditWizard();
            }}
            className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E9EF] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#5B5CE2]" />
            Edit Profile & Goals
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onStartDiagnostic('quick');
              }}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Quick Diagnostic
            </button>
            <button
              onClick={() => {
                onClose();
                onStartDiagnostic('comprehensive');
              }}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              Retake Comprehensive
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

