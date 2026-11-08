import React from 'react';
import {
  X,
  Route,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Target,
  BrainCircuit,
  Lock
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface LearningRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
  onStartQuiz: (conceptId?: string) => void;
}

export const LearningRoadmapModal: React.FC<LearningRoadmapModalProps> = ({
  isOpen,
  onClose,
  profile,
  onStartQuiz
}) => {
  if (!isOpen || !profile) return null;

  const concepts = Object.values(profile.concepts || {});
  const masteredCount = concepts.filter((c) => c.mastery_percentage >= 70).length;
  const learningCount = concepts.filter((c) => c.mastery_percentage > 0 && c.mastery_percentage < 70).length;
  const notStartedCount = concepts.filter((c) => c.mastery_percentage === 0).length;

  const milestones = [
    {
      phase: 'Phase 1: Foundations & Linear Structures',
      desc: 'Arrays, Invariants, Stacks, Queues, Linked Lists',
      concepts: ['arrays', 'stacks', 'queues', 'linked_lists'],
      targetLevel: 'Level 1–2'
    },
    {
      phase: 'Phase 2: Algorithmic Paradigms & Analysis',
      desc: 'Time Complexity, Space Complexity, Searching, Sorting, Recursion',
      concepts: ['time_complexity', 'space_complexity', 'searching', 'sorting', 'recursion'],
      targetLevel: 'Level 2–3'
    },
    {
      phase: 'Phase 3: Hierarchical & Non-Linear Structures',
      desc: 'Trees, Binary Trees, Graph Traversal (BFS/DFS)',
      concepts: ['trees', 'binary_trees', 'graphs'],
      targetLevel: 'Level 4–5'
    }
  ];

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
              <Route className="w-4 h-4 text-[#38B7A5]" />
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A8B7CC]">
              Curriculum Path
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading">
            Personalized DSA Learning Roadmap
          </h3>
          <p className="text-xs text-[#A8B7CC] mt-1">
            Track-calibrated progression across all 12 DSA knowledge areas based on your verified performance.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1" data-lenis-prevent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block font-mono">
                {masteredCount}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#A8B7CC]">Mastered (&ge;70%)</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block font-mono">
                {learningCount}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#A8B7CC]">In Progress</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] text-center">
              <span className="text-xl font-bold text-[#243B63] dark:text-[#38B7A5] block font-mono">
                {notStartedCount}
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-[#A8B7CC]">Upcoming</span>
            </div>
          </div>

          {/* Roadmap Milestones */}
          <div className="space-y-4">
            {milestones.map((milestone, idx) => {
              const matchedConcepts = concepts.filter((c) =>
                milestone.concepts.includes(c.concept_id)
              );
              const phaseMastered = matchedConcepts.filter((c) => c.mastery_percentage >= 70).length;
              const phaseTotal = matchedConcepts.length;
              const isPhaseComplete = phaseMastered === phaseTotal && phaseTotal > 0;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#F5F7FB] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB] flex items-center gap-2">
                        <span>{milestone.phase}</span>
                        {isPhaseComplete && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] mt-0.5">
                        {milestone.desc}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#38B7A5] shrink-0">
                      {phaseMastered} / {phaseTotal}
                    </span>
                  </div>

                  {/* Concept Badges in Phase */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {matchedConcepts.map((concept) => (
                      <button
                        key={concept.concept_id}
                        onClick={() => {
                          onClose();
                          onStartQuiz(concept.concept_id);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          concept.mastery_percentage >= 70
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : concept.mastery_percentage > 0
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-[#182A42] border-[#E2E8F0] dark:border-[#243B5B] text-[#64748B] dark:text-[#A8B7CC] hover:border-[#38B7A5]'
                        }`}
                      >
                        <span>{concept.concept_name}</span>
                        <span className="font-mono text-[10px] opacity-80">
                          {Math.round(concept.mastery_percentage)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F7FB] dark:bg-[#14233A] border-t border-[#E2E8F0] dark:border-[#243B5B] flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] dark:text-[#A8B7CC] hover:bg-slate-200 dark:hover:bg-[#20344E] transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onStartQuiz();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#243B63] dark:bg-[#38B7A5] text-white dark:text-[#101B2D] text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E3554] dark:hover:bg-[#2EA191] transition-colors cursor-pointer"
          >
            <span>Practice Next Recommended Topic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

