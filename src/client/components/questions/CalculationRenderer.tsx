import React from 'react';
import { Calculator } from 'lucide-react';

interface CalculationProps {
  content: {
    prompt: string;
    unit?: string;
    tolerance?: number;
    guidelines?: string;
  };
  answer?: {
    value?: number | string;
    workText?: string;
  };
  onChange: (ans: { value: number | string; workText?: string }) => void;
  isReadonly?: boolean;
}

export const CalculationRenderer: React.FC<CalculationProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const value = answer?.value ?? '';
  const workText = answer?.workText ?? '';

  const handleValueChange = (val: string) => {
    if (isReadonly) return;
    onChange({
      value: val,
      workText,
    });
  };

  const handleWorkChange = (work: string) => {
    if (isReadonly) return;
    onChange({
      value,
      workText: work,
    });
  };

  return (
    <div className="space-y-6">
      {/* Problem Guidance */}
      {content.guidelines && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <strong>إرشادات الحل:</strong> {content.guidelines}
        </div>
      )}

      {/* Numeric Answer Input (Primary Graded Field per PD-001) */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
        <label className="text-sm font-bold text-emerald-950 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <span>الناتج الرقمي النهائي (المعتمد في التصحيح الآلي):</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="any"
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={isReadonly}
            placeholder="أدخل القيمة الرقمية..."
            className="flex-1 p-3 bg-white border border-emerald-300 rounded-xl text-lg font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
          />
          {content.unit && (
            <span className="px-3 py-2 bg-emerald-100 text-emerald-900 rounded-xl font-bold text-sm">
              {content.unit}
            </span>
          )}
        </div>
      </div>

      {/* Work Steps (Non-graded working space) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500 block">
          خطوات الحساب والقوانين المستخدمة (للمسودة والمراجعة):
        </label>
        <textarea
          value={workText}
          onChange={(e) => handleWorkChange(e.target.value)}
          disabled={isReadonly}
          rows={3}
          placeholder="اكتب خطوات الحل والمعادلات هنا..."
          className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
        />
      </div>
    </div>
  );
};
