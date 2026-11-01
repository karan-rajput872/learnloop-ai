import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  BookOpen,
  Briefcase,
  GraduationCap,
  Compass,
  Code,
  Target,
  Clock,
  Layers,
  Award,
  Zap,
  Check,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { OnboardingProfile, LearnerProfile, PersonalizedLearningPath } from '../types';
import { api } from '../services/api';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (profile: LearnerProfile, learningPath: PersonalizedLearningPath) => void;
  initialProfile?: Partial<OnboardingProfile> | null;
  onStartDiagnostic?: (mode: 'quick' | 'comprehensive') => void;
}

const LEARNER_CATEGORIES = [
  { id: 'College / University Student', label: 'College / University Student', icon: GraduationCap, desc: 'Enrolled in an undergraduate or graduate degree program' },
  { id: 'Working Professional', label: 'Working Professional', icon: Briefcase, desc: 'Software engineer or tech professional advancing skills' },
  { id: 'Job Seeker', label: 'Job Seeker', icon: Target, desc: 'Actively preparing for tech interviews and placement assessments' },
  { id: 'School Student', label: 'School Student', icon: BookOpen, desc: 'High school or secondary student starting computer science' },
  { id: 'Independent Learner', label: 'Independent Learner', icon: Compass, desc: 'Self-taught programmer or hobbyist exploring algorithms' },
  { id: 'Other', label: 'Other', icon: Layers, desc: 'Any other learning journey or background' }
];

const PROGRAMMING_EXPERIENCE_OPTIONS = [
  'No programming experience',
  'Less than 6 months',
  '6–12 months',
  '1–2 years',
  '2–4 years',
  'More than 4 years'
];

const DSA_EXPERIENCE_OPTIONS = [
  'Completely new to DSA',
  'Have studied basic concepts',
  'Comfortable with basic data structures',
  'Can solve intermediate problems',
  'Regularly solve advanced problems'
];

const PROGRAMMING_LANGUAGES = [
  'Python',
  'Java',
  'C++',
  'JavaScript / TypeScript',
  'C',
  'Go',
  'Rust',
  'None yet'
];

const SUPPORTED_CONCEPTS = [
  { id: 'arrays', name: 'Arrays & Memory Contiguity' },
  { id: 'linked_lists', name: 'Linked Lists & Pointer Navigation' },
  { id: 'stacks', name: 'Stacks & LIFO Invariants' },
  { id: 'queues', name: 'Queues & FIFO Ordering' },
  { id: 'recursion', name: 'Recursion & Base Cases' },
  { id: 'binary_trees', name: 'Binary Search Trees & Range Constraints' },
  { id: 'trees', name: 'Tree Traversals & Hierarchy' },
  { id: 'searching', name: 'Binary Search & Space Partitioning' },
  { id: 'sorting', name: 'Sorting & Algorithmic Stability' },
  { id: 'time_complexity', name: 'Time Complexity & Big-O Invariants' },
  { id: 'space_complexity', name: 'Space Complexity & Auxiliary Overhead' },
  { id: 'graphs', name: 'Graph Traversals & Cycle Detection' }
];

const LEARNING_GOALS = [
  'Technical interviews',
  'Placement preparation',
  'University examinations',
  'Semester preparation',
  'Internship preparation',
  'Competitive programming',
  'DSA fundamentals',
  'Coding assessments',
  'Professional upskilling',
  'General programming improvement'
];

const TIMELINE_OPTIONS = [
  'Within 1 week',
  'Within 1 month',
  'Within 3 months',
  'Within 6 months',
  'No fixed deadline'
];

const AVAILABILITY_OPTIONS = [
  { label: '15–30 minutes', desc: 'Light pace (2 Qs / day)' },
  { label: '30–60 minutes', desc: 'Optimal rhythm (3 Qs / day)' },
  { label: '1–2 hours', desc: 'Accelerated track (5 Qs / day)' },
  { label: '2–3 hours', desc: 'Intensive boot camp (8 Qs / day)' },
  { label: 'More than 3 hours', desc: 'Full immersion (10 Qs / day)' }
];

const SKILL_LEVELS = [
  {
    id: 'Beginner',
    title: 'Beginner',
    desc: 'I need to learn the fundamentals and basic syntax.',
    startingTier: 'Novice'
  },
  {
    id: 'Elementary',
    title: 'Elementary',
    desc: 'I understand basic concepts but struggle with independent problem-solving.',
    startingTier: 'Novice'
  },
  {
    id: 'Intermediate',
    title: 'Intermediate',
    desc: 'I can solve standard DSA problems and analyze time/space complexity.',
    startingTier: 'Intermediate'
  },
  {
    id: 'Advanced',
    title: 'Advanced',
    desc: 'I can solve complex problems, explain invariants, and optimize trade-offs.',
    startingTier: 'Advanced'
  }
];

const PREFERENCES = [
  { id: 'step_by_step', label: 'Step-by-step explanations' },
  { id: 'practical_examples', label: 'Practical examples & analogies' },
  { id: 'visual_diagrams', label: 'Visual diagrams & memory layouts' },
  { id: 'code_demonstrations', label: 'Code demonstrations & traces' },
  { id: 'conceptual_explanations', label: 'Conceptual & theoretical depth' },
  { id: 'socratic_questioning', label: 'Socratic questioning & hints' },
  { id: 'practice_first', label: 'Practice-first learning' },
  { id: 'short_notes', label: 'Short concise revision notes' }
];

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  initialProfile,
  onStartDiagnostic
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  // Form State
  const [category, setCategory] = useState<string>(initialProfile?.learner_category || 'College / University Student');
  const [categoryDetails, setCategoryDetails] = useState<Record<string, string>>(initialProfile?.category_details || {});
  const [programmingExp, setProgrammingExp] = useState<string>(initialProfile?.programming_experience || '1–2 years');
  const [dsaExp, setDsaExp] = useState<string>(initialProfile?.dsa_experience || 'Have studied basic concepts');
  const [languages, setLanguages] = useState<string[]>(initialProfile?.programming_languages || ['Python']);
  const [preferredLanguage, setPreferredLanguage] = useState<string>(initialProfile?.preferred_language || 'Python');
  const [studiedConcepts, setStudiedConcepts] = useState<string[]>(initialProfile?.previously_studied_concepts || ['arrays']);
  const [goals, setGoals] = useState<string[]>(initialProfile?.primary_goals || ['Technical interviews', 'DSA fundamentals']);
  const [timeline, setTimeline] = useState<string>(initialProfile?.target_timeline || 'Within 3 months');
  const [availability, setAvailability] = useState<string>(initialProfile?.daily_availability || '30–60 minutes');
  const [skillLevel, setSkillLevel] = useState<string>(initialProfile?.self_assessed_skill_level || 'Intermediate');
  const [preferences, setPreferences] = useState<string[]>(initialProfile?.learning_preferences || ['step_by_step', 'visual_diagrams', 'code_demonstrations']);
  const [diagnosticMode, setDiagnosticMode] = useState<'quick' | 'comprehensive'>('comprehensive');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter(l => l !== lang));
      }
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const toggleConcept = (conceptId: string) => {
    if (studiedConcepts.includes(conceptId)) {
      setStudiedConcepts(studiedConcepts.filter(c => c !== conceptId));
    } else {
      setStudiedConcepts([...studiedConcepts, conceptId]);
    }
  };

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      if (goals.length > 1) {
        setGoals(goals.filter(g => g !== goal));
      }
    } else {
      setGoals([...goals, goal]);
    }
  };

  const togglePreference = (prefId: string) => {
    if (preferences.includes(prefId)) {
      if (preferences.length > 1) {
        setPreferences(preferences.filter(p => p !== prefId));
      }
    } else {
      setPreferences([...preferences, prefId]);
    }
  };

  const handleFinalSubmit = async (startAssessmentNow = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: OnboardingProfile = {
      learner_category: category,
      category_details: categoryDetails,
      programming_experience: programmingExp,
      dsa_experience: dsaExp,
      programming_languages: languages,
      preferred_language: preferredLanguage,
      previously_studied_concepts: studiedConcepts,
      primary_goals: goals,
      target_timeline: timeline,
      daily_availability: availability,
      self_assessed_skill_level: skillLevel,
      learning_preferences: preferences,
      diagnostic_mode: diagnosticMode,
      onboarding_completed: true
    };

    try {
      const response = await api.saveOnboardingProfile(payload);
      if (response && response.status === 'success') {
        onCompleted(response.profile, response.learning_path);
        onClose();
        if (startAssessmentNow && onStartDiagnostic) {
          onStartDiagnostic(diagnosticMode);
        }
      }
    } catch (err: any) {
      console.error('Failed to save onboarding profile', err);
      setErrorMessage(err.message || 'Failed to save profile. Please check your network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white border border-[#E6E9EF] shadow-2xl rounded-2xl w-full max-w-2xl my-auto flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">

        {/* Header with Progress */}
        <div className="bg-[#FAFBFD] border-b border-[#E6E9EF] p-5 sm:p-6 shrink-0">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#5B5CE2] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#172033] font-sans">
                  Personalize Your Learning Path
                </h2>
                <p className="text-xs text-[#667085]">
                  Step {step} of {totalSteps} — {
                    step === 1 ? 'Learner Category & Profile' :
                      step === 2 ? 'Programming & DSA Background' :
                        step === 3 ? 'Learning Goals & Schedule' :
                          step === 4 ? 'Self-Reported Skill Level' :
                            step === 5 ? 'Learning Preferences' :
                              'Review & Diagnostic Mode'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#E6E9EF] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#5B5CE2] h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm font-sans">

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: CATEGORY & BACKGROUND */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  What best describes you as a learner?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEARNER_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                            ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] shadow-xs ring-1 ring-[#5B5CE2]'
                            : 'bg-white border-[#E6E9EF] hover:border-slate-300 text-slate-700'
                          }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-[#5B5CE2] text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-xs sm:text-sm">{cat.label}</div>
                          <div className="text-[11px] text-[#667085] leading-tight mt-0.5">{cat.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Sub-questions based on Category */}
              <div className="pt-2 border-t border-[#E6E9EF] space-y-3">
                <div className="text-xs font-semibold text-[#172033]">
                  Additional Background (Optional):
                </div>

                {category.includes('Student') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Institution / University</label>
                      <input
                        type="text"
                        placeholder="e.g., Stanford University"
                        value={categoryDetails.institution || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, institution: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Field of Study / Major</label>
                      <input
                        type="text"
                        placeholder="e.g., Computer Science"
                        value={categoryDetails.major || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, major: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                  </div>
                )}

                {category === 'Working Professional' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Current Job Title / Role</label>
                      <input
                        type="text"
                        placeholder="e.g., Full Stack Engineer"
                        value={categoryDetails.job_title || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, job_title: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Industry / Domain</label>
                      <input
                        type="text"
                        placeholder="e.g., FinTech, SaaS, Healthcare"
                        value={categoryDetails.industry || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, industry: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                  </div>
                )}

                {category === 'Job Seeker' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Target Role</label>
                      <input
                        type="text"
                        placeholder="e.g., Software Development Engineer"
                        value={categoryDetails.target_role || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, target_role: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#667085] mb-1">Target Companies / Sectors</label>
                      <input
                        type="text"
                        placeholder="e.g., Big Tech, High-Growth Startups"
                        value={categoryDetails.target_companies || ''}
                        onChange={e => setCategoryDetails({ ...categoryDetails, target_companies: e.target.value })}
                        className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                      />
                    </div>
                  </div>
                )}

                {category === 'Independent Learner' && (
                  <div>
                    <label className="block text-xs text-[#667085] mb-1">Main Focus Area / Project Goal</label>
                    <input
                      type="text"
                      placeholder="e.g., Building algorithm intuition for personal projects"
                      value={categoryDetails.main_focus || ''}
                      onChange={e => setCategoryDetails({ ...categoryDetails, main_focus: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs focus:ring-1 focus:ring-[#5B5CE2] focus:border-[#5B5CE2] outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PROGRAMMING & DSA BACKGROUND */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  General Programming Experience
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROGRAMMING_EXPERIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setProgrammingExp(opt)}
                      className={`p-2.5 rounded-xl border text-xs text-center font-medium transition-all ${programmingExp === opt
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  DSA Problem-Solving Familiarity
                </label>
                <div className="space-y-1.5">
                  {DSA_EXPERIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDsaExp(opt)}
                      className={`w-full p-2.5 rounded-xl border text-xs text-left font-medium flex items-center justify-between transition-all ${dsaExp === opt
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] font-semibold'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span>{opt}</span>
                      {dsaExp === opt && <Check className="w-4 h-4 text-[#5B5CE2]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Programming Languages Known (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROGRAMMING_LANGUAGES.map(lang => {
                    const isSelected = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium border transition-colors ${isSelected
                            ? 'bg-[#5B5CE2] text-white border-[#5B5CE2]'
                            : 'bg-white text-slate-700 border-[#E6E9EF] hover:bg-slate-50'
                          }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Primary Language for AI Tutor Code Examples
                </label>
                <select
                  value={preferredLanguage}
                  onChange={e => setPreferredLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E6E9EF] rounded-xl text-xs bg-white text-[#172033] outline-none focus:ring-1 focus:ring-[#5B5CE2]"
                >
                  <option value="Python">Python (Clean pseudocode & algorithms)</option>
                  <option value="Java">Java (Object-oriented & enterprise)</option>
                  <option value="C++">C++ (Pointers, memory, STL & competitive)</option>
                  <option value="JavaScript / TypeScript">JavaScript / TypeScript</option>
                  <option value="C">C (Low-level pointers & primitives)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Concepts You Have Previously Studied (Optional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_CONCEPTS.map(c => {
                    const isSelected = studiedConcepts.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleConcept(c.id)}
                        className={`p-2 rounded-xl border text-[11px] text-left transition-colors flex items-center justify-between ${isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 font-medium'
                            : 'bg-white border-[#E6E9EF] text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <span className="truncate">{c.name.split('&')[0]}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GOALS & AVAILABILITY */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Primary Learning Objectives (Select all that apply)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LEARNING_GOALS.map(goal => {
                    const isSelected = goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={`p-2.5 rounded-xl border text-xs text-left font-medium flex items-center justify-between transition-colors ${isSelected
                            ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] font-semibold'
                            : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        <span>{goal}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#5B5CE2]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Target Timeline / Deadline
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIMELINE_OPTIONS.map(timeOpt => (
                    <button
                      key={timeOpt}
                      type="button"
                      onClick={() => setTimeline(timeOpt)}
                      className={`p-2 rounded-xl border text-xs text-center font-medium transition-all ${timeline === timeOpt
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#5B5CE2] font-semibold'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {timeOpt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Daily Practice Availability
                </label>
                <div className="space-y-1.5">
                  {AVAILABILITY_OPTIONS.map(avail => (
                    <button
                      key={avail.label}
                      type="button"
                      onClick={() => setAvailability(avail.label)}
                      className={`w-full p-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-all ${availability === avail.label
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] font-semibold'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#5B5CE2]" />
                        <span>{avail.label}</span>
                      </div>
                      <span className="text-[11px] text-[#667085] font-mono">{avail.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SELF-REPORTED SKILL LEVEL */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-[#172033] mb-1">
                  How would you describe your current DSA knowledge?
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-4">
                  This baseline guides your initial diagnostic challenge starting tier. Your verified proficiency level will be computed objectively from your diagnostic performance.
                </p>
              </div>

              <div className="space-y-2.5">
                {SKILL_LEVELS.map(lvl => {
                  const isSelected = skillLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSkillLevel(lvl.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${isSelected
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] shadow-xs ring-1 ring-[#5B5CE2]'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-sm text-[#172033]">{lvl.title}</div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Initial Tier: {lvl.startingTier}
                        </span>
                      </div>
                      <div className="text-xs text-[#667085]">{lvl.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Pedagogical Guarantee:</strong> Self-assessment never locks your verified skill level. Whether you report Beginner or Advanced, you will have complete freedom to demonstrate mastery across all prerequisite topics.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: LEARNING PREFERENCES */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-[#172033] mb-1">
                  How do you learn concepts best?
                </h3>
                <p className="text-xs text-[#667085] leading-relaxed mb-4">
                  LearnLoop’s AI Tutor adapts its analogies, explanations, and challenge prompts based on your preferred pedagogical styles.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PREFERENCES.map(pref => {
                  const isSelected = preferences.includes(pref.id);
                  return (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => togglePreference(pref.id)}
                      className={`p-3 rounded-xl border text-xs text-left font-medium flex items-center justify-between transition-all ${isSelected
                          ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] font-semibold'
                          : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span>{pref.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#5B5CE2]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & ASSESSMENT CHOICE */}
          {step === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-slate-50 border border-[#E6E9EF] space-y-3">
                <div className="flex items-center justify-between border-b border-[#E6E9EF] pb-2">
                  <span className="font-bold text-xs text-[#172033] uppercase tracking-wider">
                    Profile Summary
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-[#5B5CE2] hover:underline font-semibold"
                  >
                    Edit All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-[#667085]">Category:</span>
                    <div className="font-semibold text-[#172033]">{category}</div>
                  </div>
                  <div>
                    <span className="text-[#667085]">Self-Assessed Level:</span>
                    <div className="font-semibold text-[#172033]">{skillLevel}</div>
                  </div>
                  <div>
                    <span className="text-[#667085]">Primary Language:</span>
                    <div className="font-semibold text-[#172033]">{preferredLanguage}</div>
                  </div>
                  <div>
                    <span className="text-[#667085]">Daily Availability:</span>
                    <div className="font-semibold text-[#172033]">{availability}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#667085]">Primary Goals:</span>
                    <div className="font-semibold text-[#172033]">{goals.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#667085] mb-2">
                  Choose Initial Diagnostic Assessment Mode
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDiagnosticMode('quick')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${diagnosticMode === 'quick'
                        ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] ring-1 ring-[#5B5CE2]'
                        : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#172033]">Quick Diagnostic</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">6 Questions</span>
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      High-signal baseline covering 6 essential concepts (Arrays, Complexity, Linked Lists, Stacks, Trees, Recursion). ~5 minutes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiagnosticMode('comprehensive')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${diagnosticMode === 'comprehensive'
                        ? 'bg-[#EEF0FD] border-[#5B5CE2] text-[#172033] ring-1 ring-[#5B5CE2]'
                        : 'bg-white border-[#E6E9EF] text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#172033]">Comprehensive Diagnostic</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#5B5CE2] text-white">12 Questions</span>
                    </div>
                    <p className="text-[11px] text-[#667085] leading-relaxed">
                      Complete evaluation covering all 12 concepts in the LearnLoop syllabus for the highest accuracy verified level. ~12 minutes.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="bg-[#FAFBFD] border-t border-[#E6E9EF] p-3 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center justify-between sm:justify-start">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E6E9EF] bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] text-xs text-slate-500 hover:text-slate-700 px-2 font-medium cursor-pointer"
              >
                Skip for Now
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalSubmit(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#E6E9EF] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Save & Go to Dashboard
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinalSubmit(true)}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Start Diagnostic Assessment'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

