import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LoginProps {
  onGoToRegister: () => void;
}

type AuthView = 'login' | 'forgot' | 'reset';

export const Login: React.FC<LoginProps> = ({ onGoToRegister }) => {
  const { login, loginAsGuest, isDemoAllowed, isLoading, forgotPassword, resetPassword } = useAuth();
  const [view, setView] = useState<AuthView>('login');

  // Login form state
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('awal_remembered_email') || '';
  });
  const [rememberEmail, setRememberEmail] = useState(() => {
    return !!localStorage.getItem('awal_remembered_email');
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  // Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingRecovery, setIsSubmittingRecovery] = useState(false);
  const [devResetCode, setDevResetCode] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState<boolean>(true);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        // حفظ أو حذف البريد الإلكتروني في التخزين المحلي بناءً على رغبة المستخدم
        if (rememberEmail) {
          localStorage.setItem('awal_remembered_email', email);
        } else {
          localStorage.removeItem('awal_remembered_email');
        }
      } else {
        setError(res.error || 'فشل تسجيل الدخول');
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetCode(null);

    if (!recoveryEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setIsSubmittingRecovery(true);
    try {
      const res = await forgotPassword(recoveryEmail);
      if (res.success) {
        setEmailConfigured(res.emailConfigured ?? false);
        if (res.devCode) {
          setDevResetCode(res.devCode);
        }
        setSuccessMessage(res.message || 'تم تجهيز رمز استعادة كلمة المرور.');
        setView('reset');
      } else {
        setError(res.error || 'تعذر معالجة طلب استعادة كلمة المرور.');
      }
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!recoveryEmail || !resetCode || !newPassword) {
      setError('يرجى إدخال البريد الإلكتروني، ورمز التحقق، وكلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 8) {
      setError('يجب أن لا تقل كلمة المرور الجديدة عن 8 أحرف');
      return;
    }

    setIsSubmittingRecovery(true);
    try {
      const res = await resetPassword({
        email: recoveryEmail,
        resetCode,
        newPassword,
      });

      if (res.success) {
        setSuccessMessage(res.message || 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.');
        setEmail(recoveryEmail);
        setPassword('');
        setResetCode('');
        setNewPassword('');
        setDevResetCode(null);
        setView('login');
      } else {
        setError(res.error || 'تعذر إعادة تعيين كلمة المرور.');
      }
    } finally {
      setIsSubmittingRecovery(false);
    }
  };

  const resetAllViews = (targetView: AuthView) => {
    setError(null);
    setSuccessMessage(null);
    setDevResetCode(null);
    setView(targetView);
  };

  return (
    <div className="max-w-md w-full mx-auto my-auto py-10 px-4">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
        {/* Brand visual */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white flex items-center justify-center mx-auto shadow-md">
            {view === 'login' ? (
              <GraduationCap className="w-9 h-9" />
            ) : (
              <KeyRound className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {view === 'login' && 'تسجيل الدخول'}
            {view === 'forgot' && 'استعادة كلمة المرور'}
            {view === 'reset' && 'تعيين كلمة المرور الجديدة'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {view === 'login' && 'أهلاً بك في منصة أول الشهادة'}
            {view === 'forgot' && 'أدخل بريدك الإلكتروني لتلقي رمز التحقق لإعادة تعيين كلمة المرور'}
            {view === 'reset' && 'أدخل رمز التحقق المكون من 4 أرقام وكلمة المرور الجديدة'}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Standard Login View */}
        {view === 'login' && (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.sd"
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                
                {/* زر تذكر البريد الإلكتروني فقط (اسم المستخدم) */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-600 font-medium">تذكر البريد الإلكتروني على هذا الهاتف</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(email);
                      resetAllViews('forgot');
                    }}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    هل نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isSubmittingLogin ? 'جاري التحقق...' : 'دخول'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>

            {/* Demo Student Access - ONLY visible when explicitly permitted by VITE_ENABLE_DEMO */}
            {isDemoAllowed && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={loginAsGuest}
                  className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>تجربة المنصة في بيئة العرض المعزولة (Demo)</span>
                </button>
              </div>
            )}

            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                ليس لديك حساب بعد؟{' '}
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  إنشاء حساب جديد
                </button>
              </p>
            </div>
          </>
        )}

        {/* 2. Forgot Password Request View */}
        {view === 'forgot' && (
          <div className="space-y-4">
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">البريد الإلكتروني المسجل</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="student@example.sd"
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingRecovery}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmittingRecovery ? 'جاري التحقق...' : 'إرسال رمز التحقق'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => resetAllViews('login')}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </div>
        )}

        {/* 3. Reset Password View */}
        {view === 'reset' && (
          <div className="space-y-4">
            {/* Email dispatch notice */}
            {emailConfigured ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>تم إرسال رمز التحقق</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  تم إرسال رمز التحقق (4 أرقام) إلى بريدك الإلكتروني من حساب المنصة (awalalshehada2027@gmail.com). يرجى التحقق من صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>تنبيه خادم البريد (SMTP)</span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  خدمة إرسال البريد الإلكتروني المباشر (Gmail SMTP) في انتظار إدخال كلمة مرور التطبيقات (SMTP_PASS) في متغيرات البيئة. تم تسجيل رمز الاستعادة بأمان في سجل العمليات للخادم.
                </p>
                {devResetCode && (
                  <div className="pt-1 mt-1 border-t border-amber-200 font-mono text-center bg-white/70 py-1.5 rounded-lg text-emerald-800 font-bold text-sm">
                    رمز التحقق التجريبي: {devResetCode}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">رمز التحقق (4 أرقام)</label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                    required
                    maxLength={4}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono tracking-widest text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">كلمة المرور الجديدة (8 أحرف كحد أدنى)</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingRecovery}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isSubmittingRecovery ? 'جاري حفظ كلمة المرور...' : 'تحديث كلمة المرور والدخول'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => resetAllViews('forgot')}
                className="text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                طلب رمز جديد
              </button>
              <button
                type="button"
                onClick={() => resetAllViews('login')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                العودة لتسجيل الدخول
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
