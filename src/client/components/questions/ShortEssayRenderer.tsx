import React, { useState, useEffect, useMemo } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { MathView } from '../common/MathView';
import { ThreeDIcon } from '../common/ThreeDIcon';
import { matchKeywords, EvalResult } from '../../../shared/keywordMatcher';
import {
  playClick,
  playSuccess,
  playPartial,
  playError,
  playModal,
} from '../../utils/soundEffects';

export interface ShortEssayRendererProps {
  questionId?: string;
  attemptId?: string;
  content: {
    prompt?: string;
    statement?: string;
    hint?: string;
    model_answer?: string;
    modelAnswer?: string;
    mandatory_keywords?: string[];
    mandatoryKeywords?: string[];
    max_words?: number;
    maxWords?: number;
    wordLimit?: number;
    partial_threshold?: number;
    partialThreshold?: number;
    grading_mode?: 'auto' | 'manual' | 'hybrid';
    guidelines?: string;
  };
  answer?: {
    text?: string;
  } | string;
  onChange: (ans: { text: string }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  explanation?: string;
  examMode?: 'simulator' | 'training';
  maxMarks?: number;
}

export const ShortEssayRenderer: React.FC<ShortEssayRendererProps> = ({
  questionId,
  attemptId,
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  explanation,
  examMode = 'training',
  maxMarks = 2,
}) => {
  const currentText = typeof answer === 'string' ? answer : answer?.text || '';

  const isTraining = examMode === 'training';
  const maxWords = content.max_words || content.maxWords || content.wordLimit || 30;

  // Extract model answer and keywords
  const modelAnswer =
    content.model_answer ||
    content.modelAnswer ||
    correctAnswer?.model_answer ||
    correctAnswer?.modelAnswer ||
    explanation ||
    '';

  const mandatoryKeywords: string[] = useMemo(() => {
    if (Array.isArray(content.mandatory_keywords) && content.mandatory_keywords.length > 0) {
      return content.mandatory_keywords;
    }
    if (Array.isArray(content.mandatoryKeywords) && content.mandatoryKeywords.length > 0) {
      return content.mandatoryKeywords;
    }
    if (Array.isArray(correctAnswer?.mandatory_keywords)) {
      return correctAnswer.mandatory_keywords;
    }
    if (Array.isArray(correctAnswer?.mandatoryKeywords)) {
      return correctAnswer.mandatoryKeywords;
    }
    return [];
  }, [content, correctAnswer]);

  const partialThreshold =
    content.partial_threshold ?? content.partialThreshold ?? correctAnswer?.partial_threshold ?? 0.5;

  // Training Mode States
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showModelAnswerModal, setShowModelAnswerModal] = useState<boolean>(false);

  // Calculate live word count
  const wordCount = useMemo(() => {
    return currentText.trim().split(/\s+/).filter(Boolean).length;
  }, [currentText]);

  // Draft Auto-Save in Simulator Mode
  useEffect(() => {
    if (!isTraining && attemptId && questionId && typeof window !== 'undefined') {
      const storageKey = `exam:${attemptId}:q:${questionId}:draft`;
      if (currentText) {
        localStorage.setItem(storageKey, currentText);
      } else {
        const saved = localStorage.getItem(storageKey);
        if (saved && !currentText) {
          onChange({ text: saved });
        }
      }
    }
  }, [isTraining, attemptId, questionId, currentText, onChange]);

  // Handle local instant evaluation in Training Mode (0ms, zero network requests)
  const handleCheckAnswer = () => {
    if (!currentText.trim()) return;

    const result = matchKeywords(currentText, mandatoryKeywords, maxMarks, partialThreshold);
    setEvalResult(result);

    if (result.status === 'FULL') {
      playSuccess();
    } else if (result.status === 'PARTIAL') {
      playPartial();
    } else {
      playError();
    }
  };

  const handleTextChange = (val: string) => {
    if (isReadonly) return;
    onChange({ text: val });
    if (evalResult) {
      setEvalResult(null); // Reset feedback evaluation when editing text
    }
  };

  const toggleHint = () => {
    playClick();
    setShowHint(!showHint);
  };

  const toggleModelAnswerModal = () => {
    playModal();
    setShowModelAnswerModal(!showModelAnswerModal);
  };

  // Helper to render model answer with mandatory keywords highlighted in bold
  const renderHighlightedModelAnswer = (text: string, keywords: string[]) => {
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
    <div className="space-y-5" dir="rtl">
      {/* Question Prompt */}
      {content.prompt && (
        <div className="text-base md:text-lg font-bold text-slate-900 leading-relaxed">
          <MathView text={content.prompt} />
        </div>
      )}

      {/* Flexible Textarea with Word Counter */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={currentText}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={isReadonly}
            rows={5}
            placeholder="اكتب صياغتك الدقيقة والمختصرة هنا..."
            className="w-full p-4 border-2 border-slate-200 focus:border-amber-500 rounded-3xl bg-white text-slate-900 focus:outline-none focus:ring-4 focus:ring-amber-500/10 leading-relaxed text-base resize-y font-medium shadow-inner transition-all dir-rtl"
          />

          {/* Training Check Answer Button (Embedded in corner) */}
          {isTraining && !isReadonly && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={!currentText.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>إرسال وفحص الإجابة 🔍</span>
              </button>
            </div>
          )}
        </div>

        {/* Word Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-medium">
          <span className="flex items-center gap-1.5">
            <ThreeDIcon type="3d-pencil" size={18} />
            <span>إجابة مقالية قصيرة هيكلية</span>
          </span>
          <span className={wordCount > maxWords ? 'text-amber-600 font-bold' : ''}>
            {wordCount} / {maxWords} كلمة موصى بها
          </span>
        </div>
      </div>

      {/* Immediate Training Feedback Banner */}
      {isTraining && evalResult && (
        <div
          className={`p-4 rounded-3xl border-2 space-y-3 animate-in fade-in duration-200 shadow-sm ${
            evalResult.status === 'FULL'
              ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
              : evalResult.status === 'PARTIAL'
              ? 'bg-amber-50/90 border-amber-400 text-amber-950'
              : 'bg-rose-50/90 border-rose-400 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-black text-sm md:text-base">
              {evalResult.status === 'FULL' ? (
                <>
                  <ThreeDIcon type="3d-check" size={28} />
                  <span>أحسنت! إجابتك تحتوي على المفاهيم الأساسية المطلوبة.</span>
                </>
              ) : evalResult.status === 'PARTIAL' ? (
                <>
                  <ThreeDIcon type="3d-sparkles" size={28} />
                  <span>إجابتك تقترب من الصواب؛ تم رصد بعض المفاهيم الإلزامية.</span>
                </>
              ) : (
                <>
                  <ThreeDIcon type="3d-cross" size={28} />
                  <span>إجابة غير مكتملة؛ يُرجى إعادة الصياغة وتضمين العناصر الوزارية.</span>
                </>
              )}
            </div>

            <span className="font-extrabold text-sm px-3 py-1 rounded-xl bg-white/80 shadow-xs shrink-0">
              +{evalResult.score} من {evalResult.maxScore} درجة
            </span>
          </div>

          {/* Keyword Match Breakdown */}
          {mandatoryKeywords.length > 0 && (
            <div className="pt-2 border-t border-black/10 space-y-2 text-xs">
              <div className="font-extrabold text-slate-800">تحليل الكلمات والمفاهيم المفتاحية:</div>
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
                    className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-xl font-bold flex items-center gap-1 opacity-90"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>{kw} (ناقص)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Toolbar (Single Row: Hint + Model Answer) */}
      {isTraining && (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {/* Show Hint Button */}
            {(content.hint || explanation) && (
              <button
                type="button"
                onClick={toggleHint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>{showHint ? 'إخفاء التلميح' : '💡 عرض التلميح'}</span>
                {showHint ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Show Model Answer Button */}
            {modelAnswer && (
              <button
                type="button"
                onClick={toggleModelAnswerModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>👁️ عرض الإجابة النموذجية</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hint Dropdown Box */}
      {isTraining && showHint && (content.hint || explanation) && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed space-y-1 animate-in fade-in duration-150">
          <div className="font-extrabold text-amber-900 flex items-center gap-1">
            <ThreeDIcon type="3d-bulb" size={20} />
            <span>تلميح المنهج المقرر:</span>
          </div>
          <p>{content.hint || explanation}</p>
        </div>
      )}

      {/* Model Answer Modal */}
      {isTraining && showModelAnswerModal && modelAnswer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 border border-slate-200 shadow-2xl relative dir-rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <ThreeDIcon type="3d-bulb" size={28} />
                <span>الإجابة النموذجية والكلمات المفتاحية</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModelAnswerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-800 font-medium">
                {renderHighlightedModelAnswer(modelAnswer, mandatoryKeywords)}
              </div>

              {mandatoryKeywords.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700">الكلمات والمفاهيم المفتاحية الإلزامية:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {mandatoryKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg border border-emerald-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowModelAnswerModal(false)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
            >
              فهمت ذلك، العودة للسؤال
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortEssayRenderer;
