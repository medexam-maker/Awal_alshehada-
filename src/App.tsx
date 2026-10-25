import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './client/context/AuthContext';
import { ExamProvider, useExam } from './client/context/ExamContext';
import { Layout } from './client/components/layout/Layout';
import { Login } from './client/pages/Login';
import { Register } from './client/pages/Register';
import { Subjects } from './client/pages/Subjects';
import { ExamSetupPage } from './client/pages/ExamSetupPage';
import { TrainingSetupPage } from './client/pages/TrainingSetupPage';
import { ComprehensivePage } from './client/pages/ComprehensivePage';
import { YearsPage } from './client/pages/YearsPage';
import { SimulatorPage } from './client/pages/SimulatorPage';
import { ExamAttempt } from './client/pages/ExamAttempt';
import { Results } from './client/pages/Results';
import { Profile } from './client/pages/Profile';
import { ExamReview } from './client/pages/ExamReview';
import { ExamLandingPage } from './client/pages/ExamLandingPage';
import { AdminDashboard } from './client/pages/admin/AdminDashboard';
import { ContractSubject, TWELVE_CONTRACT_SUBJECTS } from './client/data/contractSubjects';
import { ShieldAlert, AlertCircle, X } from 'lucide-react';

type AppView =
  | 'subjects'
  | 'exam_setup'
  | 'training_setup'
  | 'comprehensive'
  | 'years'
  | 'simulator'
  | 'exam_attempt'
  | 'results'
  | 'admin'
  | 'profile'
  | 'exam_review'
  | 'exam_landing';

function parseExamUrl(pathname: string): { subjectSlug: string; year: number } | null {
  const match = pathname.match(/^\/exams\/([a-z0-9-]+)(?:\/(\d{4}))?\/?$/i);
  if (!match) return null;
  const subjectSlug = match[1];
  const year = match[2] ? parseInt(match[2], 10) : 2023;
  return { subjectSlug, year };
}

function parseAppPath(pathname: string): { view: AppView; landingParams?: { subjectSlug: string; year: number } } {
  const landing = parseExamUrl(pathname);
  if (landing) {
    return { view: 'exam_landing', landingParams: landing };
  }
  if (pathname === '/exam/training/comprehensive') {
    return { view: 'comprehensive' };
  }
  if (pathname === '/exam/training/years') {
    return { view: 'years' };
  }
  if (pathname === '/exam/training') {
    return { view: 'training_setup' };
  }
  if (pathname === '/exam/simulator') {
    return { view: 'simulator' };
  }
  if (pathname === '/exam/setup') {
    return { view: 'exam_setup' };
  }
  if (pathname === '/exam/attempt') {
    return { view: 'exam_attempt' };
  }
  if (pathname === '/exam/results' || pathname === '/results') {
    return { view: 'results' };
  }
  if (pathname === '/exam/review') {
    return { view: 'exam_review' };
  }
  if (pathname === '/profile') {
    return { view: 'profile' };
  }
  if (pathname === '/admin') {
    return { view: 'admin' };
  }
  return { view: 'subjects' };
}

function AppRouter() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { activeAttempt, lastResult, startNewExam, isLoading: isExamLoading } = useExam();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');
  const isAdmin = user?.role === 'admin';
  const handleOpenAdmin = isAdmin ? () => navigateTo('admin', '/admin') : undefined;

  const [landingParams, setLandingParams] = useState<{ subjectSlug: string; year: number } | null>(() => {
    if (typeof window !== 'undefined') {
      return parseExamUrl(window.location.pathname);
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      return parseAppPath(window.location.pathname).view;
    }
    return 'subjects';
  });

  const [selectedSubject, setSelectedSubject] = useState<{
    subject: ContractSubject;
    dbId?: string;
  }>({
    subject: TWELVE_CONTRACT_SUBJECTS[0],
  });

  const [bankError, setBankError] = useState<string | null>(null);

  const navigateTo = (view: AppView, path?: string) => {
    setBankError(null);
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const urlMap: Record<AppView, string> = {
        subjects: '/',
        exam_setup: '/exam/setup',
        training_setup: '/exam/training',
        comprehensive: '/exam/training/comprehensive',
        years: '/exam/training/years',
        simulator: '/exam/simulator',
        exam_attempt: '/exam/attempt',
        results: '/exam/results',
        admin: '/admin',
        profile: '/profile',
        exam_review: '/exam/review',
        exam_landing: '/exams',
      };
      const targetUrl = path || urlMap[view] || '/';
      window.history.pushState({}, '', targetUrl);
    }
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('subjects', '/');
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppPath(window.location.pathname);
      if (parsed.landingParams) {
        setLandingParams(parsed.landingParams);
      }
      setCurrentView(parsed.view);
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
    setBankError(null);
    setLandingParams(null);
    navigateTo('subjects', '/');
  };

  const renderBankErrorToast = () => {
    if (!bankError) return null;
    return (
      <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 p-4 bg-amber-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-2.5 font-bold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{bankError}</span>
        </div>
        <button
          type="button"
          onClick={() => setBankError(null)}
          className="p-1 hover:bg-amber-700 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
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
        onOpenAdmin={handleOpenAdmin}
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
  if (currentView === 'exam_attempt') {
    return (
      <Layout hideHeader>
        <ExamAttempt
          onFinishExam={() => navigateTo('results', '/exam/results')}
          onExitExam={() => navigateTo('subjects', '/')}
        />
      </Layout>
    );
  }

  // Admin Dashboard View - Strictly Guarded by User Role
  if (currentView === 'admin') {
    if (!isAuthenticated || !user) {
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
    if (user.role !== 'admin') {
      return (
        <Layout
          onNavigateHome={() => navigateTo('subjects', '/')}
          onOpenAdmin={handleOpenAdmin}
          onOpenProfile={() => navigateTo('profile', '/profile')}
        >
          <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="p-8 text-center max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-black text-slate-900">غير مصرح</h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                هذه الصفحة للمسؤولين فقط. حسابك الحالي مسجل كطالب.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('subjects', '/')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer shadow-xs"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </Layout>
      );
    }
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={() => navigateTo('subjects', '/')}
        onOpenProfile={() => navigateTo('profile', '/profile')}
        isAdminView
      >
        <AdminDashboard onBackToStudentView={() => navigateTo('subjects', '/')} />
      </Layout>
    );
  }

  // User Profile View
  if (currentView === 'profile') {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        <Profile onBackToSubjects={() => navigateTo('subjects', '/')} />
      </Layout>
    );
  }

  // Exam Review View
  if (currentView === 'exam_review') {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        <ExamReview
          onBackToResults={() => navigateTo('results', '/exam/results')}
          onBackToSubjects={() => navigateTo('subjects', '/')}
        />
      </Layout>
    );
  }

  // Exam result view
  if (currentView === 'results' && lastResult) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        <Results
          onBackToSubjects={() => navigateTo('subjects', '/')}
          onOpenReview={() => navigateTo('exam_review', '/exam/review')}
        />
      </Layout>
    );
  }

  // Step 1: Exam Setup Page (امتحان تدريبي vs محاكاة كاملة)
  if (currentView === 'exam_setup' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        <ExamSetupPage
          subject={selectedSubject.subject}
          dbSubjectId={selectedSubject.dbId}
          onBack={goBack}
          onSelectTraining={() => navigateTo('training_setup', '/exam/training')}
          onSelectSimulator={() => navigateTo('simulator', '/exam/simulator')}
          onOpenAdmin={handleOpenAdmin}
          onOpenProfile={() => navigateTo('profile', '/profile')}
        />
      </Layout>
    );
  }

  // Step 2: Training Setup Page (شامل من المقرر vs سنوات سابقة)
  if (currentView === 'training_setup' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        <TrainingSetupPage
          subject={selectedSubject.subject}
          onBack={goBack}
          onSelectComprehensive={() => navigateTo('comprehensive', '/exam/training/comprehensive')}
          onSelectYears={() => navigateTo('years', '/exam/training/years')}
        />
      </Layout>
    );
  }

  // Step 3A: Comprehensive Page (شامل من المقرر)
  if (currentView === 'comprehensive' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        {renderBankErrorToast()}
        <ComprehensivePage
          subject={selectedSubject.subject}
          onBack={goBack}
          isLoading={isExamLoading}
          onStartExam={async () => {
            const res = await startNewExam(
              selectedSubject.dbId || selectedSubject.subject.slug,
              'training',
              'training',
              'curriculum_review',
              undefined,
              selectedSubject.subject.slug,
              user?.id
            );
            if (res.success) {
              navigateTo('exam_attempt', '/exam/attempt');
            } else {
              setBankError(res.error || 'بنك الأسئلة لهذه المادة سيتوفر قريباً');
            }
          }}
        />
      </Layout>
    );
  }

  // Step 3B: Years Page (سنوات سابقة 2000-2026)
  if (currentView === 'years' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        {renderBankErrorToast()}
        <YearsPage
          subject={selectedSubject.subject}
          onBack={goBack}
          isLoading={isExamLoading}
          onStartExam={async (year) => {
            const res = await startNewExam(
              selectedSubject.dbId || selectedSubject.subject.slug,
              'training',
              'training',
              'yearly',
              year,
              selectedSubject.subject.slug,
              user?.id
            );
            if (res.success) {
              navigateTo('exam_attempt', '/exam/attempt');
            } else {
              setBankError(res.error || 'بنك الأسئلة لهذه المادة سيتوفر قريباً');
            }
          }}
        />
      </Layout>
    );
  }

  // Step 3C: Simulator Page (محاكاة كاملة رسمية)
  if (currentView === 'simulator' && selectedSubject) {
    return (
      <Layout
        onNavigateHome={() => navigateTo('subjects', '/')}
        onOpenAdmin={handleOpenAdmin}
        onOpenProfile={() => navigateTo('profile', '/profile')}
      >
        {renderBankErrorToast()}
        <SimulatorPage
          subject={selectedSubject.subject}
          onBack={goBack}
          isLoading={isExamLoading}
          onStartExam={async () => {
            const res = await startNewExam(
              selectedSubject.dbId || selectedSubject.subject.slug,
              'comprehensive',
              'simulator',
              undefined,
              undefined,
              selectedSubject.subject.slug,
              user?.id
            );
            if (res.success) {
              navigateTo('exam_attempt', '/exam/attempt');
            } else {
              setBankError(res.error || 'بنك الأسئلة لهذه المادة سيتوفر قريباً');
            }
          }}
        />
      </Layout>
    );
  }

  // Default: Subjects listing view
  return (
    <Layout
      onNavigateHome={() => navigateTo('subjects', '/')}
      onOpenAdmin={handleOpenAdmin}
      onOpenProfile={() => navigateTo('profile', '/profile')}
    >
      {renderBankErrorToast()}
      <Subjects
        onSelectSubject={(subject, dbId) => {
          setSelectedSubject({ subject, dbId });
          navigateTo('exam_setup', '/exam/setup');
        }}
        onResumeExam={() => navigateTo('exam_attempt', '/exam/attempt')}
        onOpenAdmin={handleOpenAdmin}
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
