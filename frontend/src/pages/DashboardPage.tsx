import React from 'react';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Network,
  Clock,
  BookOpen,
  Award,
  Target,
  User,
  Zap,
  Check,
  Flame,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { LearnerProfile, RevisionTask, OnboardingProfile } from '../types';
import { MasteryGauge } from '../components/MasteryGauge';
import { BentoCard } from '../components/BentoCard';
import { TypewriterText } from '../components/TypewriterText';
import { CodeWindow } from '../components/CodeWindow';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  profile: LearnerProfile;
  revisionTasks: RevisionTask[];
  onStartDiagnostic: () => void;
  onStartQuiz: () => void;
  onViewGraph: () => void;
  onOpenRevision: () => void;
  onOpenProfile?: () => void;
  onOpenOnboarding?: () => void;
  onOpenTutor?: (initialPrompt?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  revisionTasks,
  onStartDiagnostic,
  onStartQuiz,
  onViewGraph,
  onOpenRevision,
  onOpenProfile,
  onOpenOnboarding,
  onOpenTutor
}) => {
  const { user, resetDemoSession } = useAuth();
  const conceptsList = Object.values(profile.concepts || {});
  const completedDiagnostic = profile.diagnostic_completed;

  // Compute weakest concepts
  const sortedConcepts = [...conceptsList].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
  const weakestConcepts = sortedConcepts.slice(0, 3);
  const masteredConcepts = conceptsList.filter(c => c.mastery_percentage >= 70);

  const pendingRevisions = revisionTasks.filter(t => t.status === 'pending');

  const onboarding: Partial<OnboardingProfile> = profile.onboarding_data || {};
  const category = profile.learner_category || onboarding.learner_category || 'General Learner';
  const verifiedLevel = profile.verified_proficiency_level || 1;
  const verifiedScore = profile.verified_proficiency_score || 0;
  const learningPath = profile.learning_path;

  const levelName = typeof verifiedLevel === 'number'
    ? { 1: 'Level 1 — Beginner', 2: 'Level 2 — Elementary', 3: 'Level 3 — Intermediate', 4: 'Level 4 — Advanced', 5: 'Level 5 — Proficient' }[verifiedLevel] || 'Level 1 — Beginner'
    : String(verifiedLevel);

  // Dynamic Typewriter Phrases for the Hero Card
  const heroPhrases = [
    `Ready to master ${weakestConcepts[0]?.concept_name || 'Binary Search Invariants'}?`,
    'Your persistent mastery profile is active.',
    `Streak: ${profile.streak_days || 1} day streak active 🔥`,
    'Socratic AI Tutor is ready for question breakdown.'
  ];

  // Practical 3-task Daily Action Plan derived from real telemetry
  interface ActionPlanTask {
    id: string;
    name: string;
    estTime: string;
    priority: 'High' | 'Medium' | 'Low';
    completed: boolean;
    actionLabel: string;
    onExecute: () => void;
    icon: React.ComponentType<{ className?: string }>;
  }

  const dailyTasks: ActionPlanTask[] = [];

  if (!completedDiagnostic) {
    dailyTasks.push({
      id: 'diagnostic_task',
      name: 'Calibrate Knowledge Baseline (Diagnostic)',
      estTime: '8 mins',
      priority: 'High',
      completed: false,
      actionLabel: 'Take Diagnostic',
      onExecute: onStartDiagnostic,
      icon: GraduationCap
    });
  }

  if (pendingRevisions.length > 0) {
    dailyTasks.push({
      id: 'revision_task',
      name: `Spaced Revision: ${pendingRevisions[0].concept_name}`,
      estTime: '10 mins',
      priority: pendingRevisions[0].urgency === 'high' ? 'High' : 'Medium',
      completed: false,
      actionLabel: 'Review Now',
      onExecute: onOpenRevision,
      icon: Calendar
    });
  }

  dailyTasks.push({
    id: 'quiz_task',
    name: `Adaptive Practice: ${weakestConcepts[0]?.concept_name || 'Arrays & Invariants'}`,
    estTime: '15 mins',
    priority: 'High',
    completed: false,
    actionLabel: 'Start Practice',
    onExecute: onStartQuiz,
    icon: BrainCircuit
  });

  if (dailyTasks.length < 3) {
    dailyTasks.push({
      id: 'tutor_task',
      name: `Socratic Dialogue: Inspect ${weakestConcepts[1]?.concept_name || 'Algorithm Invariants'}`,
      estTime: '12 mins',
      priority: 'Medium',
      completed: false,
      actionLabel: 'Open Tutor',
      onExecute: () => onOpenTutor ? onOpenTutor('Explain key invariants for ' + (weakestConcepts[1]?.concept_name || 'Algorithms')) : onStartQuiz(),
      icon: MessageSquare
    });
  }

  const sampleAlgorithmCode = `def binary_search_invariant(nums: list[int], target: int) -> int:
    # Loop Invariant: target in nums[left..right] if present
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1  # Target strictly absent`;

  return (
    <div className="space-y-6 animate-fade-in relative z-10 pb-16 lg:pb-6">

      {/* Live Demo Explorer Notification Banner */}
      {user?.is_demo && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#5B5CE2]/10 to-purple-500/10 border border-amber-500/30 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                Live Demo Explorer
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                Interactive Pedagogical Sandbox Active
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-2xl">
              You are exploring LearnLoop AI with sample student progress. You can take diagnostic assessments, launch adaptive quizzes, inspect agent tools, chat with the Socratic AI Tutor, and review class-wide teacher analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Onboarding Wizard
              </button>
            )}
            <button
              onClick={async () => {
                await resetDemoSession();
                window.location.reload();
              }}
              className="px-3.5 py-2 rounded-full bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Reset Demo State
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BENTO GRID: MODULAR PRODUCT COMMAND CENTER                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">

        {/* 1. DOMINANT HERO BENTO CARD (Wide, col-span-2) */}
        <BentoCard
          variant="hero"
          glowBorder="teal"
          className="relative bg-gradient-to-br from-white via-white to-teal-50/30 dark:from-[#101B2D] dark:via-[#101B2D] dark:to-[#0B2527]"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38B7A5]/10 border border-[#38B7A5]/30 text-[#38B7A5] text-xs font-mono font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Continuous Mastery Engine
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  <User className="w-3 h-3" />
                  {category}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/60">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{profile.streak_days || 1}d Streak</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-heading tracking-tight text-[#172033] dark:text-white">
                Welcome back, <span className="text-[#38B7A5]">{profile.name}</span>
              </h1>
              <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 font-medium h-7 flex items-center">
                <TypewriterText phrases={heroPhrases} />
              </div>
              <p className="text-xs text-[#667085] dark:text-slate-400 font-sans leading-relaxed line-clamp-2">
                LearnLoop AI adapts your exam preparation in real time by identifying conceptual flaws and guiding you toward proven mastery.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              {!completedDiagnostic ? (
                <button
                  onClick={onStartDiagnostic}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#38B7A5] hover:bg-[#2EA191] text-white font-bold text-xs shadow-md shadow-[#38B7A5]/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Take Diagnostic Baseline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onStartQuiz}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#38B7A5] hover:bg-[#2EA191] text-white font-bold text-xs shadow-md shadow-[#38B7A5]/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Launch Adaptive Practice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {onOpenProfile && (
                <button
                  onClick={onOpenProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-[#172033] dark:text-white text-xs font-semibold border border-[#E6E9EF] dark:border-white/10 transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-[#5B5CE2] dark:text-[#38B7A5]" />
                  <span>Profile Telemetry</span>
                </button>
              )}

              <button
                onClick={onViewGraph}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#172033] dark:text-white text-xs font-semibold border border-[#E6E9EF] dark:border-white/10 transition-colors cursor-pointer"
              >
                <Network className="w-3.5 h-3.5 text-[#5B5CE2] dark:text-[#38B7A5]" />
                <span>Syllabus Graph</span>
              </button>
            </div>
          </div>
        </BentoCard>

        {/* 2. AI SOCRATIC COMPANION BENTO CARD (Wide, col-span-2) */}
        <BentoCard
          variant="wide"
          glowBorder="indigo"
          title="Socratic AI Tutor"
          subtitle="Explore subtle edge cases and algorithms through guided inquiry"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-[#5B5CE2] dark:text-indigo-300 text-[11px] font-mono font-semibold border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 text-[#5B5CE2]" />
              Reasoning Engine Active
            </span>
          }
          action={
            <button
              onClick={() => onOpenTutor ? onOpenTutor() : onStartQuiz()}
              className="text-xs font-bold text-[#5B5CE2] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Chat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-[#667085] dark:text-slate-400 font-sans leading-relaxed">
              Ask about complex time complexities, invariant proofs, or why your previous approach failed:
            </p>

            <div className="space-y-1.5">
              {[
                'Why does QuickSort degrade to O(N²) in the worst case?',
                'Explain the loop invariant in Binary Search',
                'What is the difference between BFS and DFS space complexity?'
              ].map((promptText, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onOpenTutor ? onOpenTutor(promptText) : onStartQuiz()}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-indigo-50/70 dark:hover:bg-white/10 border border-[#E6E9EF] dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 font-sans transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{promptText}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5B5CE2] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* 3. DAILY ACTION PLAN (Wide, col-span-2) */}
        <BentoCard
          variant="wide"
          glowBorder="none"
          title="Today's Recommended Action Plan"
          subtitle="Top 3 prioritized activities aligned with your learning path"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[#667085] dark:text-slate-300 text-[11px] font-mono font-medium">
              <Target className="w-3 h-3 text-[#5B5CE2]" />
              Target Availability: {onboarding.daily_availability || '30–60m'}
            </span>
          }
        >
          <div className="space-y-2.5">
            {dailyTasks.map((task) => {
              const TaskIcon = task.icon;
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-[#E6E9EF] dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#5B5CE2]/10 dark:bg-[#5B5CE2]/20 flex items-center justify-center text-[#5B5CE2] dark:text-indigo-400 shrink-0">
                      <TaskIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate font-sans">
                        {task.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-[#667085] dark:text-slate-400 font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estTime}
                        </span>
                        <span>•</span>
                        <span className={`font-bold ${task.priority === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={task.onExecute}
                    className="px-3 py-1.5 rounded-full bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-semibold text-[11px] shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    {task.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </BentoCard>

        {/* 4. CODE PREVIEW BENTO CARD (Wide, col-span-2) */}
        <BentoCard
          variant="wide"
          glowBorder="teal"
          title="Algorithm Invariant Inspector"
          subtitle="Reference implementation with formal loop invariants"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-[#38B7A5] text-[11px] font-mono font-semibold border border-teal-200 dark:border-teal-800">
              DSA Syllabus Core
            </span>
          }
        >
          <CodeWindow
            title="binary_search_invariant.py"
            language="python"
            code={sampleAlgorithmCode}
            onAskTutor={(snippet) => onOpenTutor ? onOpenTutor(`Can you explain the loop invariant in this implementation:\n\`\`\`python\n${snippet}\n\`\`\``) : onStartQuiz()}
          />
        </BentoCard>

        {/* 5. OVERALL MASTERY GAUGE BENTO CARD (Standard, col-span-1) */}
        <BentoCard
          variant="standard"
          glowBorder="none"
          title="Mastery Calibration"
          subtitle="Persistent telemetry across 12 concepts"
        >
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <MasteryGauge score={profile.overall_mastery} label="Overall Mastery" size={160} />
            <div className="mt-4 pt-3 border-t border-[#E6E9EF] dark:border-white/10 w-full space-y-1.5 text-xs font-mono text-[#667085] dark:text-slate-400">
              <div className="flex justify-between">
                <span>Diagnostic:</span>
                <strong className={completedDiagnostic ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                  {completedDiagnostic ? 'Calibrated' : 'Pending'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Mastered:</span>
                <span className="text-teal-600 dark:text-teal-400 font-bold">{masteredConcepts.length} / 12 Concepts</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* 6. SPACED REPETITION SCHEDULE CARD (Standard, col-span-1) */}
        <BentoCard
          variant="standard"
          glowBorder="none"
          title="Spaced Repetition"
          subtitle="Active retention schedule"
          badge={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF0FD] dark:bg-white/10 text-[#5B5CE2] dark:text-indigo-300 font-mono text-[10px] font-bold">
              {pendingRevisions.length} Tasks Due
            </span>
          }
        >
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            {pendingRevisions.length > 0 ? (
              <div className="space-y-2">
                {pendingRevisions.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-[#E6E9EF] dark:border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">{task.concept_name}</span>
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {task.urgency}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#667085] dark:text-slate-400 truncate font-sans">
                      {task.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[#667085] dark:text-slate-400 bg-slate-50 dark:bg-white/5 rounded-xl border border-[#E6E9EF] dark:border-white/10 text-xs">
                Retention optimal. All spaced review tasks cleared!
              </div>
            )}

            <button
              onClick={onOpenRevision}
              className="w-full mt-2 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Open Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </BentoCard>

        {/* 7. HIGH-PRIORITY CONCEPT FOCUS BENTO CARD (Wide, col-span-2) */}
        <BentoCard
          variant="wide"
          glowBorder="none"
          title="High-Priority Concept Focus"
          subtitle="Concepts with identified misconceptions or lower confidence"
          badge={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono text-[10px] font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Automated Focus
            </span>
          }
        >
          <div className="space-y-2.5">
            {weakestConcepts.map((c) => (
              <div
                key={c.concept_id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-[#E6E9EF] dark:border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-semibold text-slate-900 dark:text-white">{c.concept_name}</span>
                  <span className={`font-mono font-bold ${c.mastery_percentage >= 70 ? 'text-teal-600 dark:text-teal-400' :
                      c.mastery_percentage >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-[#5B5CE2] dark:text-indigo-400'
                    }`}>
                    {c.mastery_percentage}%
                  </span>
                </div>

                <div className="h-1.5 w-full bg-[#E6E9EF] dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${c.mastery_percentage >= 70 ? 'bg-teal-500' :
                        c.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                      }`}
                    style={{ width: `${c.mastery_percentage}%` }}
                  />
                </div>

                {c.last_misconception_name && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 font-mono flex items-center gap-1">
                    <span className="font-semibold">Detected Misconception:</span>
                    <span className="truncate">{c.last_misconception_name}</span>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={onStartQuiz}
              className="w-full py-2.5 rounded-xl bg-[#5B5CE2]/10 dark:bg-[#5B5CE2]/20 hover:bg-[#5B5CE2]/20 dark:hover:bg-[#5B5CE2]/30 text-[#5B5CE2] dark:text-indigo-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              Practice Targeted Concepts Now &rarr;
            </button>
          </div>
        </BentoCard>

        {/* 8. COMPLETE SYLLABUS MASTERY GRID (Full width, col-span-full) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 bento-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold font-heading text-slate-900 dark:text-white">
                Introductory DSA Syllabus Mastery Breakdown (12 Concepts)
              </h3>
              <p className="text-xs text-[#667085] dark:text-slate-400 font-sans mt-0.5">
                Continuous knowledge matrix calibrated after every diagnostic and practice attempt
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#EEF0FD] dark:bg-white/10 text-[#5B5CE2] dark:text-[#38B7A5] border border-[#C7D2FE] dark:border-white/15 w-fit">
              {profile.overall_mastery}% Calibrated Mastery
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {conceptsList.map((concept) => (
              <div
                key={concept.concept_id}
                onClick={onStartQuiz}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-[#E6E9EF] dark:border-white/10 hover:border-[#38B7A5]/50 dark:hover:border-[#38B7A5]/50 bento-card-hover space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans truncate pr-2">
                    {concept.concept_name}
                  </span>
                  <span className={`text-xs font-mono font-bold shrink-0 ${concept.questions_attempted === 0 ? 'text-slate-400' :
                      concept.mastery_percentage >= 70 ? 'text-teal-600 dark:text-teal-400' :
                        concept.mastery_percentage >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-[#5B5CE2] dark:text-indigo-400'
                    }`}>
                    {concept.questions_attempted === 0 ? 'Pending' : `${concept.mastery_percentage}%`}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-[#E6E9EF] dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${concept.mastery_percentage >= 70 ? 'bg-teal-500' :
                        concept.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                      }`}
                    style={{ width: `${concept.mastery_percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#667085] dark:text-slate-400 pt-0.5">
                  <span>Tier: <strong className="text-slate-800 dark:text-slate-200 uppercase">{concept.current_difficulty}</strong></span>
                  <span>Attempts: <strong className="text-slate-800 dark:text-slate-200">{concept.questions_attempted}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
