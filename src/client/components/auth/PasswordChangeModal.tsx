import React, { useState } from 'react';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { Lock, AlertCircle, CheckCircle2, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.request<any>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setSuccess('تم تغيير كلمة المرور بنجاح. وفقاً لسياسة الأمان (PD-003 D4)، يرجى تسجيل الدخول مجدداً بكلمة المرور الجديدة.');
        setTimeout(async () => {
          await logout();
          onClose();
        }, 2000);
      } else {
        setError(res.error?.message || 'فشل تغيير كلمة المرور. يرجى التحقق من كلمة المرور الحالية.');
      }
    } catch {
      setError('حدث خطأ في الاتصال بالخادم. يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تغيير كلمة المرور</h3>
              <p className="text-[11px] text-slate-500">حماية الحساب وفق معايير PD-003 D4/D5</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 text-xs">كلمة المرور الحالية</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 text-xs">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="8 أحرف على الأقل"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 text-xs">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التحديث...</span>
                </>
              ) : (
                <span>تحديث كلمة المرور</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
