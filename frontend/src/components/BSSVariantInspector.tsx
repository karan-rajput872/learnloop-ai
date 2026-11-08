import React, { useState } from 'react';
import {
  Binary,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface BSSVariantInspectorProps {
  profile: LearnerProfile | null;
  onOpenTutor?: (prompt: string) => void;
  onStartQuiz?: (conceptId?: string) => void;
}

interface VariantDetail {
  id: string;
  name: string;
  algorithm: string;
  purpose: string;
  keyChanges: string;
  inputCharacteristics: string;
  timeComplexity: string;
  spaceComplexity: string;
  codeSnippet: string;
  invariantDescription: string;
}

const VARIANTS: VariantDetail[] = [
  {
    id: 'exact_match',
    name: '1. Standard Exact Match',
    algorithm: 'Binary Search (Classic)',
    purpose: 'Locate the exact index of target in a strictly sorted array, returning -1 if absent.',
    keyChanges: 'Exits immediately on nums[mid] == target; standard two-way partition.',
    inputCharacteristics: 'Monotonically sorted, 0-indexed contiguous array.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1) Auxiliary',
    invariantDescription: 'Loop Invariant: If target is in nums, it must reside strictly within nums[left..right].',
    codeSnippet: `def binary_search_exact(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2  # Safe overflow prevention
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1  # Target is provably absent`
  },
  {
    id: 'lower_bound',
    name: '2. Lower Bound (First Occurrence)',
    algorithm: 'Binary Search (Left Partition)',
    purpose: 'Find the first index where nums[i] >= target, handling arrays with duplicate keys.',
    keyChanges: 'Does not terminate on match; continues narrowing right boundary to find earliest index.',
    inputCharacteristics: 'Sorted array containing possible duplicate keys.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1) Auxiliary',
    invariantDescription: 'Loop Invariant: All elements to the left of left are strictly < target.',
    codeSnippet: `def binary_search_lower_bound(nums: list[int], target: int) -> int:
    left, right = 0, len(nums)
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid  # Maintain potential answer at mid
    return left  # First index where nums[i] >= target`
  },
  {
    id: 'rotated_array',
    name: '3. Rotated Sorted Array Search',
    algorithm: 'Binary Search (Inflection Invariant)',
    purpose: 'Search for target in an array that has been rotated around an unknown pivot index.',
    keyChanges: 'Determines whether the left or right half is strictly monotonic before partitioning.',
    inputCharacteristics: 'Distinct integers originally sorted ascending, circularly shifted.',
    timeComplexity: 'O(log N)',
    spaceComplexity: 'O(1) Auxiliary',
    invariantDescription: 'Loop Invariant: At least one half [left..mid] or [mid..right] is guaranteed strictly ordered.',
    codeSnippet: `def search_rotated_array(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        # Check if left half is monotonically sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # Right half is monotonically sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1`
  }
];

export const BSSVariantInspector: React.FC<BSSVariantInspectorProps> = ({
  profile,
  onOpenTutor,
  onStartQuiz
}) => {
  const [activeTab, setActiveTab] = useState<'score' | 'inspector'>('score');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('exact_match');
  const [isCodeExpanded, setIsCodeExpanded] = useState<boolean>(true);

  // Real learner telemetry for searching
  const searchConcept = profile?.concepts?.['searching'];
  const masteryPct = searchConcept?.mastery_percentage || 0;
  const attempts = searchConcept?.questions_attempted || 0;
  const correct = searchConcept?.correct_answers || 0;

  // Level calibration
  const levelCategory =
    masteryPct >= 70 ? 'Expert Invariant Master' :
    masteryPct >= 40 ? 'Developing Invariant Practitioner' :
    'Novice Foundation Learner';

  const selectedVariant = VARIANTS.find(v => v.id === selectedVariantId) || VARIANTS[0];

  return (
    <div className="space-y-4">
      {/* Sub-Header Mode Switcher */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#243B5B] pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#EDF2F8] dark:bg-[#101B2D] rounded-xl text-xs font-mono">
          <button
            onClick={() => setActiveTab('score')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'score'
                ? 'bg-white dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] font-bold shadow-xs'
                : 'text-[#64748B] dark:text-[#A8B7CC] hover:text-[#17243A] dark:hover:text-white'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>BSS Level Score</span>
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'inspector'
                ? 'bg-white dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] font-bold shadow-xs'
                : 'text-[#64748B] dark:text-[#A8B7CC] hover:text-[#17243A] dark:hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Variant Inspector (3 Implementations)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#64748B] dark:text-[#A8B7CC] hidden sm:block">
          Topic: <span className="font-semibold text-[#17243A] dark:text-[#F1F5FB]">Linear & Binary Search</span>
        </div>
      </div>

      {/* VIEW A: BSS LEVEL SCORE & FORMAL INVARIANT CRITERIA */}
      {activeTab === 'score' && (
        <div className="space-y-4 animate-fade-in">
          {/* Top Score Summary Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-[#243B63]/5 to-transparent border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#14233A] border border-teal-500/30 flex items-center justify-center font-mono font-bold text-lg text-[#38B7A5] shadow-xs shrink-0">
                {masteryPct}%
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB] font-sans">
                    Binary Search Space (BSS) Proficiency
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-[#38B7A5] border border-teal-200 dark:border-teal-800">
                    {levelCategory}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] mt-0.5">
                  Calculated from verified test telemetry: {correct} correct out of {attempts} logged attempts.
                </p>
              </div>
            </div>

            <button
              onClick={() => onStartQuiz ? onStartQuiz('searching') : null}
              className="px-3.5 py-1.5 rounded-xl bg-[#243B63] dark:bg-[#38B7A5] text-white dark:text-[#101B2D] text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Practice Search Invariants</span>
            </button>
          </div>

          {/* 4 Invariant Evaluation Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#14233A] border border-[#E2E8F0] dark:border-[#243B5B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>1. Monotonic Precondition</span>
              </div>
              <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed text-[11px]">
                Validates array sortedness (nums[i] &le; nums[i+1]). Without monotonicity, binary halving is mathematically invalid.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#14233A] border border-[#E2E8F0] dark:border-[#243B5B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>2. Invariant Space Maintenance</span>
              </div>
              <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed text-[11px]">
                Search interval [left, right] is guaranteed to contain target if present. Every step strictly halves candidate range.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#14233A] border border-[#E2E8F0] dark:border-[#243B5B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>3. Arithmetic Overflow Guard</span>
              </div>
              <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed text-[11px]">
                Calculates mid as left + (right - left) // 2 instead of (left + right) // 2, preventing 32-bit signed integer overflow.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#14233A] border border-[#E2E8F0] dark:border-[#243B5B] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>4. Termination & Boundary Rigor</span>
              </div>
              <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed text-[11px]">
                Condition left &le; right guarantees termination in &lceil;log2(N)&rceil; steps with zero infinite loop hazards.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: VARIANT INSPECTOR */}
      {activeTab === 'inspector' && (
        <div className="space-y-4 animate-fade-in">
          {/* Variant Selector Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariantId(v.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedVariantId === v.id
                    ? 'bg-teal-50/50 dark:bg-teal-950/30 border-[#38B7A5] ring-1 ring-[#38B7A5]/30'
                    : 'bg-white dark:bg-[#14233A] border-[#E2E8F0] dark:border-[#243B5B] hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="text-xs font-bold text-[#17243A] dark:text-[#F1F5FB] font-sans">
                  {v.name}
                </div>
                <div className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] font-mono mt-0.5 truncate">
                  {v.timeComplexity} ? {v.spaceComplexity}
                </div>
              </button>
            ))}
          </div>

          {/* Variant Metadata Card */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#101B2D]/70 border border-[#E2E8F0] dark:border-[#243B5B] space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#243B5B] pb-2.5">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-[#38B7A5] block">
                  Algorithm Variant
                </span>
                <h4 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB]">
                  {selectedVariant.algorithm}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-[#6C8FF5] font-mono text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
                  Time: {selectedVariant.timeComplexity}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                  Space: {selectedVariant.spaceComplexity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[#64748B] dark:text-[#A8B7CC]">
              <div>
                <strong className="text-[#17243A] dark:text-[#F1F5FB] block mb-0.5">Core Purpose:</strong>
                <p className="leading-relaxed">{selectedVariant.purpose}</p>
              </div>
              <div>
                <strong className="text-[#17243A] dark:text-[#F1F5FB] block mb-0.5">Partition Mechanism:</strong>
                <p className="leading-relaxed">{selectedVariant.keyChanges}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 text-[11px] text-teal-900 dark:text-teal-200 font-mono">
              <strong>Formal Invariant:</strong> {selectedVariant.invariantDescription}
            </div>
          </div>

          {/* Expandable Code Implementation Panel */}
          <div className="rounded-xl border border-[#E2E8F0] dark:border-[#243B5B] overflow-hidden bg-[#0F172A] text-slate-200">
            <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#38B7A5]" />
                <span className="text-slate-300 font-bold">{selectedVariant.id}.py</span>
                <span className="text-slate-500 text-[10px]">(Python 3)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onOpenTutor
                      ? onOpenTutor(`Can you explain the loop invariant and edge cases for this variant:\n\`\`\`python\n${selectedVariant.codeSnippet}\n\`\`\``)
                      : null
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#243B63] hover:bg-[#1E3554] text-[#38B7A5] text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Ask AI Tutor</span>
                </button>
                <button
                  onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                  className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={isCodeExpanded ? 'Collapse Code' : 'Expand Code'}
                >
                  {isCodeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isCodeExpanded && (
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-all">
                <code>{selectedVariant.codeSnippet}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

