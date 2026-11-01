import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { MyProfileModal } from './components/MyProfileModal';
import { LandingPage } from './pages/LandingPage';
import { SettingsModal } from './components/SettingsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PrivacySecurityModal } from './components/PrivacySecurityModal';
import { HelpSupportModal } from './components/HelpSupportModal';
import { TermsPrivacyModal } from './components/TermsPrivacyModal';
import { LiveVideoModal } from './components/LiveVideoModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [revisionTasks, setRevisionTasks] = useState<RevisionTask[]>([]);
  const [focusedConceptId, setFocusedConceptId] = useState<string | null>(null);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isPrivacySecurityOpen, setIsPrivacySecurityOpen] = useState<boolean>(false);
  const [isHelpSupportOpen, setIsHelpSupportOpen] = useState<boolean>(false);
  const [isTermsPrivacyOpen, setIsTermsPrivacyOpen] = useState<boolean>(false);
  const [isLiveVideoOpen, setIsLiveVideoOpen] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  const [diagnosticInitialMode, setDiagnosticInitialMode] = useState<'quick' | 'comprehensive'>('comprehensive');

  const { user, isAuthenticated, openAuthModal, startDemoSession } = useAuth();

  // Connection & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOfflinePreview, setIsOfflinePreview] = useState<boolean>(false);
  const [bootTimer, setBootTimer] = useState<number>(0);
  const profileRef = useRef<LearnerProfile | null>(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

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
      } else if (!profileRef.current && !isOfflinePreview) {
        setApiError(
          'Connecting to LearnLoop AI backend on Render. Free-tier cloud instances sleep when inactive and may take 20–40 seconds to complete a cold start.'
        );
      }

      if (r && Array.isArray(r.tasks)) {
        setRevisionTasks(r.tasks);
      }
    } catch (e: any) {
      console.error('Error fetching profile or health', e);
      if (!profileRef.current && !isOfflinePreview) {
        setApiError(e?.message || 'Network connection failed.');
      }
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [isOfflinePreview]);

  useEffect(() => {
    fetchProfileAndHealth();
  }, [user]);

  useEffect(() => {
    if (user && profile && profile.onboarding_completed === false && !onboardingDismissed) {
      setIsOnboardingOpen(true);
    }
  }, [user, profile, onboardingDismissed]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchProfileAndHealth();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchProfileAndHealth]);

  const refreshNotificationsCount = useCallback(() => {
    if (user) {
      api.getUserNotifications(user.student_id)
        .then((items) => {
          if (Array.isArray(items)) {
            setUnreadNotificationsCount(items.filter((n) => !n.is_read).length);
          }
        })
        .catch(() => {});
    } else {
      setUnreadNotificationsCount(0);
    }
  }, [user]);

  useEffect(() => {
    refreshNotificationsCount();
  }, [user, refreshNotificationsCount]);

  // Protected route guard: If visitor is unauthenticated and on a protected tab, redirect to landing dashboard
  useEffect(() => {
    if (!isAuthenticated && !user && activeTab !== 'dashboard' && activeTab !== 'teacher') {
      setActiveTab('dashboard');
      openAuthModal('login');
    }
  }, [isAuthenticated, user, activeTab, openAuthModal]);

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
    <div className="min-h-screen bg-[#F7F8FA] text-[#172033] flex flex-col font-sans edu-grid-pattern">
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
        onRefresh={() => fetchProfileAndHealth(true)}
        isRefreshing={isRetrying}
        onOpenMyProfile={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPreferences={() => setIsOnboardingOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenPrivacySecurity={() => setIsPrivacySecurityOpen(true)}
        onOpenHelpSupport={() => setIsHelpSupportOpen(true)}
        onOpenTermsPrivacy={() => setIsTermsPrivacyOpen(true)}
        onOpenLiveVideo={() => setIsLiveVideoOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Offline Preview Notice Banner */}
        {isOfflinePreview && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-amber-900">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Demonstration Preview Mode:</strong> Viewing syllabus architecture with uninitialized baseline profile.
              </span>
            </div>
            <button
              onClick={() => fetchProfileAndHealth(true)}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium transition-all shrink-0 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Connect Live Backend
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {/* Case 0: Unauthenticated visitor sees professional Landing Page */}
            {!isAuthenticated && !user ? (
              <LandingPage
                onOpenRegister={() => openAuthModal('register')}
                onOpenLogin={() => openAuthModal('login')}
                onOpenTermsPrivacy={() => setIsTermsPrivacyOpen(true)}
                onOpenHelpSupport={() => setIsHelpSupportOpen(true)}
                onOpenLiveVideo={() => setIsLiveVideoOpen(true)}
              />
            ) : (
              <>
                {/* Case A: Initial Loading State (Skeleton Loader) */}
            {isLoading && !profile && !isOfflinePreview && (
              <div className="space-y-6 animate-pulse">
                {/* Cold Start Status Card */}
                <div className="p-6 rounded-2xl bg-white border border-[#E6E9EF] shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EEF0FD] flex items-center justify-center text-[#5B5CE2]">
                      <Server className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-[#172033] flex items-center gap-2 font-sans">
                        <span>Connecting to LearnLoop Pedagogical Engine</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono">
                          {bootTimer}s elapsed
                        </span>
                      </h2>
                      <p className="text-xs text-[#667085] mt-1 font-sans">
                        Render free-tier instances sleep when idle. Awakening container and verifying SQLite knowledge graph...
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={enableOfflinePreview}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#172033] text-xs font-medium border border-[#E6E9EF] transition-colors shrink-0 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#5B5CE2]" />
                    Explore in Preview Mode
                  </button>
                </div>

                {/* Shimmer Hero Banner Skeleton */}
                <div className="h-44 rounded-2xl bg-white border border-[#E6E9EF] p-6 flex flex-col justify-center space-y-3 shadow-card">
                  <div className="h-4 w-40 bg-slate-200 rounded-full" />
                  <div className="h-8 w-80 bg-slate-200 rounded-xl" />
                  <div className="h-3.5 w-full max-w-md bg-slate-100 rounded-full" />
                </div>

                {/* Shimmer 3-Column Stats Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="h-72 rounded-2xl bg-white border border-[#E6E9EF] flex flex-col items-center justify-center p-6 space-y-4 shadow-card">
                    <div className="w-36 h-36 rounded-full border-4 border-slate-100 border-t-[#5B5CE2] animate-spin" />
                    <div className="h-4 w-28 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-72 rounded-2xl bg-white border border-[#E6E9EF] p-6 space-y-3 shadow-card">
                    <div className="h-4 w-32 bg-slate-200 rounded-full" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                  </div>
                  <div className="h-72 rounded-2xl bg-white border border-[#E6E9EF] p-6 space-y-3 shadow-card">
                    <div className="h-4 w-36 bg-slate-200 rounded-full" />
                    <div className="h-20 bg-slate-100 rounded-xl" />
                    <div className="h-20 bg-slate-100 rounded-xl" />
                  </div>
                </div>

                {/* Shimmer Concept Grid Skeleton */}
                <div className="h-64 rounded-2xl bg-white border border-[#E6E9EF] p-6 space-y-4 shadow-card">
                  <div className="h-4 w-48 bg-slate-200 rounded-full" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-16 bg-slate-100 rounded-xl border border-slate-200" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case B: Error State (Backend asleep or network error) */}
            {!isLoading && !profile && !isOfflinePreview && (
              <div className="max-w-2xl mx-auto my-8 p-8 rounded-2xl bg-white border border-[#E6E9EF] shadow-card space-y-6 text-center animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-[#EEF0FD] border border-[#C7D2FE] flex items-center justify-center mx-auto text-[#5B5CE2]">
                  <Server className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] text-xs font-mono font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#5B5CE2]" />
                    Cloud Backend Service Notice
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-sans text-[#172033]">
                    Connecting to LearnLoop AI
                  </h2>
                  <p className="text-xs sm:text-sm text-[#667085] leading-relaxed font-sans max-w-lg mx-auto">
                    The backend is hosted on Render’s free tier. Free cloud instances sleep after inactivity and require 20–40 seconds to complete a cold start.
                  </p>
                </div>

                {apiError && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-left text-xs font-mono text-[#667085] space-y-1">
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Endpoint Target:
                    </div>
                    <div className="text-[#5B5CE2] break-all">{api.getBaseUrl()}</div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fetchProfileAndHealth(true)}
                    disabled={isRetrying}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                    {isRetrying ? 'Connecting to Server...' : 'Retry Connection'}
                  </button>

                  <button
                    onClick={enableOfflinePreview}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#172033] font-medium text-xs border border-[#E6E9EF] transition-colors shadow-xs"
                  >
                    <Eye className="w-4 h-4 text-[#5B5CE2]" />
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
                onStartDiagnostic={() => {
                  setDiagnosticInitialMode('comprehensive');
                  setActiveTab('diagnostic');
                }}
                onStartQuiz={() => {
                  setFocusedConceptId(null);
                  setActiveTab('quiz');
                }}
                onViewGraph={() => setActiveTab('graph')}
                onOpenRevision={() => setActiveTab('revision')}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                onOpenOnboarding={() => setIsOnboardingOpen(true)}
              />
            )}
              </>
            )}
          </>
        )}

        {/* Tab 2: Diagnostic Assessment */}
        {activeTab === 'diagnostic' && (
          <DiagnosticPage
            initialMode={diagnosticInitialMode}
            onComplete={() => {
              fetchProfileAndHealth();
            }}
            onNavigateToDashboard={() => {
              fetchProfileAndHealth();
              setActiveTab('dashboard');
            }}
            onRefreshProfile={() => fetchProfileAndHealth()}
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
        {activeTab === 'tutor' && <TutorChatPage onOpenLiveVideo={() => setIsLiveVideoOpen(true)} />}

        {/* Tab 6: Spaced Revision */}
        {activeTab === 'revision' && (
          <SpacedRevisionPage onPracticeConcept={handlePracticeConcept} />
        )}

        {/* Tab 7: Teacher Dashboard */}
        {activeTab === 'teacher' && (
          <TeacherDashboardPage onNavigateToTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        )}
      </main>

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          setOnboardingDismissed(true);
        }}
        initialProfile={profile?.onboarding_data}
        onCompleted={(updatedProfile) => {
          setProfile(updatedProfile);
          setIsOnboardingOpen(false);
          fetchProfileAndHealth();
        }}
        onStartDiagnostic={(chosenMode) => {
          setDiagnosticInitialMode(chosenMode);
          setActiveTab('diagnostic');
        }}
      />

      {/* My Learning Profile Modal */}
      <MyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onOpenEditWizard={() => setIsOnboardingOpen(true)}
        onStartDiagnostic={(chosenMode) => {
          setDiagnosticInitialMode(chosenMode || 'comprehensive');
          setActiveTab('diagnostic');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onSettingsSaved={() => fetchProfileAndHealth(true)}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        studentId={user?.student_id}
        onNotificationsUpdated={refreshNotificationsCount}
      />

      {/* Privacy & Security Architecture Modal */}
      <PrivacySecurityModal
        isOpen={isPrivacySecurityOpen}
        onClose={() => setIsPrivacySecurityOpen(false)}
      />

      {/* Help & Support Guide Modal */}
      <HelpSupportModal
        isOpen={isHelpSupportOpen}
        onClose={() => setIsHelpSupportOpen(false)}
      />

      {/* Terms & Privacy Modal */}
      <TermsPrivacyModal
        isOpen={isTermsPrivacyOpen}
        onClose={() => setIsTermsPrivacyOpen(false)}
      />

      {/* Explore Live Video Visual Problem Solver Modal */}
      <LiveVideoModal
        isOpen={isLiveVideoOpen}
        onClose={() => setIsLiveVideoOpen(false)}
        initialConceptId={focusedConceptId || 'binary_trees'}
        studentId={user?.student_id}
      />

      {/* Educational Platform Footer */}
      <footer className="bg-white border-t border-[#E6E9EF] py-6 text-center text-xs text-[#667085] font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#667085]">
            <GraduationCap className="w-4 h-4 text-[#5B5CE2]" />
            <span className="font-bold text-[#172033]">LearnLoop AI</span>
            <span>—</span>
            <span>
              &quot;Don&apos;t just learn the answers. Master the concepts.&quot;
            </span>
          </div>

          <div className="flex items-center gap-3 text-[#667085] font-mono text-[11px]">
            <button
              onClick={() => setIsPrivacySecurityOpen(true)}
              className="hover:text-[#5B5CE2] transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Privacy & Security
            </button>
            <span>•</span>
            <button
              onClick={() => setIsTermsPrivacyOpen(true)}
              className="hover:text-[#5B5CE2] transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              onClick={() => setIsHelpSupportOpen(true)}
              className="hover:text-[#5B5CE2] transition-colors underline-offset-2 hover:underline cursor-pointer"
            >
              Help & Shortcuts
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
