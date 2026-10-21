import React from 'react';
import { HelpCircle } from 'lucide-react';

interface ExplainProps {
  content: {
    prompt: string;
    targetPhenomenon: string;
    subPrompts?: string[];
  };
  answer?: {
    reasons?: string[];
    text?: string;
  };
  onChange: (ans: { text: string }) => void;
  isReadonly?: boolean;
}

export const ExplainRenderer: React.FC<ExplainProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const currentText = answer?.text || '';

  return (
    <div className="space-y-5">
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 flex items-start gap-3">
        <HelpCircle className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">الظاهرة أو القضية المطلوب تعليلها:</div>
          <div className="text-lg font-bold">{content.targetPhenomenon || content.prompt}</div>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={currentText}
          onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
          disabled={isReadonly}
          rows={5}
          placeholder="علل واذكر الأسباب العلمية والمنطقية بالتفصيل..."
          className="w-full p-4 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed text-base resize-none"
        />
        <div className="text-left text-xs text-slate-400 mt-1">
          {currentText.length} حرف
        </div>
      </div>
    </div>
  );
};
