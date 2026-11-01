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
  onStartDemo: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onOpenLiveVideo?: () => void;
  onOpenTermsPrivacy?: () => void;
  onOpenHelpSupport?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDemo,
  onOpenRegister,
  onOpenLogin,
  onOpenLiveVideo,
  onOpenTermsPrivacy,
  onOpenHelpSupport
}) => {
  return (
    <div className="space-y-16 animate-fade-in pb-12">
      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-white to-[#FAFBFD] border border-[#E6E9EF] p-8 sm:p-12 lg:p-16 shadow-xl text-center space-y-8">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-[#5B5CE2] animate-pulse" />
            <span>Agentic Adaptive Exam-Prep Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#172033] tracking-tight leading-tight font-sans">
            Don&apos;t just learn the answers.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B5CE2] via-indigo-600 to-purple-600">
              Master the concepts.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#667085] leading-relaxed font-sans max-w-2xl mx-auto">
            Traditional quiz apps drill repetitive MCQs. LearnLoop AI models your individual cognitive mastery across 12 DSA concepts, pinpoints hidden misconceptions with 7 bounded agent tools, and consolidates knowledge using spaced repetition.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-bold text-sm shadow-md shadow-[#5B5CE2]/25 transition-all transform hover:-translate-y-0.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onStartDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Explore Live Demo (No Signup)</span>
            </button>

            {onOpenLiveVideo && (
              <button
                type="button"
                onClick={onOpenLiveVideo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#EEF0FD] hover:bg-indigo-100 text-[#5B5CE2] border border-[#C7D2FE] font-bold text-sm shadow-xs transition-all transform hover:-translate-y-0.5"
              >
                <Camera className="w-4 h-4" />
                <span>Explore Live Video</span>
              </button>
            )}

            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#172033] border border-[#E6E9EF] font-semibold text-sm shadow-xs transition-colors"
            >
              <span>Sign In</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#667085] font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              100% Free & Open Evaluation
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5B5CE2]" />
              Argon2id & FERPA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-600" />
              Gemini 2.5 Flash + Deterministic Fallback
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. HOW IT WORKS (4-STEP WORKFLOW)                          */}
      {/* ========================================================= */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172033] font-sans">
            How LearnLoop AI Works
          </h2>
          <p className="text-sm text-[#667085]">
            A continuous loop from diagnostic assessment to concept mastery
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Personalized Onboarding & Diagnostic',
              desc: 'Select your goals and take an adaptive 12-question diagnostic test to estimate your verified proficiency across 12 DSA concepts (Levels 1–5).',
              icon: Target,
              accent: 'from-[#5B5CE2] to-indigo-600'
            },
            {
              step: '02',
              title: 'Prerequisite Graph & Bottlenecks',
              desc: 'Analyze your 19-edge prerequisite graph. The system detects bottleneck concepts (e.g. Recursion blocking Trees and Graphs) and recommends remediation.',
              icon: Network,
              accent: 'from-indigo-600 to-purple-600'
            },
            {
              step: '03',
              title: '7-Tool Agentic Question Engine',
              desc: 'Answers are evaluated by 7 bounded agent tools with misconception classifiers (Stack LIFO vs FIFO, BST ancestor constraints, base-case omissions).',
              icon: BrainCircuit,
              accent: 'from-purple-600 to-pink-600'
            },
            {
              step: '04',
              title: 'Socratic Tutor & Spaced Repetition',
              desc: 'Receive Socratic hints and voice-enabled dialogue. Misconceptions are automatically scheduled into a modified SM-2 spaced revision timeline.',
              icon: Calendar,
              accent: 'from-teal-600 to-emerald-600'
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-6 rounded-3xl bg-white border border-[#E6E9EF] shadow-card hover:shadow-lg transition-all space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.accent} text-white flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black font-mono text-slate-200 group-hover:text-[#5B5CE2]/30 transition-colors">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#172033] font-sans">{item.title}</h3>
                <p className="text-xs text-[#667085] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. COMPARISON TABLE: LEARNLOOP AI VS TRADITIONAL QUIZZES  */}
      {/* ========================================================= */}
      <section className="rounded-3xl bg-white border border-[#E6E9EF] p-8 shadow-card space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#172033] font-sans">
            Why LearnLoop AI is Different
          </h2>
          <p className="text-xs text-[#667085]">
            Comparing static question drillers to genuine agentic cognitive modeling
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E6E9EF] bg-slate-50/70">
                <th className="py-3 px-4 font-bold text-slate-700">Capability</th>
                <th className="py-3 px-4 font-bold text-slate-400">Generic Quiz Apps</th>
                <th className="py-3 px-4 font-bold text-[#5B5CE2] bg-[#EEF0FD]/60">LearnLoop AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{row.cap}</td>
                  <td className="py-3 px-4 text-slate-500">{row.old}</td>
                  <td className="py-3 px-4 font-medium text-indigo-900 bg-[#EEF0FD]/30">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
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
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#172033] font-sans">
            Built for Real-World Goals
          </h2>
          <p className="text-xs text-[#667085]">
            Tailored onboarding categories adapted to your background and study timeline
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              className="p-5 rounded-2xl bg-white border border-[#E6E9EF] shadow-card space-y-3"
            >
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-[#5B5CE2] font-mono text-[10px] font-bold">
                {persona.badge}
              </span>
              <h3 className="text-sm font-bold text-[#172033]">{persona.role}</h3>
              <p className="text-xs text-[#667085] leading-relaxed">{persona.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CALL TO ACTION BANNER                                  */}
      {/* ========================================================= */}
      <section className="rounded-3xl bg-gradient-to-r from-[#5B5CE2] via-indigo-600 to-purple-600 p-8 sm:p-12 text-white shadow-xl text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight font-sans">
            Ready to master your concepts?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto leading-relaxed">
            Start with our 12-question diagnostic test or explore the entire platform live with zero registration required.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenRegister}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-[#5B5CE2] font-bold text-sm shadow-lg hover:bg-slate-50 transition-all transform hover:scale-105"
          >
            Create Free Account
          </button>
          <button
            onClick={onStartDemo}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm backdrop-blur-xs transition-all"
          >
            Explore Live Demo Now
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
