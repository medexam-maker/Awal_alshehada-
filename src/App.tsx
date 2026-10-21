import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './client/context/AuthContext';
import { ExamProvider, useExam } from './client/context/ExamContext';
import { Layout } from './client/components/layout/Layout';
import { Login } from './client/pages/Login';
import { Register } from './client/pages/Register';
import { Subjects } from './client/pages/Subjects';
import { ExamSetup } from './client/pages/ExamSetup';
import { ExamAttempt } from './client/pages/ExamAttempt';
import { Results } from './client/pages/Results';
import { Profile } from './client/pages/Profile';
import { ExamReview } from './client/pages/ExamReview';
import { ExamLandingPage } from './client/pages/ExamLandingPage';
import { AdminDashboard } from './client/pages/admin/AdminDashboard';
import { ContractSubject, TWELVE_CONTRACT_SUBJECTS } from './client/data/contractSubjects';

type AppView = 'subjects' | 'exam_setup' | 'exam_attempt' | 'results' | 'admin' | 'profile' | 'exam_review' | 'exam_landing';

function parseExamUrl(pathname: string): { subjectSlug: string; year: number } | null {
  const match = pathname.match(/^\/exams\/([a-z0-9-]+)(?:\/(\d{4}))?\/?$/i);
  if (!match) return null;
  const subjectSlug = match[1];
  const year = match[2] ? parseInt(match[2], 10) : 2023;
  return { subjectSlug, year };
}

function AppRouter() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeAttempt, lastResult, startNewExam } = useExam();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const [landingParams, setLandingParams] = useState<{ subjectSlug: string; year: number } | null>(() => {
    if (typeof window !== 'undefined') {
      return parseExamUrl(window.location.pathname);
    }
    return null;
  });
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined' && parseExamUrl(window.location.pathname)) {
      return 'exam_landing';
    }
    return 'subjects';
  });
  const [selectedSubject, setSelectedSubject] = useState<{
    subject: ContractSubject;
    dbId?: string;
  }>({
    subject: TWELVE_CONTRACT_SUBJECTS[0],
  });

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseExamUrl(window.location.pathname);
      if (parsed) {
        setLandingParams(parsed);
        setCurrentView('exam_landing');
      } else if (window.location.pathname === '/' || window.location.pathname === '') {
        setLandingParams(null);
        setCurrentView('subjects');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToExamLanding = (slug: string, yr: number) => {
    setLandingParams({ subjectSlug: slug, year: yr });
    setCurrentView('exam_landing');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/exams/${slug}/${yr}`);
    }
  };

  const navigateHome = () => {
    setLandingParams(null);
    setCurrentView('subjects');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">جاري تحميل منصة أول الشهادة...</div>
        </div>
      </div>
    );
  }

  // Public Landing Page for Subject + Year (/exams/:subjectSlug/:year)
  // Indexable by Google and accessible without login barrier
  if (currentView === 'exam_landing' && landingParams) {
    return (
      <Layout
        onNavigateHome={navigateHome}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenProfile={() => setCurrentView('profile')}
      >
        <ExamLandingPage
          subjectSlug={landingParams.subjectSlug}
          year={landingParams.year}
          onStartExam={(sub, yr) => {
            setSelectedSubject({ subject: sub });
            if (!isAuthenticated) {
              // Prompt user smoothly or let them setup
              setCurrentView('exam_setup');
            } else {
              startNewExam(sub.slug, 'training', 'training', 'yearly', yr, sub.slug).then((res) => {
                if (res.success) {
                  setCurrentView('exam_attempt');
                } else {
                  setCurrentView('exam_setup');
                }
              });
            }
          }}
          onNavigateYear={(slug, yr) => navigateToExamLanding(slug, yr)}
          onBackToSubjects={navigateHome}
        />
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout hideHeader>
        {authPage === 'login' ? (
          <Login onGoToRegister={() => setAuthPage('register')} />
        ) : (
          <Register onGoToLogin={() => setAuthPage('login')} />
        )}
      </Layout>
    );
  }

  // Active exam in progress: ExamAttempt view
  if (activeAttempt || currentView === 'exam_attempt') {
    return (
      <Layout hideHeader>
        <ExamAttempt
          onFinishExam={() => setCurrentView('results')}
          onExitExam={() => setCurrentView('subjects')}
        />
      </Layout>
    );
  }

  // Admin Dashboard View
  if (currentView === 'admin') {
    return (
      <Layout
        onNavigateHome={() => setCurrentView('subjects')}
        onOpenAdmin={() => setCurrentView('subjects')}
        onOpenProfile={() => setCurrentView('profile')}
        isAdminView
      >
        <AdminDashboard onBackToStudentView={() => setCurrentView('subjects')} />
      </Layout>
    );
  }

  // User Profile View
  if (currentView === 'profile') {
    return (
      <Layout
        onNavigateHome={() => setCurrentView('subjects')}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenProfile={() => setCurrentView('profile')}
      >
        <Profile onBackToSubjects={() => setCurrentView('subjects')} />
      </Layout>
    );
  }

  // Exam Review View
  if (currentView === 'exam_review') {
    return (
      <Layout
        onNavigateHome={() => setCurrentView('subjects')}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenProfile={() => setCurrentView('profile')}
      >
        <ExamReview
          onBackToResults={() => setCurrentView('results')}
          onBackToSubjects={() => setCurrentView('subjects')}
        />
      </Layout>
    );
  }

  // Exam result view
  if (currentView === 'results' && lastResult) {
    return (
      <Layout
        onNavigateHome={() => setCurrentView('subjects')}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenProfile={() => setCurrentView('profile')}
      >
        <Results
          onBackToSubjects={() => setCurrentView('subjects')}
          onOpenReview={() => setCurrentView('exam_review')}
        />
      </Layout>
    );
  }

  // Exam Setup view
  if (currentView === 'exam_setup' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => setCurrentView('subjects')}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenProfile={() => setCurrentView('profile')}
      >
        <ExamSetup
          subject={selectedSubject.subject}
          dbSubjectId={selectedSubject.dbId}
          onBackToSubjects={() => setCurrentView('subjects')}
          onExamStarted={() => setCurrentView('exam_attempt')}
        />
      </Layout>
    );
  }

  // Default: Subjects listing view
  return (
    <Layout
      onNavigateHome={() => setCurrentView('subjects')}
      onOpenAdmin={() => setCurrentView('admin')}
      onOpenProfile={() => setCurrentView('profile')}
    >
      <Subjects
        onSelectSubject={(subject, dbId) => {
          setSelectedSubject({ subject, dbId });
          setCurrentView('exam_setup');
        }}
        onResumeExam={() => setCurrentView('exam_attempt')}
        onOpenAdmin={() => setCurrentView('admin')}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ExamProvider>
        <AppRouter />
      </ExamProvider>
    </AuthProvider>
  );
}
