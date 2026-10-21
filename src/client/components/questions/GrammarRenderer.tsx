import React from 'react';
import { BookOpen } from 'lucide-react';

interface GrammarProps {
  content: {
    prompt: string;
    sentence: string; // e.g. "حضرَ المعلمُ إلى المدرسةِ مبكراً"
    targetWord: string; // e.g. "المعلمُ"
    aspects: Array<{
      id: string;
      label: string; // e.g. "الموقع الإعرابي", "الحالة الإعرابية", "العلامة"
      options?: string[];
    }>;
  };
  answer?: {
    analysis?: Record<string, string>;
  };
  onChange: (ans: { analysis: Record<string, string> }) => void;
  isReadonly?: boolean;
}

export const GrammarRenderer: React.FC<GrammarProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const analysis = answer?.analysis || {};

  const handleAspectChange = (aspectId: string, val: string) => {
    if (isReadonly) return;
    onChange({
      analysis: {
        ...analysis,
        [aspectId]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Target Sentence Box */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>الجملة أو البيت الشعري:</span>
        </div>
        <div className="text-xl leading-relaxed text-slate-900 font-serif font-bold text-center py-2">
          {content.sentence}
        </div>
        <div className="text-center">
          <span className="text-xs text-slate-500">الكلمة المحددة للإعراب: </span>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-950 font-bold rounded-lg text-sm border border-emerald-300">
            {content.targetWord}
          </span>
        </div>
      </div>

      {/* Grammar Aspects Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.aspects.map((aspect) => (
          <div key={aspect.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <label className="text-sm font-bold text-slate-700 block">
              {aspect.label}:
            </label>
            {aspect.options && aspect.options.length > 0 ? (
              <select
                value={analysis[aspect.id] || ''}
                onChange={(e) => handleAspectChange(aspect.id, e.target.value)}
                disabled={isReadonly}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- اختر الإجابة --</option>
                {aspect.options.map((opt, oIdx) => (
                  <option key={oIdx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={analysis[aspect.id] || ''}
                onChange={(e) => handleAspectChange(aspect.id, e.target.value)}
                disabled={isReadonly}
                placeholder="اكتب الإعراب..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
