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
  ChevronRight,
  Route,
  Activity,
  BarChart2,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { LearnerProfile, RevisionTask, OnboardingProfile } from '../types';
import { MasteryGauge } from '../components/MasteryGauge';
import { BentoCard } from '../components/BentoCard';
import { TypewriterText } from '../components/TypewriterText';
import { BSSVariantInspector } from '../components/BSSVariantInspector';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  profile: LearnerProfile;
  revisionTasks: RevisionTask[];
  onStartDiagnostic: () => void;
  onStartQuiz: (conceptId?: string) => void;
  onViewGraph: () => void;
  onOpenRevision: () => void;
  onOpenProfile?: () => void;
  onOpenOnboarding?: () => void;
  onOpenTutor?: (initialPrompt?: string) => void;
  onOpenRoadmap?: () => void;
  onOpenSkills?: () => void;
  onOpenAchievements?: () => void;
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
  onOpenTutor,
  onOpenRoadmap,
  onOpenSkills,
  onOpenAchievements
}) => {
  const { user, resetDemoSession } = useAuth();
  const conceptsList = Object.values(profile.concepts || {});
  const completedDiagnostic = Boolean(profile.diagnostic_completed);

  // Compute weakest concepts from real data
  const sortedConcepts = [...conceptsList].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
  const weakestConcepts = sortedConcepts.slice(0, 3);
  const masteredConcepts = conceptsList.filter((c) => c.mastery_percentage >= 70);
  const inProgressConcepts = conceptsList.filter((c) => c.mastery_percentage > 0 && c.mastery_percentage < 70);

  const pendingRevisions = revisionTasks.filter((t) => t.status === 'pending');

  const onboarding: Partial<OnboardingProfile> = profile.onboarding_data || {};
  const category = profile.learner_category || onboarding.learner_category || 'General Learner';
  const verifiedLevel = profile.verified_proficiency_level || 'Level 1 — Beginner';
  const verifiedScore = Math.round(profile.verified_proficiency_score || profile.overall_mastery || 0);

  // Target concept to practice next
  const primaryFocusConcept = weakestConcepts[0] || conceptsList[0] || {
    concept_id: 'arrays',
    concept_name: 'Arrays & Invariants',
    mastery_percentage: 0
  };

  // Dynamic Typewriter Phrases for the Welcome Hero Card
  const heroPhrases = [
    completedDiagnostic
      ? `Next focus: Master ${primaryFocusConcept.concept_name} (Current: ${Math.round(primaryFocusConcept.mastery_percentage)}%)`
      : 'Calibrate your 12-concept baseline with our adaptive diagnostic',
    `Active learning streak: ${profile.streak_days || 1} day${(profile.streak_days || 1) > 1 ? 's' : ''} 🔥`,
    'Socratic AI Tutor is online for guided problem breakdowns',
    'Real-time misconception detection active across all assessments'
  ];

  // Daily Action Plan derived from real telemetry
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
    name: `Adaptive Practice: ${primaryFocusConcept.concept_name}`,
    estTime: '15 mins',
    priority: 'High',
    completed: false,
    actionLabel: 'Start Practice',
    onExecute: () => onStartQuiz(primaryFocusConcept.concept_id),
    icon: BrainCircuit
  });

  if (dailyTasks.length < 3) {
    dailyTasks.push({
      id: 'tutor_task',
      name: `Socratic Dialogue: Inspect ${weakestConcepts[1]?.concept_name || 'Binary Trees'}`,
      estTime: '12 mins',
      priority: 'Medium',
      completed: false,
      actionLabel: 'Open Tutor',
      onExecute: () =>
        onOpenTutor
          ? onOpenTutor(`Explain key loop invariants and edge cases for ${weakestConcepts[1]?.concept_name || 'Data Structures'}`)
          : onStartQuiz(),
      icon: MessageSquare
    });
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10 pb-16 lg:pb-6">
      {/* Live Demo Explorer Notification Banner */}
      {user?.is_demo && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#243B63]/10 to-[#38B7A5]/10 border border-amber-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                Live Demo Explorer
              </span>
              <span className="font-bold text-[#17243A] dark:text-[#F1F5FB] text-sm font-heading">
                Interactive Pedagogical Sandbox Active
              </span>
            </div>
            <p className="text-[#64748B] dark:text-[#A8B7CC] leading-relaxed font-sans max-w-2xl">
              You are exploring LearnLoop AI with real-time student telemetry. You can take diagnostic assessments, launch adaptive quizzes, inspect agent tools, chat with the Socratic AI Tutor, and review class-wide teacher analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#20344E] hover:bg-slate-50 dark:hover:bg-[#243B5B] border border-[#E2E8F0] dark:border-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Onboarding
              </button>
            )}
            <button
              onClick={async () => {
                await resetDemoSession();
                window.location.reload();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#243B63] dark:bg-[#38B7A5] hover:bg-[#1E3554] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Reset Demo
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP HEADER: WELCOME + SUMMARY + PROMINENT NEXT ACTION */}
      {/* ========================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-colors">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#38B7A5]/10 text-[#38B7A5] text-xs font-mono font-semibold border border-[#38B7A5]/30">
              <Sparkles className="w-3.5 h-3.5" />
              Continuous Mastery Engine
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B]">
              <User className="w-3 h-3" />
              {category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/60">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{profile.streak_days || 1}d Streak</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-heading tracking-tight text-[#17243A] dark:text-[#F1F5FB]">
            Welcome back, <span className="text-[#38B7A5]">{profile.name}</span>
          </h1>

          <div className="text-sm text-[#243B63] dark:text-[#A8B7CC] font-medium min-h-[1.75rem] flex items-center">
            <TypewriterText phrases={heroPhrases} />
          </div>

          <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] leading-relaxed">
            {completedDiagnostic
              ? `You have mastered ${masteredConcepts.length} of 12 core DSA concepts (${inProgressConcepts.length} in progress). Overall verified mastery is ${Math.round(profile.overall_mastery || 0)}%.`
              : 'Complete your adaptive diagnostic to establish your verified proficiency level and personalized study plan.'}
          </p>
        </div>

        {/* Prominent Next Action Card */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
          {!completedDiagnostic ? (
            <button
              onClick={onStartDiagnostic}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-xs shadow-md transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Start Diagnostic Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onStartQuiz(primaryFocusConcept.concept_id)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-xs shadow-md transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <BrainCircuit className="w-4 h-4" />
              <span>Practice {primaryFocusConcept.concept_name}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onViewGraph}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#EDF2F8] dark:bg-[#20344E] hover:bg-slate-200 dark:hover:bg-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] transition-colors cursor-pointer"
            >
              <Network className="w-3.5 h-3.5 text-[#38B7A5]" />
              <span>Syllabus Graph</span>
            </button>

            {onOpenRoadmap && (
              <button
                onClick={onOpenRoadmap}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#EDF2F8] dark:bg-[#20344E] hover:bg-slate-200 dark:hover:bg-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold border border-[#E2E8F0] dark:border-[#243B5B] transition-colors cursor-pointer"
              >
                <Route className="w-3.5 h-3.5 text-[#6C8FF5]" />
                <span>Roadmap</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. BENTO GRID: COMPREHENSIVE PRODUCT COMMAND CENTER        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 reveal-stagger">
        {/* BENTO CARD 1: TODAY'S RECOMMENDED ACTION PLAN (Wide, 2 cols) */}
        <BentoCard
          variant="wide"
          glowBorder="teal"
          title="Daily Action Plan"
          subtitle="Prioritized pedagogical steps to advance your concept retention"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#A8B7CC] text-[11px] font-mono font-medium border border-[#E2E8F0] dark:border-[#243B5B]">
              <Target className="w-3 h-3 text-[#38B7A5]" />
              Daily Target: {onboarding.daily_availability || '30–45 mins'}
            </span>
          }
        >
          <div className="space-y-2.5">
            {dailyTasks.map((task) => {
              const TaskIcon = task.icon;
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#243B63]/10 dark:bg-[#38B7A5]/20 flex items-center justify-center text-[#243B63] dark:text-[#38B7A5] shrink-0">
                      <TaskIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[#17243A] dark:text-[#F1F5FB] truncate font-sans">
                        {task.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B] dark:text-[#A8B7CC] font-mono mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estTime}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-bold ${task.priority === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                        >
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={task.onExecute}
                    className="px-3 py-1.5 rounded-lg bg-[#243B63] dark:bg-[#38B7A5] hover:bg-[#1E3554] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-[11px] shrink-0 transition-colors cursor-pointer shadow-xs"
                  >
                    {task.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </BentoCard>

        {/* BENTO CARD 2: SOCRATIC AI TUTOR (Wide, 2 cols) */}
        <BentoCard
          variant="wide"
          glowBorder="indigo"
          title="Socratic AI Tutor"
          subtitle="Explore subtle edge cases and algorithms through guided inquiry"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-[#6C8FF5] dark:text-indigo-300 text-[11px] font-mono font-semibold border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 text-[#6C8FF5]" />
              Reasoning Engine Active
            </span>
          }
          action={
            <button
              onClick={() => (onOpenTutor ? onOpenTutor() : onStartQuiz())}
              className="text-xs font-bold text-[#6C8FF5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Chat</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] font-sans leading-relaxed">
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
                  onClick={() => (onOpenTutor ? onOpenTutor(promptText) : onStartQuiz())}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] hover:bg-[#EDF2F8] dark:hover:bg-[#243B5B] border border-[#E2E8F0] dark:border-[#243B5B] text-xs text-[#17243A] dark:text-[#F1F5FB] font-sans transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{promptText}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6C8FF5] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* BENTO CARD 3: OVERALL MASTERY GAUGE (Standard, 1 col) */}
        <BentoCard
          variant="standard"
          glowBorder="none"
          title="Mastery Calibration"
          subtitle="Persistent telemetry across 12 concepts"
        >
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <MasteryGauge score={profile.overall_mastery || 0} label="Overall Mastery" size={150} />
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-[#243B5B] w-full space-y-1.5 text-xs font-mono text-[#64748B] dark:text-[#A8B7CC]">
              <div className="flex justify-between">
                <span>Diagnostic:</span>
                <strong className={completedDiagnostic ? 'text-[#38B7A5] font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                  {completedDiagnostic ? 'Calibrated' : 'Pending'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Mastered (&ge;70%):</span>
                <span className="text-[#38B7A5] font-bold">{masteredConcepts.length} / 12 Concepts</span>
              </div>
              <div className="flex justify-between">
                <span>Proficiency:</span>
                <span className="text-[#243B63] dark:text-[#6C8FF5] font-semibold">{verifiedLevel}</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* BENTO CARD 4: SPACED REVISION SCHEDULE (Standard, 1 col) */}
        <BentoCard
          variant="standard"
          glowBorder="none"
          title="Spaced Revision"
          subtitle="Active retention schedule"
          badge={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] font-mono text-[10px] font-bold border border-[#E2E8F0] dark:border-[#243B5B]">
              {pendingRevisions.length} Due
            </span>
          }
        >
          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
            {pendingRevisions.length > 0 ? (
              <div className="space-y-2">
                {pendingRevisions.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-sans">
                      <span className="font-semibold text-[#17243A] dark:text-[#F1F5FB] truncate">
                        {task.concept_name}
                      </span>
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">
                        {task.urgency}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] truncate font-sans">
                      {task.reason || 'Optimal retention interval reached'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-[#64748B] dark:text-[#A8B7CC] bg-slate-50 dark:bg-[#20344E] rounded-xl border border-[#E2E8F0] dark:border-[#243B5B] text-xs">
                Retention optimal. All spaced review tasks cleared!
              </div>
            )}

            <button
              onClick={onOpenRevision}
              className="w-full mt-2 py-2 rounded-xl bg-slate-100 dark:bg-[#20344E] hover:bg-slate-200 dark:hover:bg-[#243B5B] text-[#17243A] dark:text-[#F1F5FB] text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer border border-[#E2E8F0] dark:border-[#243B5B]"
            >
              <span>Open Spaced Calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </BentoCard>

        {/* BENTO CARD 5: ASSESSMENT PERFORMANCE & RECENT ACTIVITY (Wide, 2 cols) */}
        <BentoCard
          variant="wide"
          glowBorder="none"
          title="Assessment Telemetry & History"
          subtitle="Real verifiable scores and recent diagnostic attempts"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-mono font-semibold border border-emerald-200 dark:border-emerald-800">
              <Activity className="w-3 h-3 text-emerald-500" />
              Verified Telemetry
            </span>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B]">
                <span className="text-lg font-bold font-mono text-[#243B63] dark:text-[#38B7A5] block">
                  {verifiedScore}%
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC]">Diagnostic Score</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B]">
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                  {masteredConcepts.length}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC]">Mastered (&ge;70%)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B]">
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 block">
                  {inProgressConcepts.length}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC]">In Progress</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B]">
                <span className="text-lg font-bold font-mono text-[#6C8FF5] block">
                  {profile.streak_days || 1}d
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC]">Active Streak</span>
              </div>
            </div>

            {/* Recent Activity List from Real Telemetry */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#A8B7CC] font-mono">
                Recent Verifiable Events
              </span>
              {Array.isArray(profile.recent_activity) && profile.recent_activity.length > 0 ? (
                profile.recent_activity.slice(0, 3).map((act, aIdx) => (
                  <div
                    key={aIdx}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-[#17243A] dark:text-[#F1F5FB] truncate">
                      {act.action || act.concept_name || 'Practice Attempt'}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#A8B7CC] font-mono shrink-0">
                      {act.timestamp ? new Date(act.timestamp).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-[#64748B] dark:text-[#A8B7CC] bg-slate-50 dark:bg-[#20344E] rounded-lg border border-[#E2E8F0] dark:border-[#243B5B] text-xs">
                  No previous sessions recorded. Launch your first practice assessment to log activity.
                </div>
              )}
            </div>
          </div>
        </BentoCard>

        {/* BENTO CARD 6: HIGH-PRIORITY CONCEPT FOCUS (Wide, 2 cols) */}
        <BentoCard
          variant="wide"
          glowBorder="none"
          title="High-Priority Focus Areas"
          subtitle="Concepts requiring reinforcement based on accuracy and misconception flags"
          badge={
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono text-[10px] font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Targeted Interventions
            </span>
          }
        >
          <div className="space-y-2.5">
            {weakestConcepts.map((c) => (
              <div
                key={c.concept_id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-semibold text-[#17243A] dark:text-[#F1F5FB]">
                    {c.concept_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold ${c.mastery_percentage >= 70
                          ? 'text-[#38B7A5]'
                          : c.mastery_percentage >= 40
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#6C8FF5]'
                        }`}
                    >
                      {Math.round(c.mastery_percentage)}%
                    </span>
                    <button
                      onClick={() => onStartQuiz(c.concept_id)}
                      className="text-[10px] text-[#38B7A5] font-semibold hover:underline cursor-pointer"
                    >
                      Practice &rarr;
                    </button>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${c.mastery_percentage >= 70
                        ? 'bg-[#38B7A5]'
                        : c.mastery_percentage >= 40
                          ? 'bg-amber-500'
                          : 'bg-[#6C8FF5]'
                      }`}
                    style={{ width: `${Math.min(100, Math.max(5, c.mastery_percentage))}%` }}
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
          </div>
        </BentoCard>

        {/* BENTO CARD 7: BSS LEVEL SCORE & VARIANT INSPECTOR (Wide, 2 cols) */}
        <BentoCard
          variant="wide"
          glowBorder="teal"
          title="BSS Level Score & Variant Inspector"
          subtitle="Binary Search Space invariant evaluation, proficiency telemetry & algorithmic variants"
          badge={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-[#38B7A5] text-[11px] font-mono font-semibold border border-teal-200 dark:border-teal-800">
              Verified Telemetry
            </span>
          }
        >
          <BSSVariantInspector
            profile={profile}
            onOpenTutor={onOpenTutor}
            onStartQuiz={onStartQuiz}
          />
        </BentoCard>
      </div>
    </div>
  );
};
