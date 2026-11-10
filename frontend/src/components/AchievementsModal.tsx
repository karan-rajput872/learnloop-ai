import React from 'react';
import {
  X,
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Lock,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  if (!isOpen || !profile) return null;

  const concepts = Object.values(profile.concepts || {});
  const masteredConcepts = concepts.filter((c) => c.mastery_percentage >= 70);
  const streak = typeof profile.streak_days === 'number' ? profile.streak_days : 0;
  const completedDiagnostic = Boolean(profile.diagnostic_completed);

  const badges = [
    {
      id: 'diagnostic_done',
      title: 'Knowledge Calibrated',
      desc: 'Completed initial adaptive diagnostic calibration across 12 DSA concepts.',
      icon: GraduationCap,
      unlocked: completedDiagnostic,
      category: 'Milestone'
    },
    {
      id: 'first_mastery',
      title: 'Concept Master',
      desc: 'Achieved 70%+ verified mastery in at least one DSA core domain.',
      icon: Award,
      unlocked: masteredConcepts.length >= 1,
      category: 'Mastery'
    },
    {
      id: 'three_mastered',
      title: 'Tri-Domain Champion',
      desc: 'Mastered 3 or more concepts with 0 unaddressed misconceptions.',
      icon: Sparkles,
      unlocked: masteredConcepts.length >= 3,
      category: 'Mastery'
    },
    {
      id: 'streak_active',
      title: 'Consistent Learner',
      desc: 'Maintained an active continuous learning streak.',
      icon: Flame,
      unlocked: streak >= 1,
      category: 'Habit'
    },
    {
      id: 'deep_reasoning',
      title: 'Socratic Thinker',
      desc: 'Explored loop invariants and complexity bounds with the AI Tutor.',
      icon: BrainCircuit,
      unlocked: Boolean(profile.onboarding_completed),
      category: 'Exploration'
    },
    {
      id: 'grandmaster',
      title: 'Algorithm Virtuoso',
      desc: 'Mastered all 12 DSA syllabus concepts with Level 5 verified proficiency.',
      icon: Zap,
      unlocked: masteredConcepts.length === 12,
      category: 'Prestige'
    }
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col bg-white dark:bg-[#182A42] text-[#17243A] dark:text-[#F1F5FB] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-[#243B5B] overflow-hidden">
        {/* Header */}
        <div className="bg-[#243B63] dark:bg-[#14233A] px-5 sm:px-6 py-5 text-white relative shrink-0 border-b border-[#E2E8F0] dark:border-[#243B5B]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-white/15 rounded-lg">
              <Award className="w-4 h-4 text-[#38B7A5]" />
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A8B7CC]">
              Learner Accolades
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading">
            Achievements & Pedagogical Badges
          </h3>
          <p className="text-xs text-[#A8B7CC] mt-1">
            Earn badges as you calibrate, practice, conquer misconceptions, and maintain consistency.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1" data-lenis-prevent>
          {/* Top Tally */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F7FB] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB] block">
                  {unlockedCount} of {badges.length} Badges Unlocked
                </span>
                <span className="text-xs text-[#64748B] dark:text-[#A8B7CC]">
                  {badges.length - unlockedCount} remaining to achieve complete mastery
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold border border-amber-200 dark:border-amber-800">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{streak}d Streak</span>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${badge.unlocked
                      ? 'bg-white dark:bg-[#182A42] border-[#E2E8F0] dark:border-[#243B5B] shadow-xs'
                      : 'bg-slate-50 dark:bg-[#20344E]/50 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badge.unlocked
                        ? 'bg-[#38B7A5]/15 text-[#38B7A5] border border-[#38B7A5]/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}
                  >
                    {badge.unlocked ? <Icon className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="text-xs font-bold text-[#17243A] dark:text-[#F1F5FB] truncate">
                        {badge.title}
                      </h5>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#A8B7CC]">
                        {badge.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] dark:text-[#A8B7CC] mt-1 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F7FB] dark:bg-[#14233A] border-t border-[#E2E8F0] dark:border-[#243B5B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#243B63] dark:bg-[#38B7A5] text-white dark:text-[#101B2D] text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E3554] dark:hover:bg-[#2EA191] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

