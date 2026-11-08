import React from 'react';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Network,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Target,
  Zap,
  Check,
  Layers,
  HelpCircle,
  FileText,
  Camera
} from 'lucide-react';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onStartDemo?: () => void;
  lastUser?: { email: string; full_name: string; student_id: string } | null;
  onOpenLiveVideo?: () => void;
  onOpenTermsPrivacy?: () => void;
  onOpenHelpSupport?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  onStartDemo,
  lastUser,
  onOpenLiveVideo,
  onOpenTermsPrivacy,
  onOpenHelpSupport
}) => {
  return (
    <div className="space-y-16 animate-fade-in pb-12">
      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="reveal relative overflow-hidden rounded-3xl bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] p-5 sm:p-10 lg:p-16 shadow-xl text-center space-y-6 sm:space-y-8 transition-colors">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {/* Recognized Returning User Banner */}
          {lastUser && (
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#EDF2F8] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] shadow-xs max-w-md mx-auto text-left">
              <div className="w-8 h-8 rounded-full bg-[#243B63] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {lastUser.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[#64748B] dark:text-[#A8B7CC] block text-[10px]">Recognized returning account:</span>
                <strong className="text-[#17243A] dark:text-[#F1F5FB] truncate block text-xs font-semibold">{lastUser.full_name} ({lastUser.email})</strong>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-3.5 py-1.5 rounded-xl bg-[#38B7A5] hover:bg-[#2EA191] text-white font-bold text-xs shrink-0 transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] text-[#243B63] dark:text-[#38B7A5] text-xs font-mono font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-[#38B7A5] animate-pulse" />
            <span>Agentic Adaptive Exam-Prep Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#17243A] dark:text-[#F1F5FB] tracking-tight leading-tight font-sans">
            Don&apos;t just learn the answers.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#243B63] via-[#38B7A5] to-[#6C8FF5]">
              Master the concepts.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-[#64748B] dark:text-[#A8B7CC] leading-relaxed font-sans max-w-2xl mx-auto">
            Traditional quiz apps drill repetitive MCQs. LearnLoop AI models your individual cognitive mastery across 12 DSA concepts, pinpoints hidden misconceptions with 7 bounded agent tools, and consolidates knowledge using spaced repetition.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-md sm:max-w-none mx-auto">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#243B63] hover:bg-[#1E3554] dark:bg-[#38B7A5] dark:hover:bg-[#2EA191] text-white dark:text-[#101B2D] font-bold text-base shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onStartDemo && (
              <button
                type="button"
                onClick={onStartDemo}
                className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#38B7A5]/15 hover:bg-[#38B7A5]/25 text-[#0F9F91] dark:text-[#38B7A5] border border-[#38B7A5]/30 font-bold text-sm shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Explore Guest Demo</span>
              </button>
            )}

            {onOpenLiveVideo && (
              <button
                type="button"
                onClick={onOpenLiveVideo}
                className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#EDF2F8] dark:bg-[#20344E] hover:bg-slate-200 dark:hover:bg-[#284162] text-[#243B63] dark:text-[#F1F5FB] border border-[#E2E8F0] dark:border-[#243B5B] font-bold text-sm shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Explore Live Video</span>
              </button>
            )}

            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-[#182A42] hover:bg-slate-50 dark:hover:bg-[#20344E] text-[#17243A] dark:text-[#F1F5FB] border border-[#E2E8F0] dark:border-[#243B5B] font-semibold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-[#64748B] dark:text-[#A8B7CC] font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              100% Free & Open Evaluation
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#243B63] dark:text-[#6C8FF5] shrink-0" />
              Argon2id & Data Isolation
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              Gemini 2.5 Flash + Fallback
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. HOW IT WORKS (4-STEP WORKFLOW)                          */}
      {/* ========================================================= */}
      <section className="space-y-8">
        <div className="reveal text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17243A] dark:text-[#F1F5FB] font-sans">
            How LearnLoop AI Works
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#A8B7CC]">
            A continuous loop from diagnostic assessment to concept mastery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
          {[
            {
              step: '01',
              title: 'Personalized Onboarding & Diagnostic',
              desc: 'Select your goals and take an adaptive 12-question diagnostic test to estimate your verified proficiency across 12 DSA concepts (Levels 1–5).',
              icon: Target,
              accent: 'from-[#243B63] to-indigo-600'
            },
            {
              step: '02',
              title: 'Prerequisite Graph & Bottlenecks',
              desc: 'Analyze your 19-edge prerequisite graph. The system detects bottleneck concepts (e.g. Recursion blocking Trees and Graphs) and recommends remediation.',
              icon: Network,
              accent: 'from-indigo-600 to-[#38B7A5]'
            },
            {
              step: '03',
              title: '7-Tool Agentic Question Engine',
              desc: 'Answers are evaluated by 7 bounded agent tools with misconception classifiers (Stack LIFO vs FIFO, BST ancestor constraints, base-case omissions).',
              icon: BrainCircuit,
              accent: 'from-[#38B7A5] to-[#6C8FF5]'
            },
            {
              step: '04',
              title: 'Socratic Tutor & Spaced Repetition',
              desc: 'Receive Socratic hints and voice-enabled dialogue. Misconceptions are automatically scheduled into a modified SM-2 spaced revision timeline.',
              icon: Calendar,
              accent: 'from-[#6C8FF5] to-teal-600'
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="reveal p-6 rounded-3xl bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] shadow-card hover:shadow-lg transition-all space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.accent} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-200 dark:text-slate-700 group-hover:text-[#38B7A5]/40 transition-colors">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#17243A] dark:text-[#F1F5FB] font-sans">{item.title}</h3>
                <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. COMPARISON TABLE: LEARNLOOP AI VS TRADITIONAL QUIZZES  */}
      {/* ========================================================= */}
      <section className="reveal rounded-3xl bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] p-4 sm:p-8 shadow-card space-y-4 sm:space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#17243A] dark:text-[#F1F5FB] font-sans">
            Why LearnLoop AI is Different
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#A8B7CC]">
            Comparing static question drillers to genuine agentic cognitive modeling
          </p>
        </div>

        {/* Mobile Horizontal Scroll Indicator */}
        <div className="sm:hidden flex items-center justify-end text-[11px] text-slate-400 dark:text-slate-500 gap-1 px-1">
          <span>Swipe horizontally to view comparison →</span>
        </div>

        <div className="overflow-x-auto touch-pan-x -mx-2 sm:mx-0 px-2 sm:px-0" data-lenis-prevent>
          <table className="w-full text-xs text-left min-w-[540px]">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#243B5B] bg-slate-50/70 dark:bg-[#20344E]/60">
                <th className="py-3 px-4 font-bold text-[#17243A] dark:text-[#F1F5FB]">Capability</th>
                <th className="py-3 px-4 font-bold text-[#64748B] dark:text-[#A8B7CC]">Generic Quiz Apps</th>
                <th className="py-3 px-4 font-bold text-[#243B63] dark:text-[#38B7A5] bg-[#EDF2F8]/60 dark:bg-[#20344E]">LearnLoop AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#243B5B]">
              {[
                {
                  cap: 'Diagnostic Assessment',
                  old: 'Fixed score percentage with no prerequisite mapping',
                  ai: 'Calibrated baseline mastery + Verified Proficiency Levels 1–5'
                },
                {
                  cap: 'Knowledge Representation',
                  old: 'Linear chapter lists with isolated topics',
                  ai: '19-edge DAG prerequisite graph identifying learning bottlenecks'
                },
                {
                  cap: 'Incorrect Answer Analysis',
                  old: 'Binary "Incorrect" marking with static answer key',
                  ai: 'Semantic misconception detection (e.g. FIFO vs LIFO, BST range)'
                },
                {
                  cap: 'Agentic Execution',
                  old: 'Single backend script or black-box LLM call',
                  ai: '7 bounded agent tools with logged execution metrics and input summaries'
                },
                {
                  cap: 'Long-Term Retention',
                  old: 'Forgot questions once answered',
                  ai: 'Automated modified SM-2 spaced repetition scheduler (1, 3, 7, 14 days)'
                },
                {
                  cap: 'Voice Interaction',
                  old: 'Not supported or raw browser recognition',
                  ai: 'Wispr Flow speech dictation with disfluency and self-correction parsing'
                },
                {
                  cap: 'Student Privacy & RBAC',
                  old: 'Shared dashboards or client-side filtering',
                  ai: 'Strict server-side RBAC; teacher class telemetry isolated from students'
                }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#20344E]/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#17243A] dark:text-[#F1F5FB]">{row.cap}</td>
                  <td className="py-3 px-4 text-[#64748B] dark:text-[#A8B7CC]">{row.old}</td>
                  <td className="py-3 px-4 font-medium text-[#243B63] dark:text-[#38B7A5] bg-[#EDF2F8]/30 dark:bg-[#20344E]/40">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#38B7A5] shrink-0" />
                      <span>{row.ai}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. DESIGNED FOR EVERY LEARNER PROFILE                     */}
      {/* ========================================================= */}
      <section className="space-y-8">
        <div className="reveal text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#17243A] dark:text-[#F1F5FB] font-sans">
            Built for Real-World Goals
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#A8B7CC]">
            Tailored onboarding categories adapted to your background and study timeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal-stagger">
          {[
            {
              role: 'University Students',
              desc: 'Master semester examinations and semester projects with prerequisite concept clarity.',
              badge: 'Academic Prep'
            },
            {
              role: 'Job Seekers & SDE Candidates',
              desc: 'Target coding interviews with LeetCode-style mastery, Big-O trade-offs, and time complexity.',
              badge: 'Tech Interviews'
            },
            {
              role: 'Working Professionals',
              desc: 'Accelerate system design readiness and algorithm fundamentals on a 15–30 min/day schedule.',
              badge: 'Career Upskilling'
            },
            {
              role: 'Independent Learners',
              desc: 'Self-paced discovery with Socratic hints, visual data structure layouts, and zero gatekeeping.',
              badge: 'Self-Paced'
            }
          ].map((persona, i) => (
            <div
              key={i}
              className="reveal p-5 rounded-2xl bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] shadow-card space-y-3"
            >
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EDF2F8] dark:bg-[#20344E] text-[#243B63] dark:text-[#38B7A5] font-mono text-[10px] font-bold">
                {persona.badge}
              </span>
              <h3 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB]">{persona.role}</h3>
              <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] leading-relaxed">{persona.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CALL TO ACTION BANNER                                  */}
      {/* ========================================================= */}
      <section className="reveal rounded-3xl bg-gradient-to-r from-[#243B63] via-[#1E3554] to-[#14233A] p-6 sm:p-12 text-white shadow-xl text-center space-y-6 border border-[#243B5B]">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight font-sans">
            Ready to master your concepts?
          </h2>
          <p className="text-xs sm:text-sm text-[#A8B7CC] max-w-xl mx-auto leading-relaxed">
            Start with our 12-question diagnostic test to get a personalized concept mastery radar and adaptive curriculum.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md sm:max-w-none mx-auto">
          <button
            onClick={onOpenRegister}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-[#38B7A5] hover:bg-[#2EA191] text-[#101B2D] font-bold text-sm shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {onOpenLiveVideo && (
            <button
              onClick={onOpenLiveVideo}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Explore Live Video</span>
            </button>
          )}
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm backdrop-blur-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign In</span>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. LEGAL & SUPPORT LINKS                                  */}
      {/* ========================================================= */}
      <div className="flex items-center justify-center gap-6 text-xs text-[#667085] font-sans">
        {onOpenTermsPrivacy && (
          <button
            onClick={onOpenTermsPrivacy}
            className="hover:text-[#5B5CE2] transition-colors flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Privacy Policy</span>
          </button>
        )}
        {onOpenHelpSupport && (
          <button
            onClick={onOpenHelpSupport}
            className="hover:text-[#5B5CE2] transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & Shortcuts</span>
          </button>
        )}
      </div>
    </div>
  );
};
