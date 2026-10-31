import React, { useState, useEffect } from 'react';
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
import { GraduationCap } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [revisionTasks, setRevisionTasks] = useState<RevisionTask[]>([]);
  const [focusedConceptId, setFocusedConceptId] = useState<string | null>(null);

  const fetchProfileAndHealth = async () => {
    try {
      const [h, p, r] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getLearnerProfile().catch(() => null),
        api.getRevisionTasks().catch(() => ({ tasks: [], total: 0 }))
      ]);

      if (h) setHealthInfo(h);
      if (p) setProfile(p);
      if (r) setRevisionTasks(r.tasks);
    } catch (e) {
      console.error('Error fetching profile or health', e);
    }
  };

  useEffect(() => {
    fetchProfileAndHealth();
    const interval = setInterval(fetchProfileAndHealth, 25000);
    return () => clearInterval(interval);
  }, []);

  const handlePracticeConcept = (conceptId: string) => {
    setFocusedConceptId(conceptId);
    setActiveTab('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset your learner profile to a clean slate for demonstration?")) {
      await api.resetLearnerProfile();
      await fetchProfileAndHealth();
      setActiveTab('dashboard');
    }
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
        {activeTab === 'dashboard' && profile && (
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

        {activeTab === 'diagnostic' && (
          <DiagnosticPage
            onComplete={() => {
              fetchProfileAndHealth();
              setActiveTab('graph');
            }}
          />
        )}

        {activeTab === 'graph' && (
          <ConceptGraphPage
            onPracticeConcept={handlePracticeConcept}
          />
        )}

        {activeTab === 'quiz' && (
          <AdaptiveQuizPage
            initialConceptId={focusedConceptId}
            onRefreshProfile={fetchProfileAndHealth}
          />
        )}

        {activeTab === 'tutor' && (
          <TutorChatPage />
        )}

        {activeTab === 'revision' && (
          <SpacedRevisionPage
            onPracticeConcept={handlePracticeConcept}
          />
        )}

        {activeTab === 'teacher' && (
          <TeacherDashboardPage />
        )}
      </main>

      {/* Educational Platform Footer */}
      <footer className="bg-edu-950 border-t border-edu-800 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <GraduationCap className="w-4 h-4 text-loop-purple" />
            <span className="font-bold text-white">LearnLoop AI</span>
            <span>—</span>
            <span className="text-slate-400">&quot;Don&apos;t just learn the answers. Master the concepts.&quot;</span>
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
