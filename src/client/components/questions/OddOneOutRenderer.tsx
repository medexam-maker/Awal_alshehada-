import React from 'react';
import { Ban, Check, X } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

interface OddOneOutProps {
  content: {
    prompt: string;
    items: string[];
    requireReason?: boolean;
  };
  answer?: {
    selectedItem?: string;
    reason?: string;
  };
  onChange: (ans: { selectedItem: string; reason?: string }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

export const OddOneOutRenderer: React.FC<OddOneOutProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const selectedItem = answer?.selectedItem;
  const reason = answer?.reason || '';
  const isImmediateReveal = examMode !== 'simulator';

  const correctOddItem =
    typeof correctAnswer === 'object' && correctAnswer !== null
      ? correctAnswer.selectedItem || correctAnswer.oddItem || correctAnswer.correctAnswer || correctAnswer.value
      : typeof correctAnswer === 'string'
      ? correctAnswer
      : undefined;

  const handleSelect = (item: string) => {
    if (isReadonly) return;
    onChange({
      selectedItem: item,
      reason,
    });

    if (isImmediateReveal && correctOddItem) {
      if (item === correctOddItem) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  const handleReasonChange = (val: string) => {
    if (isReadonly || !selectedItem) return;
    onChange({
      selectedItem,
      reason: val,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500 font-medium">
        اختر الكلمة أو المصطلح الشاذ (الذي لا ينتمي إلى المجموعة):
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {content?.items?.map((item, idx) => {
          const isSelected = selectedItem === item;

          const isCorrect = isImmediateReveal && isSelected && correctOddItem && item === correctOddItem;
          const isIncorrect = isImmediateReveal && isSelected && correctOddItem && item !== correctOddItem;
          const isActualCorrect = isImmediateReveal && selectedItem && correctOddItem && item === correctOddItem;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              disabled={isReadonly}
              className={`p-4 rounded-xl border-2 text-center font-bold text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isCorrect || isActualCorrect
                  ? 'bg-emerald-100 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                  : isIncorrect
                  ? 'bg-rose-100 border-rose-600 text-rose-950 ring-2 ring-rose-500/20 shadow-sm'
                  : isSelected
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              {isCorrect || isActualCorrect ? (
                <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
              ) : isIncorrect ? (
                <X className="w-5 h-5 text-rose-600 stroke-[3]" />
              ) : (
                <Ban className={`w-5 h-5 ${isSelected ? 'text-amber-600' : 'text-slate-300'}`} />
              )}
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      {content.requireReason && (
        <div className="space-y-2 pt-2">
          <label className="text-sm font-bold text-slate-700 block">
            سبب الاختيار (الرابط المشترك بين باقي العناصر):
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            disabled={isReadonly}
            placeholder="علل اختيارك..."
            className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
};
