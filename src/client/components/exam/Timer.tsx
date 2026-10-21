import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerProps {
  remainingSeconds: number | null; // null for untimed training mode
  isSimulator?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ remainingSeconds, isSimulator = true }) => {
  if (remainingSeconds === null || !isSimulator) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
        <Clock className="w-4 h-4 text-emerald-600" />
        <span>وضع تدريب (غير محدد بزمن)</span>
      </div>
    );
  }

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const isCritical = remainingSeconds <= 60;
  const isWarning = remainingSeconds <= 300 && remainingSeconds > 60;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold transition-all border ${
        isCritical
          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
          : isWarning
          ? 'bg-amber-50 text-amber-800 border-amber-300'
          : 'bg-slate-100 text-slate-800 border-slate-200'
      }`}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
      ) : (
        <Clock className={`w-4 h-4 ${isWarning ? 'text-amber-600' : 'text-slate-500'} shrink-0`} />
      )}
      <div className="flex items-center gap-1">
        {hours > 0 && <span>{pad(hours)}:</span>}
        <span>{pad(minutes)}</span>:
        <span>{pad(seconds)}</span>
      </div>
    </div>
  );
};
