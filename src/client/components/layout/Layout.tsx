import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  onNavigateHome?: () => void;
  onOpenAdmin?: () => void;
  onOpenProfile?: () => void;
  isAdminView?: boolean;
  hideHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onNavigateHome,
  onOpenAdmin,
  onOpenProfile,
  isAdminView = false,
  hideHeader = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {!hideHeader && (
        <Header
          onNavigateHome={onNavigateHome}
          onOpenAdmin={onOpenAdmin}
          onOpenProfile={onOpenProfile}
          isAdminView={isAdminView}
        />
      )}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>منصة أول الشهادة — امتحانات الشهادة الثانوية السودانية</span>
          <span>وفق المنهج القومي المعتمد والمواصفات القياسية</span>
        </div>
      </footer>
    </div>
  );
};
