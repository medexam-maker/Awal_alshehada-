import React from 'react';

interface LongEssayProps {
  content: {
    prompt: string;
    maxCharacters?: number;
    pointsGuideline?: string[];
  };
  answer?: {
    text?: string;
  };
  onChange: (ans: { text: string }) => void;
  isReadonly?: boolean;
}

export const LongEssayRenderer: React.FC<LongEssayProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const currentText = answer?.text || '';
  const max = content.maxCharacters || 1500;

  return (
    <div className="space-y-4">
      {content.pointsGuideline && content.pointsGuideline.length > 0 && (
        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-900 space-y-1">
          <div className="font-bold mb-1">النقاط والعناصر الأساسية المطلوب تناولها:</div>
          <ul className="list-disc list-inside space-y-0.5 text-xs text-emerald-800">
            {content.pointsGuideline.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative">
        <textarea
          value={currentText}
          onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
          disabled={isReadonly}
          rows={9}
          maxLength={max}
          placeholder="اكتب المقال الإنشائي أو التحليلي بالتفصيل هنا..."
          className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-loose text-base resize-y"
        />
        <div className="flex justify-between items-center text-xs text-slate-400 mt-1 px-1">
          <span>إجابة مطولة</span>
          <span>
            {currentText.length} / {max} حرف
          </span>
        </div>
      </div>
    </div>
  );
};
