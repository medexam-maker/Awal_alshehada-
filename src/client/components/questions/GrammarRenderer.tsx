import React, { useState } from 'react';
import { BookOpen, HelpCircle, CheckCircle2, XCircle, Award } from 'lucide-react';
import { GrammarComponent, GrammarChoice, GrammarHint } from '../../../shared/types';

interface GrammarProps {
  content: {
    prompt?: string;
    sentence?: string;
    targetWord?: string;
    passage?: string;
    mode?: string;
    components?: GrammarComponent[];
    aspects?: Array<{
      id: string;
      label: string;
      options?: string[];
    }>;
  };
  answer?: {
    components?: Record<string, string>;
    analysis?: Record<string, string>;
  };
  correctAnswer?: {
    components?: Record<string, string>;
    analysis?: Record<string, string>;
  };
  onChange: (ans: any) => void;
  isReadonly?: boolean;
  examMode?: 'simulator' | 'training';
}

export const GrammarRenderer: React.FC<GrammarProps> = ({
  content,
  answer,
  correctAnswer,
  onChange,
  isReadonly = false,
  examMode = 'training',
}) => {
  // State for revealed hint levels per component in Training mode { [componentId]: number }
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});

  const components = content?.components;
  const isC1Mode = Array.isArray(components) && components.length > 0;

  // C1 Component Mode Answer Handler
  const selectedComponents = answer?.components || {};

  const handleComponentSelect = (componentId: string, choiceId: string) => {
    if (isReadonly) return;
    onChange({
      ...answer,
      components: {
        ...selectedComponents,
        [componentId]: choiceId,
      },
    });
  };

  const handleRevealHint = (componentId: string, maxHints: number) => {
    setRevealedHints((prev) => {
      const currentLevel = prev[componentId] || 0;
      if (currentLevel < maxHints) {
        return { ...prev, [componentId]: currentLevel + 1 };
      }
      return prev;
    });
  };

  // Legacy Mode Analysis Handler
  const legacyAnalysis = answer?.analysis || {};
  const handleLegacyAspectChange = (aspectId: string, val: string) => {
    if (isReadonly) return;
    onChange({
      analysis: {
        ...legacyAnalysis,
        [aspectId]: val,
      },
    });
  };

  if (!isC1Mode) {
    // Legacy Fallback Renderer
    return (
      <div className="space-y-6">
        {/* Target Sentence / Prompt Box */}
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>الجملة أو النص المطلوب:</span>
          </div>
          {content.sentence && (
            <div className="text-xl leading-relaxed text-slate-900 font-serif font-bold text-center py-2">
              {content.sentence}
            </div>
          )}
          {content.targetWord && (
            <div className="text-center">
              <span className="text-xs text-slate-500">الكلمة المحددة للإعراب: </span>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-950 font-bold rounded-lg text-sm border border-emerald-300">
                {content.targetWord}
              </span>
            </div>
          )}
        </div>

        {/* Grammar Aspects Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content?.aspects?.map((aspect) => (
            <div key={aspect.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <label className="text-sm font-bold text-slate-700 block">
                {aspect.label}:
              </label>
              {aspect.options && aspect.options.length > 0 ? (
                <select
                  value={legacyAnalysis[aspect.id] || ''}
                  onChange={(e) => handleLegacyAspectChange(aspect.id, e.target.value)}
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
                  value={legacyAnalysis[aspect.id] || ''}
                  onChange={(e) => handleLegacyAspectChange(aspect.id, e.target.value)}
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
  }

  // C1 Adaptive Grammar Lab Renderer
  const correctComponentsMap = correctAnswer?.components || {};

  return (
    <div className="space-y-6Dir text-right space-y-6">
      {/* Passage / Sentence Header Box */}
      {(content.passage || content.sentence) && (
        <div className="p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="text-xs font-bold text-emerald-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>الشاهد النحوي / الجملة:</span>
          </div>
          <p className="text-lg leading-relaxed text-slate-900 font-serif font-bold text-center py-1">
            {content.passage || content.sentence}
          </p>
          {content.targetWord && (
            <div className="text-center pt-1">
              <span className="text-xs text-slate-500">الكلمة المستهدفة: </span>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-sm border border-emerald-300">
                {content.targetWord}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grammar Components Grid */}
      <div className="space-y-5">
        {components.map((comp, compIdx) => {
          const selectedChoiceId = selectedComponents[comp.id];
          const correctChoiceId = correctComponentsMap[comp.id];
          const isSelected = Boolean(selectedChoiceId);
          const isCorrect = isReadonly && correctChoiceId && selectedChoiceId === correctChoiceId;
          const isWrong = isReadonly && correctChoiceId && selectedChoiceId && selectedChoiceId !== correctChoiceId;

          const currentHintLevel = revealedHints[comp.id] || 0;
          const availableHints = comp.hints || [];
          const hasHints = examMode === 'training' && availableHints.length > 0;

          return (
            <div
              key={comp.id || compIdx}
              className={`p-5 rounded-2xl border transition-all ${
                isCorrect
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : isWrong
                  ? 'bg-rose-50/60 border-rose-300'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Component Header: Label & Points */}
              <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {compIdx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{comp.label}</h4>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>{comp.points} درجات</span>
                </div>
              </div>

              {/* Choices Selection List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {comp.choices.map((choice: GrammarChoice) => {
                  const isChoiceSelected = selectedChoiceId === choice.id;
                  const isChoiceCorrectKey = isReadonly && correctChoiceId === choice.id;

                  let choiceStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/30';
                  if (isChoiceSelected) {
                    choiceStyle = 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold';
                  }
                  if (isReadonly) {
                    if (isChoiceCorrectKey) {
                      choiceStyle = 'bg-emerald-500 border-emerald-500 text-white font-bold ring-2 ring-emerald-300';
                    } else if (isChoiceSelected && !isChoiceCorrectKey) {
                      choiceStyle = 'bg-rose-500 border-rose-500 text-white font-bold opacity-80';
                    } else {
                      choiceStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isReadonly}
                      onClick={() => handleComponentSelect(comp.id, choice.id)}
                      className={`w-full text-right p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-2 ${choiceStyle}`}
                    >
                      <span className="font-medium">{choice.text}</span>
                      {isReadonly && isChoiceCorrectKey && (
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                      )}
                      {isReadonly && isChoiceSelected && !isChoiceCorrectKey && (
                        <XCircle className="w-4 h-4 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Readonly Review Correct Answer Feedback */}
              {isReadonly && isWrong && (
                <div className="mt-3 p-2.5 bg-rose-100/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    الإجابة الصحيحة: <strong>{comp.choices.find((ch) => ch.id === correctChoiceId)?.text}</strong>
                  </span>
                </div>
              )}

              {/* Progressive Hints Section (Training Mode Only) */}
              {hasHints && !isReadonly && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleRevealHint(comp.id, availableHints.length)}
                      disabled={currentHintLevel >= availableHints.length}
                      className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                        currentHintLevel >= availableHints.length
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {currentHintLevel === 0
                          ? 'طلب تلميح'
                          : currentHintLevel < availableHints.length
                          ? `تلميح إضافي (${currentHintLevel}/${availableHints.length})`
                          : 'تم إظهار جميع التلميحات'}
                      </span>
                    </button>
                  </div>

                  {/* Revealed Hints Box */}
                  {currentHintLevel > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {availableHints.slice(0, currentHintLevel).map((hint: GrammarHint, hIdx: number) => (
                        <div
                          key={hIdx}
                          className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2 animate-fadeIn"
                        >
                          <span className="inline-block px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-bold shrink-0">
                            مستوى {hint.level || hIdx + 1}
                          </span>
                          <span className="font-medium leading-relaxed">{hint.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
