import React from 'react';
import { Bookmark } from 'lucide-react';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentIndex: number;
  answeredIndices: Set<number>;
  flaggedIndices: Set<number>;
  onSelectIndex: (index: number) => void;
  onToggleFlag: (index: number) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  totalQuestions,
  currentIndex,
  answeredIndices,
  flaggedIndices,
  onSelectIndex,
  onToggleFlag,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-sm font-bold text-slate-800">خريطة الأسئلة</span>
        <button
          type="button"
          onClick={() => onToggleFlag(currentIndex)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            flaggedIndices.has(currentIndex)
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{flaggedIndices.has(currentIndex) ? 'إلغاء التمييز' : 'تمييز للمراجعة'}</span>
        </button>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = answeredIndices.has(idx);
          const isFlagged = flaggedIndices.has(idx);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`relative h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center cursor-pointer ${
                isCurrent
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/40 shadow-sm'
                  : isAnswered
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{idx + 1}</span>
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-600" />
          <span>الحالي</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300" />
          <span>مُجاب</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>مُميز</span>
        </div>
      </div>
    </div>
  );
};
