import React from 'react';

interface ShortEssayProps {
  content: {
    prompt: string;
    maxCharacters?: number;
    guidelines?: string;
  };
  answer?: {
    text?: string;
  };
  onChange: (ans: { text: string }) => void;
  isReadonly?: boolean;
}

export const ShortEssayRenderer: React.FC<ShortEssayProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const currentText = answer?.text || '';
  const max = content.maxCharacters || 300;

  return (
    <div className="space-y-4">
      {content.guidelines && (
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <strong>إرشادات الإجابة:</strong> {content.guidelines}
        </div>
      )}

      <div className="relative">
        <textarea
          value={currentText}
          onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
          disabled={isReadonly}
          rows={4}
          maxLength={max}
          placeholder="اكتب إجابتك المختصرة هنا..."
          className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed text-base resize-none"
        />
        <div className="flex justify-between items-center text-xs text-slate-400 mt-1 px-1">
          <span>إجابة مقالية قصيرة</span>
          <span>
            {currentText.length} / {max} حرف
          </span>
        </div>
      </div>
    </div>
  );
};
