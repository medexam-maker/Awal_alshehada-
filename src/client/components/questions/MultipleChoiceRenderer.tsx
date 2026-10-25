import React from 'react';
import { Check, X } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

interface MultipleChoiceProps {
  content: {
    prompt: string;
    options: Array<{
      id: string;
      text: string;
    }>;
  };
  answer?: {
    selectedOptionId?: string;
  };
  onChange: (ans: { selectedOptionId: string }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export const MultipleChoiceRenderer: React.FC<MultipleChoiceProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const selectedId = answer?.selectedOptionId;
  const options = Array.isArray(content?.options) ? content.options : [];

  // In training modes (not simulator): reveal correct/incorrect immediately on click
  const isImmediateReveal = examMode !== 'simulator';

  // Determine correct option ID
  const correctOptionId =
    typeof correctAnswer === 'object' && correctAnswer !== null
      ? correctAnswer.selectedOptionId || correctAnswer.value || correctAnswer.id
      : typeof correctAnswer === 'string'
      ? correctAnswer
      : undefined;

  const handleSelectOption = (optionId: string) => {
    if (isReadonly) return;
    onChange({ selectedOptionId: optionId });

    if (isImmediateReveal && correctOptionId) {
      if (optionId === correctOptionId) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, idx) => {
          const isSelected = selectedId === option.id;
          const letter = ARABIC_LETTERS[idx] || String(idx + 1);

          const isCorrect = isImmediateReveal && selectedId && option.id === correctOptionId;
          const isSelectedIncorrect = isImmediateReveal && isSelected && correctOptionId && selectedId !== correctOptionId;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectOption(option.id)}
              disabled={isReadonly}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
                isCorrect
                  ? 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold shadow-sm'
                  : isSelectedIncorrect
                  ? 'bg-rose-100 border-rose-600 text-rose-950 font-bold shadow-sm'
                  : isSelected
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                  isCorrect
                    ? 'bg-emerald-600 text-white'
                    : isSelectedIncorrect
                    ? 'bg-rose-600 text-white'
                    : isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : isSelectedIncorrect ? <X className="w-5 h-5 stroke-[3]" /> : letter}
              </div>
              <div className="text-base md:text-lg leading-relaxed flex-1 font-medium">
                {option.text}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
