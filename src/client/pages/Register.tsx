import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GraduationCap, Lock, Mail, User, Phone, ArrowLeft, AlertCircle } from 'lucide-react';

interface RegisterProps {
  onGoToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onGoToLogin }) => {
  const { register, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('يرجى ملء البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (password.length < 8) {
      setError('يجب أن لا تقل كلمة المرور عن 8 أحرف');
      return;
    }

    const res = await register({
      email,
      password,
      fullName: fullName || undefined,
      phone: phone || undefined,
    });

    if (!res.success) {
      setError(res.error || 'فشل إنشاء الحساب');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-auto py-8 px-4">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white flex items-center justify-center mx-auto shadow-md">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">حساب طالب جديد</h1>
          <p className="text-sm text-slate-500 font-medium">سجل بياناتك للبدء في حل وتدريب الامتحانات</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">الاسم الكامل (رباعي)</label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد أحمد علي عثمان"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

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
            <label className="text-xs font-bold text-slate-700 block">رقم الهاتف (اختياري)</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">كلمة المرور (8 أحرف كحد أدنى)</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>{isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            لديك حساب بالفعل؟{' '}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              تسجيل الدخول
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
