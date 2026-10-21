import React from 'react';
import { Mountain } from 'lucide-react';

interface ContourMapProps {
  content: {
    prompt: string;
    mapUrl?: string;
    subQuestions: Array<{
      id: string;
      question: string;
      unit?: string;
    }>;
  };
  answer?: {
    subAnswers?: Record<string, string>;
  };
  onChange: (ans: { subAnswers: Record<string, string> }) => void;
  isReadonly?: boolean;
}

export const ContourMapRenderer: React.FC<ContourMapProps> = ({
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
      {/* Map visual card */}
      <div className="p-4 bg-amber-950/5 border border-amber-800/20 rounded-2xl flex flex-col items-center justify-center min-h-[220px]">
        {content.mapUrl ? (
          <img
            src={content.mapUrl}
            alt="خريطة كنتورية جغرافية"
            className="max-h-80 object-contain rounded-xl shadow-xs"
          />
        ) : (
          <div className="text-center text-amber-900/60 py-8">
            <Mountain className="w-12 h-12 mx-auto mb-2 opacity-60 text-amber-800" />
            <span className="text-sm font-semibold">خريطة كنتورية طوبوغرافية (خطوط الارتفاع المتساوية والفواصل الرأسية)</span>
          </div>
        )}
      </div>

      {/* Sub-questions on contour map */}
      <div className="space-y-4">
        {content.subQuestions.map((sq, idx) => (
          <div key={sq.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-900 text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span>{sq.question}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={subAnswers[sq.id] || ''}
                onChange={(e) => handleSubChange(sq.id, e.target.value)}
                disabled={isReadonly}
                placeholder="أدخل الحساب أو القراءة..."
                className="flex-1 p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {sq.unit && <span className="text-xs font-bold text-slate-500 px-2">{sq.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
