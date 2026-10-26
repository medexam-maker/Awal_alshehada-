import React from 'react';
import { CheckCircle2, XCircle, Check, X } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';
import { playWaterDrop } from '../../utils/soundEffects';

interface TrueFalseProps {
  content: {
    prompt?: string;
    statement?: string;
    explanation?: string;
    correctValue?: boolean;
    correctAnswer?: any;
    value?: boolean;
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

function resolveCorrectValue(ca: any, contentObj?: any): boolean | undefined {
  if (typeof ca === 'boolean') return ca;

  if (typeof ca === 'string') {
    const trimmed = ca.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === '1' || trimmed === 'صواب' || trimmed === 'صح') return true;
    if (trimmed === 'false' || trimmed === '0' || trimmed === 'خطأ' || trimmed === 'خطا') return false;
    try {
      const parsed = JSON.parse(ca);
      if (typeof parsed === 'boolean') return parsed;
      if (typeof parsed?.value === 'boolean') return parsed.value;
    } catch {}
  }

  if (typeof ca === 'object' && ca !== null) {
    if (typeof ca.value === 'boolean') return ca.value;
    if (typeof ca.answer === 'boolean') return ca.answer;
    if (typeof ca.correct === 'boolean') return ca.correct;
    if (typeof ca.isCorrect === 'boolean') return ca.isCorrect;
    if (typeof ca.value === 'string') {
      const t = ca.value.trim().toLowerCase();
      if (t === 'true' || t === '1' || t === 'صواب' || t === 'صح') return true;
      if (t === 'false' || t === '0' || t === 'خطأ' || t === 'خطا') return false;
    }
    if (typeof ca.answer === 'string') {
      const t = ca.answer.trim().toLowerCase();
      if (t === 'true' || t === '1' || t === 'صواب' || t === 'صح') return true;
      if (t === 'false' || t === '0' || t === 'خطأ' || t === 'خطا') return false;
    }
  }

  if (contentObj && typeof contentObj === 'object') {
    if (typeof contentObj.correctValue === 'boolean') return contentObj.correctValue;
    if (typeof contentObj.value === 'boolean') return contentObj.value;
    if (typeof contentObj.correctAnswer === 'boolean') return contentObj.correctAnswer;
    if (contentObj.correctAnswer) return resolveCorrectValue(contentObj.correctAnswer);
  }

  return undefined;
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

  const correctValue = resolveCorrectValue(correctAnswer, content);

  const handleSelect = (val: boolean) => {
    if (isReadonly) return;
    onChange({
      value: val,
      correctionText: typeof answer === 'object' && answer !== null ? answer.correctionText : undefined,
    });

    // Sound feedback activation:
    if (typeof correctValue === 'boolean') {
      if (val === correctValue) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    } else {
      playWaterDrop();
    }
  };

  const isTrueCorrect = currentValue !== undefined && typeof correctValue === 'boolean' && correctValue === true;
  const isTrueIncorrect = currentValue === true && typeof correctValue === 'boolean' && correctValue === false;

  const isFalseCorrect = currentValue !== undefined && typeof correctValue === 'boolean' && correctValue === false;
  const isFalseIncorrect = currentValue === false && typeof correctValue === 'boolean' && correctValue === true;

  return (
    <div className="space-y-6">
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


