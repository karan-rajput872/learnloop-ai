import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { DiagnosticPage } from './pages/DiagnosticPage';
import { ConceptGraphPage } from './pages/ConceptGraphPage';
import { AdaptiveQuizPage } from './pages/AdaptiveQuizPage';
import { TutorChatPage } from './pages/TutorChatPage';
import { SpacedRevisionPage } from './pages/SpacedRevisionPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { LearnerProfile, HealthInfo, RevisionTask } from './types';
import { api } from './services/api';
import { createDefaultProfile } from './services/syllabusData';
import {
  GraduationCap,
  Sparkles,
  RefreshCw,
  Server,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [revisionTasks, setRevisionTasks] = useState<RevisionTask[]>([]);
  const [focusedConceptId, setFocusedConceptId] = useState<string | null>(null);

  // Connection & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflinePreview, setIsOfflinePreview] = useState<boolean>(false);
  const [bootTimer, setBootTimer] = useState<number>(0);

  const fetchProfileAndHealth = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      setIsRetrying(true);
    }

    try {
      setApiError(null);
      const [h, p, r] = await Promise.all([
        api.getHealth().catch((err) => {
          console.warn('Health check issue:', err);
          return null;
        }),
        api.getLearnerProfile().catch((err) => {
          console.warn('Profile fetch issue:', err);
          return null;
        }),
        api.getRevisionTasks().catch(() => ({ tasks: [], total: 0 }))
      ]);

      if (h) setHealthInfo(h);

      if (p) {
        setProfile(p);
        setIsOfflinePreview(false);
        setApiError(null);
      } else if (!profile && !isOfflinePreview) {
        setApiError(
          'Connecting to LearnLoop AI backend on Render. Free-tier cloud instances sleep when inactive and may take 20–40 seconds to complete a cold start.'
        );
      }

      if (r && Array.isArray(r.tasks)) {
        setRevisionTasks(r.tasks);
      }
    } catch (e: any) {
      console.error('Error fetching profile or health', e);
      if (!profile && !isOfflinePreview) {
        setApiError(e?.message || 'Network connection failed.');
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [profile, isOfflinePreview]);

  useEffect(() => {
    fetchProfileAndHealth();
    const interval = setInterval(() => {
      fetchProfileAndHealth();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchProfileAndHealth]);

  // Timer to give visual feedback during cold starts
  useEffect(() => {
    let timer: any;
    if (isLoading && !profile) {
      timer = setInterval(() => {
        setBootTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLoading, profile]);

  const handlePracticeConcept = (conceptId: string) => {
    setFocusedConceptId(conceptId);
    setActiveTab('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset your learner profile to a clean baseline for demonstration?')) {
      try {
        await api.resetLearnerProfile();
      } catch (err) {
        console.warn('Reset using offline fallback', err);
      }
      await fetchProfileAndHealth(true);
      setActiveTab('dashboard');
    }
  };

  const enableOfflinePreview = () => {
    setProfile(createDefaultProfile());
    setIsOfflinePreview(true);
    setApiError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-edu-950 text-slate-100 flex flex-col font-sans edu-grid-pattern">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        healthInfo={healthInfo}
        profile={profile}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Offline Preview Notice Banner */}
        {isOfflinePreview && (
          <div className="mb-6 p-4 rounded-2xl bg-edu-900/90 border border-purple-500/40 shadow-lg shadow-purple-500/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5 text-purple-200">
              <Eye className="w-4 h-4 text-loop-purple shrink-0" />
              <span>
                <strong>Demonstration Preview Mode:</strong> Viewing syllabus architecture with uninitialized baseline profile.
              </span>
            </div>
            <button
              onClick={() => fetchProfileAndHealth(true)}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-loop-purple hover:bg-purple-600 text-white font-bold transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Connect Live Backend
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {/* Case A: Initial Loading State (Skeleton Loader) */}
            {isLoading && !profile && !isOfflinePreview && (
              <div className="space-y-6 animate-pulse">
                {/* Cold Start Status Card */}
                <div className="p-6 rounded-3xl bg-edu-900/80 border border-edu-700 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-900/60 flex items-center justify-center text-purple-300">
                      <Server className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold font-mono text-white flex items-center gap-2">
                        <span>Connecting to LearnLoop Pedagogical Engine</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                          {bootTimer}s elapsed
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Render free-tier instances sleep when idle. Awakening container and verifying SQLite knowledge graph...
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={enableOfflinePreview}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-edu-800 hover:bg-edu-700 text-slate-200 text-xs font-mono border border-edu-600 transition-colors shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    Explore in Preview Mode
                  </button>
                </div>

                {/* Shimmer Hero Banner Skeleton */}
                <div className="h-44 rounded-3xl bg-edu-900/40 border border-edu-800/60 p-6 flex flex-col justify-center space-y-3">
                  <div className="h-4 w-40 bg-edu-800/80 rounded-full" />
                  <div className="h-8 w-80 bg-edu-800/60 rounded-xl" />
                  <div className="h-3.5 w-full max-w-md bg-edu-800/40 rounded-full" />
                </div>

                {/* Shimmer 3-Column Stats Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="h-72 rounded-2xl bg-edu-900/40 border border-edu-800/60 flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="w-36 h-36 rounded-full border-4 border-edu-800/80 border-t-purple-500 animate-spin" />
                    <div className="h-4 w-28 bg-edu-800/60 rounded-full" />
                  </div>
                  <div className="h-72 rounded-2xl bg-edu-900/40 border border-edu-800/60 p-6 space-y-3">
                    <div className="h-4 w-32 bg-edu-800/60 rounded-full" />
                    <div className="h-16 bg-edu-950/60 rounded-xl" />
                    <div className="h-16 bg-edu-950/60 rounded-xl" />
                  </div>
                  <div className="h-72 rounded-2xl bg-edu-900/40 border border-edu-800/60 p-6 space-y-3">
                    <div className="h-4 w-36 bg-edu-800/60 rounded-full" />
                    <div className="h-20 bg-edu-950/60 rounded-xl" />
                    <div className="h-20 bg-edu-950/60 rounded-xl" />
                  </div>
                </div>

                {/* Shimmer Concept Grid Skeleton */}
                <div className="h-64 rounded-2xl bg-edu-900/40 border border-edu-800/60 p-6 space-y-4">
                  <div className="h-4 w-48 bg-edu-800/60 rounded-full" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-16 bg-edu-950/60 rounded-xl border border-edu-800/40" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case B: Error State (Backend asleep or network error) */}
            {!isLoading && !profile && !isOfflinePreview && (
              <div className="max-w-2xl mx-auto my-8 p-8 rounded-3xl bg-edu-900/90 border border-purple-800/70 shadow-2xl space-y-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-purple-950 border border-purple-800 flex items-center justify-center mx-auto text-purple-400">
                  <Server className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Cloud Backend Service Notice
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-mono text-white">
                    Connecting to LearnLoop AI
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-lg mx-auto">
                    The backend is hosted on Render’s free tier. Free instances spin down after inactivity and take approximately 20–40 seconds to complete cold boot.
                  </p>
                </div>

                {apiError && (
                  <div className="p-3.5 rounded-xl bg-edu-950 border border-edu-800 text-left text-xs font-mono text-slate-400 space-y-1">
                    <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      Endpoint Target:
                    </div>
                    <div className="text-purple-300 break-all">{api.getBaseUrl()}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fetchProfileAndHealth(true)}
                    disabled={isRetrying}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-loop-purple to-loop-indigo hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    {isRetrying ? 'Connecting to Server...' : 'Retry Connection'}
                  </button>

                  <button
                    onClick={enableOfflinePreview}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-edu-800 hover:bg-edu-750 text-slate-200 font-mono text-xs border border-edu-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-purple-400" />
                    Explore in Preview Mode
                  </button>
                </div>
              </div>
            )}

            {/* Case C: Success State (Profile Loaded or in Preview) */}
            {profile && (
              <DashboardPage
                profile={profile}
                revisionTasks={revisionTasks}
                onStartDiagnostic={() => setActiveTab('diagnostic')}
                onStartQuiz={() => {
                  setFocusedConceptId(null);
                  setActiveTab('quiz');
                }}
                onViewGraph={() => setActiveTab('graph')}
                onOpenRevision={() => setActiveTab('revision')}
              />
            )}
          </>
        )}

        {/* Tab 2: Diagnostic Assessment */}
        {activeTab === 'diagnostic' && (
          <DiagnosticPage
            onComplete={() => {
              fetchProfileAndHealth();
              setActiveTab('graph');
            }}
          />
        )}

        {/* Tab 3: Concept Graph */}
        {activeTab === 'graph' && (
          <ConceptGraphPage onPracticeConcept={handlePracticeConcept} />
        )}

        {/* Tab 4: Adaptive Quiz */}
        {activeTab === 'quiz' && (
          <AdaptiveQuizPage
            initialConceptId={focusedConceptId}
            onRefreshProfile={fetchProfileAndHealth}
          />
        )}

        {/* Tab 5: AI Tutor */}
        {activeTab === 'tutor' && <TutorChatPage />}

        {/* Tab 6: Spaced Revision */}
        {activeTab === 'revision' && (
          <SpacedRevisionPage onPracticeConcept={handlePracticeConcept} />
        )}

        {/* Tab 7: Teacher Dashboard */}
        {activeTab === 'teacher' && <TeacherDashboardPage />}
      </main>

      {/* Educational Platform Footer */}
      <footer className="bg-edu-950 border-t border-edu-800 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <GraduationCap className="w-4 h-4 text-loop-purple" />
            <span className="font-bold text-white">LearnLoop AI</span>
            <span>—</span>
            <span className="text-slate-400">
              &quot;Don&apos;t just learn the answers. Master the concepts.&quot;
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Adaptive Learner Model</span>
            <span>•</span>
            <span>Prerequisite Concept Graph</span>
            <span>•</span>
            <span>Misconception Diagnostics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
