import React from 'react';
import { CheckCircle2, XCircle, Check, X } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

interface TrueFalseProps {
  content: {
    prompt?: string;
    statement?: string;
    explanation?: string;
  };
  answer?: {
    value?: boolean;
    correctionText?: string;
  } | boolean;
  onChange: (ans: { value: boolean; correctionText?: string }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

export const TrueFalseRenderer: React.FC<TrueFalseProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const currentValue =
    typeof answer === 'boolean'
      ? answer
      : typeof answer === 'object' && answer !== null && typeof answer.value === 'boolean'
        ? answer.value
        : undefined;

  const isImmediateReveal = examMode !== 'simulator';

  const correctValue =
    typeof correctAnswer === 'boolean'
      ? correctAnswer
      : typeof correctAnswer === 'object' && correctAnswer !== null && typeof correctAnswer.value === 'boolean'
      ? correctAnswer.value
      : undefined;

  const statementText =
    content?.statement && content.statement !== content?.prompt
      ? content.statement
      : !content?.prompt
        ? content?.statement || ''
        : '';

  const handleSelect = (val: boolean) => {
    if (isReadonly) return;
    onChange({
      value: val,
      correctionText: typeof answer === 'object' && answer !== null ? answer.correctionText : undefined,
    });

    if (isImmediateReveal && typeof correctValue === 'boolean') {
      if (val === correctValue) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  const isTrueCorrect = isImmediateReveal && currentValue !== undefined && typeof correctValue === 'boolean' && correctValue === true;
  const isTrueIncorrect = isImmediateReveal && currentValue === true && typeof correctValue === 'boolean' && correctValue === false;

  const isFalseCorrect = isImmediateReveal && currentValue !== undefined && typeof correctValue === 'boolean' && correctValue === false;
  const isFalseIncorrect = isImmediateReveal && currentValue === false && typeof correctValue === 'boolean' && correctValue === true;

  return (
    <div className="space-y-6">
      {statementText && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-lg leading-relaxed font-semibold shadow-xs">
          {statementText}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSelect(true)}
          disabled={isReadonly}
          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-lg select-none ${
            isReadonly ? 'cursor-default opacity-85' : 'cursor-pointer'
          } ${
            isTrueCorrect
              ? 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
              : isTrueIncorrect
              ? 'bg-rose-100 border-rose-600 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
              : currentValue === true
              ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          {isTrueCorrect ? (
            <Check className="w-6 h-6 shrink-0 text-emerald-600 stroke-[3]" />
          ) : isTrueIncorrect ? (
            <X className="w-6 h-6 shrink-0 text-rose-600 stroke-[3]" />
          ) : (
            <CheckCircle2 className={`w-6 h-6 shrink-0 ${currentValue === true ? 'text-emerald-600' : 'text-slate-400'}`} />
          )}
          <span>صواب (✓)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect(false)}
          disabled={isReadonly}
          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-lg select-none ${
            isReadonly ? 'cursor-default opacity-85' : 'cursor-pointer'
          } ${
            isFalseCorrect
              ? 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
              : isFalseIncorrect
              ? 'bg-rose-100 border-rose-600 text-rose-950 shadow-sm ring-2 ring-rose-500/20'
              : currentValue === false
              ? 'bg-rose-50 border-rose-600 text-rose-800 shadow-sm'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          {isFalseCorrect ? (
            <Check className="w-6 h-6 shrink-0 text-emerald-600 stroke-[3]" />
          ) : isFalseIncorrect ? (
            <X className="w-6 h-6 shrink-0 text-rose-600 stroke-[3]" />
          ) : (
            <XCircle className={`w-6 h-6 shrink-0 ${currentValue === false ? 'text-rose-600' : 'text-slate-400'}`} />
          )}
          <span>خطأ (✗)</span>
        </button>
      </div>
    </div>
  );
};

