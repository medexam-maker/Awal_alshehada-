import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  User as UserIcon,
  Mail,
  Shield,
  LogOut,
  ArrowRight,
  GraduationCap,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface ProfileProps {
  onBackToSubjects: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onBackToSubjects }) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'مسؤول النظام (Admin)', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'student':
      default:
        return { label: 'طالب شهادة ثانوية', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="max-w-2xl w-full mx-auto py-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToSubjects}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة المواد</span>
        </button>
        <span className="text-xs font-semibold text-slate-500">
          الملف التعريفي للطالب
        </span>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100 text-center sm:text-right">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            <GraduationCap className="w-10 h-10" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl font-black text-slate-900">
                {user?.fullName || 'طالب منصة أول الشهادة'}
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${roleInfo.color} self-center sm:self-auto`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              حساب موثق لدى منصة امتحانات الشهادة الثانوية السودانية
            </p>
          </div>
        </div>

        {/* User Information Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              <span>الاسم الكامل:</span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 pr-6">
              {user?.fullName || 'غير محدد'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>البريد الإلكتروني:</span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 pr-6 font-mono text-left" dir="ltr">
              {user?.email || '—'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>حالة الحساب:</span>
            </div>
            <div className="text-sm font-extrabold text-emerald-800 pr-6 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>نشط ومفعل</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>الدور الأكاديمي:</span>
            </div>
            <div className="text-sm font-extrabold text-slate-900 pr-6">
              {user?.role === 'admin' ? 'إدارة الامتحانات والأنماط' : 'الشهادة السودانية (المساقات الأكاديمية)'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToSubjects}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center"
          >
            الذهاب للمواد والامتحانات
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج من الحساب</span>
          </button>
        </div>
      </div>
    </div>
  );
};
