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
  Check
} from 'lucide-react';
import { LearnerProfile, RevisionTask, OnboardingProfile } from '../types';
import { MasteryGauge } from '../components/MasteryGauge';
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
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  revisionTasks,
  onStartDiagnostic,
  onStartQuiz,
  onViewGraph,
  onOpenRevision,
  onOpenProfile,
  onOpenOnboarding
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

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E6E9EF] p-4 sm:p-8 shadow-card">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Continuous Learner Modeling Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-sans font-semibold">
                <User className="w-3 h-3" />
                {category}
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#172033] font-sans">
              Welcome back, <span className="text-[#5B5CE2]">{profile.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-sans">
              LearnLoop AI adapts your exam preparation in real time. By analyzing your reasoning and detecting subtle misconceptions, our agent guides you from memorization to genuine conceptual mastery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 text-[#172033] text-xs font-medium border border-[#E6E9EF] transition-colors shadow-xs cursor-pointer"
              >
                <Award className="w-4 h-4 text-[#5B5CE2]" />
                My Learning Profile
              </button>
            )}

            {!completedDiagnostic ? (
              <button
                onClick={onStartDiagnostic}
                className="flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                Take Diagnostic Test
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onStartQuiz}
                className="flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4" />
                Launch Adaptive Practice
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onViewGraph}
              className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-slate-50 text-[#172033] text-xs font-medium border border-[#E6E9EF] transition-colors cursor-pointer"
            >
              <Network className="w-4 h-4 text-[#5B5CE2]" />
              View Syllabus Graph
            </button>
          </div>
        </div>

        {/* Subtle accent corner glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </div>

      {/* Live Demo Explorer Notification Banner */}
      {user?.is_demo && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-indigo-50/80 to-purple-50 border border-amber-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                Live Demo Explorer
              </span>
              <span className="font-bold text-slate-900 text-sm font-sans">
                Full System Demonstration Active (No Account Required)
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed font-sans max-w-2xl">
              You are exploring LearnLoop AI with isolated sample progress. You can take diagnostic assessments, launch adaptive quizzes, inspect 7 agent tools, chat with the Socratic AI Tutor, and review class-wide teacher analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold shadow-xs transition-colors"
              >
                Onboarding Wizard
              </button>
            )}
            <button
              onClick={async () => {
                await resetDemoSession();
                window.location.reload();
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition-colors"
            >
              Reset Demo State
            </button>
          </div>
        </div>
      )}

      {/* Personalized Skill Level & Learning Path Highlight Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Verified Proficiency Level Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-indigo-100 shadow-card flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Verified Proficiency Level
            </div>
            <div className="text-base font-bold text-indigo-950 font-sans">
              {levelName}
            </div>
            <div className="text-[11px] text-[#667085]">
              {completedDiagnostic
                ? `Calibrated Score: ${verifiedScore.toFixed(1)}%`
                : 'Provisional (Pending Diagnostic)'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#5B5CE2] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            L{typeof verifiedLevel === 'number' ? verifiedLevel : 1}
          </div>
        </div>

        {/* Focus Strategy Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6E9EF] shadow-card space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#5B5CE2]" />
            Personalized Focus Strategy
          </div>
          <div className="text-xs font-semibold text-[#172033] line-clamp-2">
            {learningPath?.focus_strategy || 'Curriculum-Aligned: Reinforce core invariants and prerequisite mastery.'}
          </div>
          <div className="text-[11px] text-[#667085] flex items-center gap-1 pt-0.5">
            <Clock className="w-3 h-3 text-[#5B5CE2]" />
            Pacing: {onboarding.daily_availability || '30–60 minutes'} / day
          </div>
        </div>

        {/* Next Concept & Prerequisites Card */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6E9EF] shadow-card space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            Recommended Next Concept
          </div>
          <div className="text-xs font-semibold text-[#172033]">
            {learningPath?.recommended_next_concepts && learningPath.recommended_next_concepts[0]
              ? learningPath.recommended_next_concepts[0].concept_name
              : weakestConcepts[0]?.concept_name || 'Arrays & Invariants'}
          </div>
          <div className="text-[11px] text-[#667085] truncate">
            {learningPath?.recommended_next_concepts && learningPath.recommended_next_concepts[0]
              ? learningPath.recommended_next_concepts[0].reason
              : 'Core foundational prerequisite'}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Overall Mastery Meter */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card flex flex-col items-center justify-center text-center">
          <MasteryGauge score={profile.overall_mastery} label="Overall Mastery" size={180} />

          <div className="mt-5 pt-4 border-t border-[#E6E9EF] w-full space-y-2 text-xs font-mono text-[#667085]">
            <div className="flex justify-between">
              <span>Diagnostic Status:</span>
              <strong className={completedDiagnostic ? 'text-teal-700 font-bold' : 'text-amber-700 font-bold'}>
                {completedDiagnostic ? 'Completed' : 'Pending Baseline'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Tracked Syllabus:</span>
              <span className="text-[#172033] font-medium">Introductory DSA</span>
            </div>
            <div className="flex justify-between">
              <span>Mastered Concepts:</span>
              <span className="text-teal-700 font-bold">{masteredConcepts.length} / 12</span>
            </div>
          </div>
        </div>

        {/* Middle: Weakest Concepts Focus Area */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                High-Priority Concept Focus
              </h3>
              <span className="text-[10px] font-mono text-[#667085] bg-slate-50 px-2 py-0.5 rounded border border-[#E6E9EF]">
                Auto-targeted
              </span>
            </div>

            <div className="space-y-2.5">
              {weakestConcepts.map((c) => (
                <div
                  key={c.concept_id}
                  className="p-3 rounded-xl bg-slate-50/80 border border-[#E6E9EF] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#172033] font-sans">{c.concept_name}</span>
                    <span className={`text-xs font-mono font-bold ${c.mastery_percentage >= 70 ? 'text-teal-700' :
                      c.mastery_percentage >= 40 ? 'text-amber-700' : 'text-[#5B5CE2]'
                      }`}>
                      {c.mastery_percentage}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#E6E9EF] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.mastery_percentage >= 70 ? 'bg-teal-500' :
                        c.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                        }`}
                      style={{ width: `${c.mastery_percentage}%` }}
                    />
                  </div>

                  {c.last_misconception_name && (
                    <div className="text-[10px] text-amber-800 font-mono flex items-center gap-1 pt-0.5">
                      <span className="font-semibold">Recent Flaw:</span>
                      <span className="truncate">{c.last_misconception_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onStartQuiz}
            className="w-full py-2.5 sm:py-2 min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 text-[#172033] text-xs font-medium border border-[#E6E9EF] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Practice Weakest Concepts Now &rarr;
          </button>
        </div>

        {/* Right: Upcoming Spaced Repetitions */}
        <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#5B5CE2]" />
                Spaced Repetition Schedule
              </h3>
              <span className="text-[10px] font-mono text-[#5B5CE2] font-bold bg-[#EEF0FD] px-2 py-0.5 rounded border border-[#C7D2FE]">
                {pendingRevisions.length} due
              </span>
            </div>

            {pendingRevisions.length > 0 ? (
              <div className="space-y-2.5">
                {pendingRevisions.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-50/80 border border-[#E6E9EF] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#172033] font-sans">{task.concept_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase ${task.urgency === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        task.urgency === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                        Due: {task.due_date}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#667085] font-sans line-clamp-1">
                      {task.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[#667085] bg-slate-50 rounded-xl border border-[#E6E9EF] text-xs font-sans">
                No immediate revision tasks pending. Complete adaptive quizzes to schedule spaced repetitions!
              </div>
            )}
          </div>

          <button
            onClick={onOpenRevision}
            className="w-full py-2.5 sm:py-2 min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 text-[#172033] text-xs font-medium border border-[#E6E9EF] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Open Spaced Revision Calendar &rarr;
          </button>
        </div>

      </div>

      {/* Concept Mastery Grid across all 12 concepts */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033]">
              Syllabus Mastery Breakdown (12 Concepts)
            </h3>
            <p className="text-xs text-[#667085] mt-0.5 font-sans">
              Persistent learner model state updated after every answered question
            </p>
          </div>
          <span className="text-xs font-mono text-[#5B5CE2] font-semibold bg-[#EEF0FD] px-2.5 py-1 rounded-full border border-[#C7D2FE]">
            {profile.overall_mastery}% Class Avg
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {conceptsList.map((concept) => (
            <div
              key={concept.concept_id}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-[#E6E9EF] hover:border-[#5B5CE2]/50 hover:bg-white card-hover space-y-2 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#172033] font-sans truncate">{concept.concept_name}</span>
                <span className={`text-xs font-mono font-bold ${concept.questions_attempted === 0 ? 'text-slate-500' :
                  concept.mastery_percentage >= 70 ? 'text-teal-700' :
                    concept.mastery_percentage >= 40 ? 'text-amber-700' : 'text-[#5B5CE2]'
                  }`}>
                  {concept.questions_attempted === 0 ? 'Not Assessed' : `${concept.mastery_percentage}%`}
                </span>
              </div>

              <div className="h-1.5 w-full bg-[#E6E9EF] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${concept.mastery_percentage >= 70 ? 'bg-teal-500' :
                    concept.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                    }`}
                  style={{ width: `${concept.mastery_percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#667085] pt-0.5">
                <span>Tier: <strong className="text-[#172033] uppercase">{concept.current_difficulty}</strong></span>
                <span>Attempts: <strong className="text-[#172033]">{concept.questions_attempted}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
