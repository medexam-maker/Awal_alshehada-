import React from 'react';
import { FileText } from 'lucide-react';

interface ReadingComprehensionProps {
  content: {
    prompt: string;
    passage: string; // The reading text
    subQuestions: Array<{
      id: string;
      question: string;
      options?: string[];
    }>;
  };
  answer?: {
    subAnswers?: Record<string, string>;
  };
  onChange: (ans: { subAnswers: Record<string, string> }) => void;
  isReadonly?: boolean;
}

export const ReadingComprehensionRenderer: React.FC<ReadingComprehensionProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const subAnswers = answer?.subAnswers || {};

  const handleSubChange = (id: string, val: string) => {
    if (isReadonly) return;
    onChange({
      subAnswers: {
        ...subAnswers,
        [id]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Passage Card */}
      <div className="p-6 bg-amber-50/40 border border-amber-200/80 rounded-2xl space-y-2">
        <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-700" />
          <span>النص القرائي:</span>
        </div>
        <div className="text-base md:text-lg leading-loose text-slate-900 font-serif whitespace-pre-line text-justify max-h-72 overflow-y-auto p-2">
          {content.passage}
        </div>
      </div>

      {/* Sub-questions on the passage */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-700">الأسئلة المتعلقة بالنص أعلاه:</div>
        {content.subQuestions.map((sq, idx) => (
          <div key={sq.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span>{sq.question}</span>
            </div>

            {sq.options && sq.options.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {sq.options.map((opt, oIdx) => {
                  const isChecked = subAnswers[sq.id] === opt;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSubChange(sq.id, opt)}
                      disabled={isReadonly}
                      className={`p-2.5 rounded-lg border text-right text-sm transition-all cursor-pointer ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={subAnswers[sq.id] || ''}
                onChange={(e) => handleSubChange(sq.id, e.target.value)}
                disabled={isReadonly}
                rows={2}
                placeholder="أجب عن السؤال بناءً على فهمك للنص..."
                className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
