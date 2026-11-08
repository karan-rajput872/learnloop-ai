import React from 'react';
import {
  X,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Code2
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface SkillsCareerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
  onStartQuiz: () => void;
}

export const SkillsCareerModal: React.FC<SkillsCareerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onStartQuiz
}) => {
  if (!isOpen || !profile) return null;

  const concepts = Object.values(profile.concepts || {});
  const overallMastery = Math.round(profile.overall_mastery || 0);

  const careerTracks = [
    {
      title: 'FAANG / Tier-1 Tech Coding Interviews',
      role: 'Software Development Engineer (SDE I / II)',
      requiredConcepts: ['Binary Search', 'Sliding Window', 'Binary Trees', 'Graphs BFS/DFS'],
      readiness: Math.min(100, Math.round(overallMastery * 1.1)),
      level: overallMastery >= 75 ? 'Interview Ready' : overallMastery >= 40 ? 'Advancing' : 'Foundations'
    },
    {
      title: 'Systems & Backend Engineering',
      role: 'Backend Platform Engineer',
      requiredConcepts: ['Stacks & Queues', 'Time & Space Complexity', 'Cache Invariants'],
      readiness: Math.min(100, Math.round(overallMastery * 1.05)),
      level: overallMastery >= 70 ? 'Interview Ready' : overallMastery >= 35 ? 'Advancing' : 'Foundations'
    },
    {
      title: 'Algorithm Optimization & Core Infrastructure',
      role: 'High Performance Computing / Core Infrastructure',
      requiredConcepts: ['Sorting Invariants', 'Recursion & Stack Frames', 'Graph Topologies'],
      readiness: Math.min(100, Math.round(overallMastery * 0.95)),
      level: overallMastery >= 80 ? 'Interview Ready' : overallMastery >= 45 ? 'Advancing' : 'Foundations'
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
              <Briefcase className="w-4 h-4 text-[#38B7A5]" />
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A8B7CC]">
              Career Readiness Telemetry
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading">
            Skills & Technical Career Benchmarks
          </h3>
          <p className="text-xs text-[#A8B7CC] mt-1">
            Benchmarked against competitive tech hiring rubrics and algorithmic problem patterns.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1" data-lenis-prevent>
          {/* Top Score Callout */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#243B63]/10 to-[#38B7A5]/10 border border-[#38B7A5]/30 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#A8B7CC]">
                Aggregate Interview Readiness Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-[#243B63] dark:text-[#38B7A5]">
                  {overallMastery}%
                </span>
                <span className="text-xs text-[#64748B] dark:text-[#A8B7CC]">
                  across {concepts.length} verified DSA competencies
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#38B7A5]/20 text-[#38B7A5] font-bold">
                {profile.verified_proficiency_level || 'Level 1'}
              </span>
            </div>
          </div>

          {/* Industry Tracks */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#A8B7CC] font-mono">
              Target Career Role Profiles
            </h4>

            {careerTracks.map((track, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#F5F7FB] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB]">
                      {track.title}
                    </h5>
                    <span className="text-xs text-[#64748B] dark:text-[#A8B7CC]">
                      Target Role: {track.role}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 font-mono ${
                      track.level === 'Interview Ready'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : track.level === 'Advancing'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-[#A8B7CC]'
                    }`}
                  >
                    {track.level}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#A8B7CC]">
                    <span>Readiness Metric</span>
                    <span className="font-mono font-bold">{track.readiness}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#243B63] to-[#38B7A5] rounded-full transition-all duration-500"
                      style={{ width: `${track.readiness}%` }}
                    />
                  </div>
                </div>

                {/* Required Competencies */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {track.requiredConcepts.map((item, cIdx) => (
                    <span
                      key={cIdx}
                      className="text-[11px] px-2 py-0.5 bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] rounded-md text-[#64748B] dark:text-[#A8B7CC]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
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
            <span>Level Up Next Concept</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

