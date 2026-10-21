import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { PasswordChangeModal } from '../auth/PasswordChangeModal';
import { GraduationCap, LogOut, User as UserIcon, KeyRound, Sliders, BookOpen } from 'lucide-react';

interface HeaderProps {
  onNavigateHome?: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onOpenAdmin,
  onOpenProfile,
  isAdminView = false,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900 leading-tight">أول الشهادة</div>
              <div className="text-[11px] text-slate-500 font-medium">الشهادة الثانوية السودانية</div>
            </div>
          </div>

          {/* User context & actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Switcher Button (Student vs Admin) */}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  isAdminView
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
                title="التبديل بين واجهة الطالب ولوحة تحكم الأدمن"
              >
                {isAdminView ? (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>واجهة الطالب</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                    <span>لوحة الأدمن (ضبط وهيكل الامتحان)</span>
                  </>
                )}
              </button>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 py-1.5 px-3 rounded-xl text-xs font-medium text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  title="عرض الملف التعريفي للطالب"
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold hidden sm:inline">{user.fullName || user.email}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded sm:inline hidden">الملف الشخصي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                  title="تغيير كلمة المرور (PD-003)"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                بوابة الامتحانات
              </div>
            )}
          </div>
        </div>
      </header>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};
