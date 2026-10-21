import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

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
}

export const TrueFalseRenderer: React.FC<TrueFalseProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const currentValue =
    typeof answer === 'boolean'
      ? answer
      : typeof answer === 'object' && answer !== null && typeof answer.value === 'boolean'
        ? answer.value
        : undefined;

  const statementText = content?.statement || content?.prompt || '';
  const promptInstruction =
    content?.prompt && content?.statement && content.prompt !== content.statement
      ? content.prompt
      : null;

  const handleSelect = (val: boolean) => {
    if (isReadonly) return;
    onChange({
      value: val,
      correctionText: typeof answer === 'object' && answer !== null ? answer.correctionText : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {promptInstruction && (
        <div className="text-sm font-semibold text-slate-700 leading-relaxed">
          {promptInstruction}
        </div>
      )}

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
            currentValue === true
              ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <CheckCircle2 className={`w-6 h-6 shrink-0 ${currentValue === true ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>صواب (✓)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelect(false)}
          disabled={isReadonly}
          className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-lg select-none ${
            isReadonly ? 'cursor-default opacity-85' : 'cursor-pointer'
          } ${
            currentValue === false
              ? 'bg-rose-50 border-rose-600 text-rose-800 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <XCircle className={`w-6 h-6 shrink-0 ${currentValue === false ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>خطأ (✗)</span>
        </button>
      </div>
    </div>
  );
};

