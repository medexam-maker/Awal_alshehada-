import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  answeredCount: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, answeredCount }) => {
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
        <span>السؤال {current} من {total}</span>
        <span className="text-emerald-700">{answeredCount} مُجاب ({progressPercent}%)</span>
      </div>
      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
