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
  BookOpen
} from 'lucide-react';
import { LearnerProfile, RevisionTask } from '../types';
import { MasteryGauge } from '../components/MasteryGauge';

interface DashboardPageProps {
  profile: LearnerProfile;
  revisionTasks: RevisionTask[];
  onStartDiagnostic: () => void;
  onStartQuiz: () => void;
  onViewGraph: () => void;
  onOpenRevision: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  profile,
  revisionTasks,
  onStartDiagnostic,
  onStartQuiz,
  onViewGraph,
  onOpenRevision
}) => {
  const conceptsList = Object.values(profile.concepts || {});
  const completedDiagnostic = profile.diagnostic_completed;

  // Compute weakest concepts
  const sortedConcepts = [...conceptsList].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
  const weakestConcepts = sortedConcepts.slice(0, 3);
  const masteredConcepts = conceptsList.filter(c => c.mastery_percentage >= 70);

  const pendingRevisions = revisionTasks.filter(t => t.status === 'pending');

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-edu-900 via-edu-850 to-edu-900 border border-edu-700/80 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              Continuous Learner Modeling Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              Welcome back, <span className="text-loop-purple">{profile.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              LearnLoop AI adapts your exam preparation in real-time. By analyzing your reasoning and detecting subtle misconceptions, our agent guides you from memorization to genuine mastery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!completedDiagnostic ? (
              <button
                onClick={onStartDiagnostic}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-400 hover:to-purple-500 text-white font-mono font-bold text-xs shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02]"
              >
                <GraduationCap className="w-4 h-4" />
                Take Initial Diagnostic Test
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onStartQuiz}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-loop-purple to-loop-indigo hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
              >
                <BrainCircuit className="w-4 h-4" />
                Launch Adaptive Practice
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onViewGraph}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-edu-800 hover:bg-edu-700 text-slate-200 font-mono text-xs border border-edu-700 transition-colors"
            >
              <Network className="w-4 h-4 text-purple-400" />
              View Syllabus Graph
            </button>
          </div>
        </div>

        {/* Ambient background blur */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Overall Mastery Meter */}
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md flex flex-col items-center justify-center text-center">
          <MasteryGauge score={profile.overall_mastery} label="Overall Mastery" size={190} />

          <div className="mt-4 pt-4 border-t border-edu-800 w-full space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Diagnostic Status:</span>
              <strong className={completedDiagnostic ? 'text-emerald-400' : 'text-rose-400'}>
                {completedDiagnostic ? 'Completed' : 'Pending Baseline'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Tracked Syllabus:</span>
              <span className="text-slate-200">Introductory DSA</span>
            </div>
            <div className="flex justify-between">
              <span>Mastered Concepts:</span>
              <span className="text-emerald-400 font-bold">{masteredConcepts.length} / 12</span>
            </div>
          </div>
        </div>

        {/* Middle: Weakest Concepts Focus Area */}
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              High-Priority Concept Focus
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Auto-targeted by Agent</span>
          </div>

          <div className="space-y-3">
            {weakestConcepts.map((c) => (
              <div
                key={c.concept_id}
                className="p-3 rounded-xl bg-edu-950 border border-edu-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-white">{c.concept_name}</span>
                  <span className={`text-xs font-mono font-bold ${
                    c.mastery_percentage >= 70 ? 'text-emerald-400' :
                    c.mastery_percentage >= 40 ? 'text-amber-400' : 'text-purple-400'
                  }`}>
                    {c.mastery_percentage}%
                  </span>
                </div>

                <div className="h-1.5 w-full bg-edu-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-loop-blue rounded-full"
                    style={{ width: `${c.mastery_percentage}%` }}
                  />
                </div>

                {c.last_misconception_name && (
                  <div className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                    <span>Recent Flaw:</span>
                    <span className="truncate">{c.last_misconception_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onStartQuiz}
            className="w-full py-2.5 rounded-xl bg-edu-800 hover:bg-edu-750 text-slate-200 text-xs font-mono border border-edu-700 transition-colors flex items-center justify-center gap-1.5"
          >
            Practice Weakest Concepts Now &rarr;
          </button>
        </div>

        {/* Right: Upcoming Spaced Repetitions */}
        <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-loop-purple" />
                Spaced Repetition Schedule
              </h3>
              <span className="text-[10px] font-mono text-purple-400 font-bold">
                {pendingRevisions.length} due
              </span>
            </div>

            {pendingRevisions.length > 0 ? (
              <div className="space-y-2.5">
                {pendingRevisions.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-edu-950 border border-edu-800 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{task.concept_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        task.urgency === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        task.urgency === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-edu-850 text-slate-400 border border-edu-700'
                      }`}>
                        Due: {task.due_date}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans line-clamp-1">
                      {task.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-edu-950 rounded-xl border border-edu-800 text-xs font-mono">
                No immediate revision tasks pending. Complete adaptive quizzes to schedule spaced repetitions!
              </div>
            )}
          </div>

          <button
            onClick={onOpenRevision}
            className="w-full py-2.5 rounded-xl bg-edu-800 hover:bg-edu-750 text-slate-200 text-xs font-mono border border-edu-700 transition-colors flex items-center justify-center gap-1.5 mt-2"
          >
            Open Spaced Revision Calendar &rarr;
          </button>
        </div>

      </div>

      {/* Concept Mastery Grid across all 12 concepts */}
      <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Syllabus Mastery Breakdown (12 Concepts)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent learner model state updated after every answered question
            </p>
          </div>
          <span className="text-xs font-mono text-purple-400">
            {profile.overall_mastery}% Class Avg
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {conceptsList.map((concept) => (
            <div
              key={concept.concept_id}
              className="p-3.5 rounded-xl bg-edu-950 border border-edu-800 hover:border-purple-600/50 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-white truncate">{concept.concept_name}</span>
                <span className={`text-xs font-mono font-bold ${
                  concept.mastery_percentage >= 70 ? 'text-emerald-400' :
                  concept.mastery_percentage >= 40 ? 'text-amber-400' : 'text-purple-400'
                }`}>
                  {concept.mastery_percentage}%
                </span>
              </div>

              <div className="h-1.5 w-full bg-edu-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-loop-purple to-loop-blue rounded-full"
                  style={{ width: `${concept.mastery_percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                <span>Tier: <strong className="text-slate-400 uppercase">{concept.current_difficulty}</strong></span>
                <span>Attempts: <strong className="text-slate-400">{concept.questions_attempted}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
