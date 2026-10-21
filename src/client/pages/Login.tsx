import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GraduationCap, Lock, Mail, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

interface LoginProps {
  onGoToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onGoToRegister }) => {
  const { login, loginAsGuest, isDemoAllowed, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'فشل تسجيل الدخول');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-auto py-10 px-4">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
        {/* Brand visual */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">تسجيل الدخول</h1>
          <p className="text-sm text-slate-500 font-medium">أهلاً بك في منصة أول الشهادة</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'جاري التحقق...' : 'دخول'}</span>
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
      </div>
    </div>
  );
};
