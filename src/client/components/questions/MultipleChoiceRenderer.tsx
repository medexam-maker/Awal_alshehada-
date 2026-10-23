import React from 'react';

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
}

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export const MultipleChoiceRenderer: React.FC<MultipleChoiceProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const selectedId = answer?.selectedOptionId;
  const options = Array.isArray(content?.options) ? content.options : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, idx) => {
          const isSelected = selectedId === option.id;
          const letter = ARABIC_LETTERS[idx] || String(idx + 1);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !isReadonly && onChange({ selectedOptionId: option.id })}
              disabled={isReadonly}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-right transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
              >
                {letter}
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
