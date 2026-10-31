import React from 'react';
import { MathView } from '../common/MathView';
import { ThreeDIcon } from '../common/ThreeDIcon';
import { matchKeywords } from '../../../shared/keywordMatcher';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ShortEssayReviewReportProps {
  prompt?: string;
  studentAnswer?: string | { text?: string };
  modelAnswer?: string;
  mandatoryKeywords?: string[];
  partialThreshold?: number;
  maxScore?: number;
  obtainedScore?: number;
  graderNote?: string;
  gradingMode?: 'auto' | 'manual' | 'hybrid';
}

export const ShortEssayReviewReport: React.FC<ShortEssayReviewReportProps> = ({
  prompt,
  studentAnswer,
  modelAnswer = '',
  mandatoryKeywords = [],
  partialThreshold = 0.5,
  maxScore = 2,
  obtainedScore,
  graderNote,
  gradingMode = 'auto',
}) => {
  const studentText = typeof studentAnswer === 'string' ? studentAnswer : studentAnswer?.text || '';

  const evalResult = matchKeywords(studentText, mandatoryKeywords, maxScore, partialThreshold);
  const finalScore = obtainedScore !== undefined ? obtainedScore : evalResult.score;

  // Render model answer with highlighted keywords
  const renderHighlightedText = (text: string, keywords: string[]) => {
    if (!text || keywords.length === 0) return text;
    let parts: Array<{ text: string; isKeyword: boolean }> = [{ text, isKeyword: false }];

    keywords.forEach((kw) => {
      const nextParts: typeof parts = [];
      parts.forEach((part) => {
        if (part.isKeyword) {
          nextParts.push(part);
        } else {
          const idx = part.text.indexOf(kw);
          if (idx >= 0) {
            const before = part.text.substring(0, idx);
            const match = part.text.substring(idx, idx + kw.length);
            const after = part.text.substring(idx + kw.length);
            if (before) nextParts.push({ text: before, isKeyword: false });
            nextParts.push({ text: match, isKeyword: true });
            if (after) nextParts.push({ text: after, isKeyword: false });
          } else {
            nextParts.push(part);
          }
        }
      });
      parts = nextParts;
    });

    return (
      <span>
        {parts.map((p, i) =>
          p.isKeyword ? (
            <mark key={i} className="bg-emerald-200 text-emerald-950 font-black px-1 py-0.5 rounded">
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl" dir="rtl">
      {/* Header Prompt */}
      {prompt && (
        <div className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
          <MathView text={prompt} />
        </div>
      )}

      {/* Side by side / Stacked comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Answer Box */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-700 border-b border-slate-100 pb-2">
            <span>إجابتك المقدمة في الامتحان:</span>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-lg font-bold">
              {finalScore} من {maxScore} درجة
            </span>
          </div>
          <div className="text-sm leading-relaxed text-slate-800 font-medium whitespace-pre-wrap min-h-[80px]">
            {studentText || <span className="text-slate-400 italic">(لم تُقدَّم إجابة)</span>}
          </div>
        </div>

        {/* Model Answer Box */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-emerald-950 border-b border-emerald-200 pb-2">
            <span>الإجابة النموذجية المعتمدة:</span>
            <span className="text-[11px] font-bold text-emerald-800">
              طريقة التقييم: {gradingMode === 'auto' ? 'آلي بالكلمات المفتاحية' : gradingMode === 'hybrid' ? 'مزدوج (آلي + معلم)' : 'مراجعة معلم'}
            </span>
          </div>
          <div className="text-sm leading-relaxed text-emerald-950 font-medium whitespace-pre-wrap min-h-[80px]">
            {renderHighlightedText(modelAnswer, mandatoryKeywords)}
          </div>
        </div>
      </div>

      {/* Keyword Breakdown */}
      {mandatoryKeywords.length > 0 && (
        <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 text-xs">
          <div className="font-bold text-slate-700">تحليل العناصر المفتاحية في إجابتك:</div>
          <div className="flex flex-wrap gap-2">
            {evalResult.matchedKeywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{kw}</span>
              </span>
            ))}
            {evalResult.missingKeywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-xl font-bold flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>{kw} (ناقص)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grader Note if exists */}
      {graderNote && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 space-y-1">
          <span className="font-bold text-indigo-900">ملاحظة المصحح:</span>
          <p>{graderNote}</p>
        </div>
      )}
    </div>
  );
};

export default ShortEssayReviewReport;
