import React from 'react';
import { Check, X } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';
import { playWaterDrop } from '../../utils/soundEffects';

interface MultipleChoiceProps {
  content: {
    prompt: string;
    options: Array<{
      id: string;
      text: string;
    }>;
    correctOptionId?: string;
    correctAnswer?: any;
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

function resolveCorrectOptionId(
  ca: any,
  optionsList: Array<{ id: string; text: string }>,
  contentObj?: any
): string | undefined {
  let raw: any = ca;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        raw = parsed;
      }
    } catch {}
  }

  if (typeof raw === 'object' && raw !== null) {
    const candidate =
      raw.selectedOptionId ??
      raw.optionId ??
      raw.value ??
      raw.id ??
      raw.answer ??
      raw.correctOptionId;
    if (typeof candidate === 'string') {
      const matched = optionsList.find((o) => o.id === candidate);
      if (matched) return matched.id;
      const textMatched = optionsList.find((o) => o.text.trim() === candidate.trim());
      if (textMatched) return textMatched.id;
      return candidate;
    }
    if (typeof candidate === 'number' && optionsList[candidate]) {
      return optionsList[candidate].id;
    }
    if (typeof raw.text === 'string') {
      const match = optionsList.find((o) => o.text.trim() === raw.text.trim());
      if (match) return match.id;
    }
  }

  if (typeof raw === 'string') {
    const direct = optionsList.find((o) => o.id === raw);
    if (direct) return direct.id;
    const textMatch = optionsList.find((o) => o.text.trim() === raw.trim());
    if (textMatch) return textMatch.id;
    const num = parseInt(raw, 10);
    if (!isNaN(num) && optionsList[num]) return optionsList[num].id;
  }

  if (typeof raw === 'number' && optionsList[raw]) {
    return optionsList[raw].id;
  }

  if (contentObj && typeof contentObj === 'object') {
    if (contentObj.correctOptionId) return contentObj.correctOptionId;
    if (contentObj.correctAnswer) return resolveCorrectOptionId(contentObj.correctAnswer, optionsList);
  }

  return undefined;
}

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

  const correctOptionId = resolveCorrectOptionId(correctAnswer, options, content);

  const handleSelectOption = (optionId: string) => {
    if (isReadonly) return;
    onChange({ selectedOptionId: optionId });

    // Sound feedback activation:
    if (correctOptionId !== undefined) {
      if (optionId === correctOptionId) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    } else {
      playWaterDrop();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, idx) => {
          const isSelected = selectedId === option.id;
          const letter = ARABIC_LETTERS[idx] || String(idx + 1);

          const isCorrect = selectedId && option.id === correctOptionId;
          const isSelectedIncorrect = isSelected && correctOptionId && selectedId !== correctOptionId;

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

