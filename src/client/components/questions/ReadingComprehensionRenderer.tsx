import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  Highlighter,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Bookmark,
  Award,
  Layers
} from 'lucide-react';
import { ReadingSkillLevel, ActiveReadingSubQuestion, VocabularyEntry, ReadingParagraph } from '../../../shared/types';

interface ReadingComprehensionProps {
  content: {
    prompt?: string;
    passageId?: string;
    passageTitle?: string;
    passage: string;
    paragraphs?: ReadingParagraph[];
    vocabulary?: VocabularyEntry[];
    subQuestions: ActiveReadingSubQuestion[] | Array<{
      id: string;
      prompt?: string;
      question?: string;
      options?: Array<{ id: string; text: string }> | string[];
      skill?: ReadingSkillLevel;
      type?: string;
      evidence?: {
        required: boolean;
        prompt?: string;
      };
      hints?: Array<{ level: number; text: string; focusParagraphId?: string }>;
      explanation?: string;
    }>;
  };
  answer?: {
    subAnswers?: Record<string, any>;
    sessionAnnotations?: {
      highlights?: Array<{ paragraphId?: string; sentenceId?: string; color?: string; text?: string }>;
      activeVocabLookups?: string[];
    };
  };
  onChange: (ans: {
    subAnswers: Record<string, any>;
    sessionAnnotations?: any;
  }) => void;
  isReadonly?: boolean;
  isSimulator?: boolean;
}

const SKILL_LABELS: Record<ReadingSkillLevel, { labelAr: string; color: string; icon: string }> = {
  literal: { labelAr: 'الفهم الحرفي', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📖' },
  vocabulary: { labelAr: 'فهم المفردات من السياق', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🔤' },
  inference: { labelAr: 'الاستنتاج والتفسير', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '💡' },
  analysis: { labelAr: 'التحليل والربط', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: '🧩' },
  evaluation: { labelAr: 'التقييم والقراءة النقدية', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: '⚖️' },
};

export const ReadingComprehensionRenderer: React.FC<ReadingComprehensionProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  isSimulator = false,
}) => {
  const subAnswers = answer?.subAnswers || {};
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);

  // Training mode state
  const [activeVocabModal, setActiveVocabModal] = useState<VocabularyEntry | null>(null);
  const [activeHintLevel, setActiveHintLevel] = useState<Record<string, number>>({});
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'green' | 'blue'>('yellow');
  const [highlights, setHighlights] = useState<Array<{ paragraphId?: string; text: string; color: string }>>(
    answer?.sessionAnnotations?.highlights || []
  );
  const [pickingEvidenceForSubId, setPickingEvidenceForSubId] = useState<string | null>(null);

  // Normalize paragraphs
  const parsedParagraphs: ReadingParagraph[] = React.useMemo(() => {
    if (content.paragraphs && content.paragraphs.length > 0) {
      return content.paragraphs;
    }
    const rawText = content.passage || '';
    const parts = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    return parts.map((text, idx) => ({
      id: `p${idx + 1}`,
      number: idx + 1,
      text: text.trim(),
    }));
  }, [content.paragraphs, content.passage]);

  const subQuestions = content.subQuestions || [];
  const currentSub = subQuestions[activeSubIndex];

  // Helper to update sub-answers
  const handleSubAnswerChange = (subId: string, updatedSubData: any) => {
    if (isReadonly) return;
    const newSubAnswers = {
      ...subAnswers,
      [subId]: typeof updatedSubData === 'object' && updatedSubData !== null
        ? {
            ...(typeof subAnswers[subId] === 'object' ? subAnswers[subId] : {}),
            ...updatedSubData,
          }
        : updatedSubData,
    };
    onChange({
      subAnswers: newSubAnswers,
      sessionAnnotations: {
        highlights,
      },
    });
  };

  // Attach evidence
  const handleAttachEvidence = (subId: string, paragraph: ReadingParagraph) => {
    if (isReadonly) return;
    const existing = subAnswers[subId] || {};
    const coreVal = typeof existing === 'object' ? existing.coreAnswer ?? existing.selectedOptionId ?? existing.value : existing;
    handleSubAnswerChange(subId, {
      coreAnswer: coreVal,
      evidence: {
        paragraphId: paragraph.id,
        sentenceId: `${paragraph.id}_s1`,
        selectedQuote: paragraph.text.length > 100 ? paragraph.text.substring(0, 97) + '...' : paragraph.text,
      },
    });
    setPickingEvidenceForSubId(null);
  };

  // Add highlight
  const handleHighlightParagraph = (p: ReadingParagraph) => {
    if (isSimulator || isReadonly) return;
    const existingIdx = highlights.findIndex((h) => h.paragraphId === p.id);
    let newHighlights = [...highlights];
    if (existingIdx >= 0) {
      newHighlights.splice(existingIdx, 1);
    } else {
      newHighlights.push({
        paragraphId: p.id,
        text: p.text,
        color: highlightColor,
      });
    }
    setHighlights(newHighlights);
    onChange({
      subAnswers,
      sessionAnnotations: { highlights: newHighlights },
    });
  };

  return (
    <div className="space-y-6 dir-rtl text-right font-sans">
      {/* Title & Domain Header */}
      {(content.passageTitle || content.prompt) && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-900 text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-emerald-800/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-amber-100">
                {content.passageTitle || 'رحلة القارئ النشط'}
              </h2>
            </div>
            {!isSimulator && (
              <span className="text-xs bg-emerald-800/60 text-emerald-200 px-3 py-1 rounded-full border border-emerald-700/50 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                وضع التدريب التفاعلي
              </span>
            )}
          </div>
          {content.prompt && (
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              {content.prompt}
            </p>
          )}
        </div>
      )}

      {/* Main Split Grid: Passage Pane (Right) & Questions Pane (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PASSAGE PANE (7 cols on lg) */}
        <div className="lg:col-span-7 bg-amber-50/50 border border-amber-200/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm sticky top-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-amber-200/70 pb-3">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm sm:text-base">
              <FileText className="w-4 h-4 text-amber-800 shrink-0" />
              <span>النص القرائي (اقرأ بتمعن)</span>
            </div>
            {!isSimulator && (
              <div className="flex items-center gap-1.5 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300/60 text-xs text-amber-900">
                <Highlighter className="w-3.5 h-3.5 text-amber-700" />
                <span>التظليل:</span>
                <button
                  type="button"
                  onClick={() => setHighlightColor('yellow')}
                  className={`w-4 h-4 rounded-full bg-yellow-300 border ${highlightColor === 'yellow' ? 'ring-2 ring-amber-600 scale-110' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setHighlightColor('green')}
                  className={`w-4 h-4 rounded-full bg-emerald-300 border ${highlightColor === 'green' ? 'ring-2 ring-emerald-600 scale-110' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setHighlightColor('blue')}
                  className={`w-4 h-4 rounded-full bg-sky-300 border ${highlightColor === 'blue' ? 'ring-2 ring-sky-600 scale-110' : ''}`}
                />
              </div>
            )}
          </div>

          {/* Paragraphs List */}
          <div className="space-y-4">
            {parsedParagraphs.map((p) => {
              const isHighlighted = highlights.some((h) => h.paragraphId === p.id);
              const highlightObj = highlights.find((h) => h.paragraphId === p.id);
              const isBeingPicked = pickingEvidenceForSubId !== null;

              let bgClass = 'bg-white/80 border-amber-100';
              if (isHighlighted) {
                if (highlightObj?.color === 'green') bgClass = 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200';
                else if (highlightObj?.color === 'blue') bgClass = 'bg-sky-50 border-sky-300 ring-1 ring-sky-200';
                else bgClass = 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-200';
              }

              if (isBeingPicked) {
                bgClass += ' hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400 cursor-pointer animate-pulse';
              }

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (isBeingPicked && currentSub) {
                      handleAttachEvidence(currentSub.id, p);
                    } else if (!isSimulator) {
                      handleHighlightParagraph(p);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all text-justify font-serif text-slate-800 text-base leading-loose relative group ${bgClass}`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs text-amber-800/80 font-sans select-none">
                    <span className="font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md">
                      فقرة {p.number}
                    </span>
                    {isBeingPicked && (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        اضغط هنا لتحديد هذه الفقرة كدليل
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-line">{p.text}</p>
                </div>
              );
            })}
          </div>

          {/* Vocabulary Explorer (Training Mode Only) */}
          {!isSimulator && content.vocabulary && content.vocabulary.length > 0 && (
            <div className="pt-3 border-t border-amber-200/60 space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-700" />
                <span>المعجم المساعد (اضغط الاستكشاف الدلالي):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {content.vocabulary.map((vocab) => (
                  <button
                    key={vocab.id}
                    type="button"
                    onClick={() => setActiveVocabModal(vocab)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>{vocab.word}</span>
                    <span className="text-[10px] text-purple-600 bg-purple-200/60 px-1 rounded">معنى</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* QUESTIONS PANE (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Multi-question Tab Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>أسئلة النص ({subQuestions.length}):</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                السؤال {activeSubIndex + 1} من {subQuestions.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {subQuestions.map((sq, idx) => {
                const isSelected = idx === activeSubIndex;
                const sqAns = subAnswers[sq.id];
                const hasAnswer = sqAns !== undefined && sqAns !== null && sqAns !== '';
                return (
                  <button
                    key={sq.id}
                    type="button"
                    onClick={() => {
                      setActiveSubIndex(idx);
                      setPickingEvidenceForSubId(null);
                    }}
                    className={`w-9 h-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-300'
                        : hasAnswer
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Sub-Question Card */}
          {currentSub && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              {/* Skill Badge */}
              {currentSub.skill && SKILL_LABELS[currentSub.skill as ReadingSkillLevel] && (
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      SKILL_LABELS[currentSub.skill as ReadingSkillLevel].color
                    }`}
                  >
                    <span>{SKILL_LABELS[currentSub.skill as ReadingSkillLevel].icon}</span>
                    <span>مستوى المهارة: {SKILL_LABELS[currentSub.skill as ReadingSkillLevel].labelAr}</span>
                  </span>
                  {currentSub.marks && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {currentSub.marks} {currentSub.marks === 1 ? 'درجة' : 'درجات'}
                    </span>
                  )}
                </div>
              )}

              {/* Sub-question Prompt */}
              <div className="text-base font-bold text-slate-900 leading-relaxed">
                {(currentSub as any).prompt || (currentSub as any).question}
              </div>

              {/* Input Renderer (MCQ vs Essay / Fill blank) */}
              {(currentSub as any).options && (currentSub as any).options.length > 0 ? (
                <div className="space-y-2">
                  {((currentSub as any).options as any[]).map((opt) => {
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    const optText = typeof opt === 'object' ? opt.text : opt;
                    const sqAns = subAnswers[currentSub.id];
                    const selectedVal = typeof sqAns === 'object' && sqAns !== null
                      ? sqAns.coreAnswer ?? sqAns.selectedOptionId
                      : sqAns;
                    const isChecked = String(selectedVal) === String(optId);

                    return (
                      <button
                        key={String(optId)}
                        type="button"
                        onClick={() => handleSubAnswerChange(currentSub.id, { coreAnswer: String(optId) })}
                        disabled={isReadonly}
                        className={`w-full p-3 rounded-xl border text-right text-sm font-medium transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{optText}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isChecked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={
                    typeof subAnswers[currentSub.id] === 'object' && subAnswers[currentSub.id] !== null
                      ? subAnswers[currentSub.id].coreAnswer || ''
                      : subAnswers[currentSub.id] || ''
                  }
                  onChange={(e) => handleSubAnswerChange(currentSub.id, { coreAnswer: e.target.value })}
                  disabled={isReadonly}
                  rows={3}
                  placeholder="أدخل إجابتك بناءً على فهمك للنص..."
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              )}

              {/* Supporting Evidence Picker Card */}
              {currentSub.evidence && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>الدليل النصي المباشر {currentSub.evidence.required ? '(مطلوب)' : '(اختياري)'}:</span>
                    </span>
                  </div>

                  {(() => {
                    const sqAns = subAnswers[currentSub.id];
                    const evData = typeof sqAns === 'object' && sqAns !== null ? sqAns.evidence : undefined;

                    if (evData && evData.selectedQuote) {
                      return (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-950">
                          <div className="flex items-center justify-between font-bold text-amber-900">
                            <span>الدليل المقتطع (من الفقرة {evData.paragraphId || 'المحددة'}):</span>
                            {!isReadonly && (
                              <button
                                type="button"
                                onClick={() => handleSubAnswerChange(currentSub.id, { evidence: undefined })}
                                className="text-rose-600 hover:text-rose-800 text-[11px] underline"
                              >
                                إزالة الدليل
                              </button>
                            )}
                          </div>
                          <p className="font-serif italic text-slate-800 font-medium">"{evData.selectedQuote}"</p>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => setPickingEvidenceForSubId(currentSub.id)}
                        disabled={isReadonly}
                        className={`w-full p-2.5 rounded-xl border border-dashed text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          pickingEvidenceForSubId === currentSub.id
                            ? 'bg-amber-100 border-amber-500 text-amber-900 animate-pulse'
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400'
                        }`}
                      >
                        <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          {pickingEvidenceForSubId === currentSub.id
                            ? 'اضغط الآن على الفقرة المناسبة في النص على اليمين...'
                            : 'تحديد الدليل النصي بالضغط على الفقرة في النص'}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* Progressive Hints (Training Mode Only) */}
              {!isSimulator && currentSub.hints && currentSub.hints.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span>التلميحات التكيفية (مستوى {activeHintLevel[currentSub.id] || 0} من {currentSub.hints.length}):</span>
                    </span>
                    {(activeHintLevel[currentSub.id] || 0) < currentSub.hints.length && (
                      <button
                        type="button"
                        onClick={() => {
                          const curr = activeHintLevel[currentSub.id] || 0;
                          setActiveHintLevel({ ...activeHintLevel, [currentSub.id]: curr + 1 });
                        }}
                        className="text-xs bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer font-bold"
                      >
                        إظهار التلميح التالي
                      </button>
                    )}
                  </div>

                  {(activeHintLevel[currentSub.id] || 0) > 0 && (
                    <div className="space-y-1.5">
                      {currentSub.hints.slice(0, activeHintLevel[currentSub.id]).map((hint, hIdx) => (
                        <div
                          key={hIdx}
                          className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl text-xs text-purple-950 leading-relaxed font-medium"
                        >
                          <span className="font-bold text-purple-900 ml-1">تلميح {hint.level}:</span>
                          <span>{hint.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Next / Previous Sub-question Navigation Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSubIndex(Math.max(0, activeSubIndex - 1))}
                  disabled={activeSubIndex === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السؤال السابق</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubIndex(Math.min(subQuestions.length - 1, activeSubIndex + 1))}
                  disabled={activeSubIndex === subQuestions.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>السؤال التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vocabulary Modal Popup (Training Mode Only) */}
      {activeVocabModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 dir-rtl text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-lg">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span>الاستكشاف الدلالي: {activeVocabModal.word}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVocabModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-800">
              {activeVocabModal.root && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 text-xs">جذر الكلمة:</span>
                  <span className="font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-xs">
                    {activeVocabModal.root}
                  </span>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-700 text-xs block mb-1">المعنى والدلالة في السياق:</span>
                <p className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-950 font-medium leading-relaxed">
                  {activeVocabModal.definition}
                </p>
              </div>
              {activeVocabModal.contextualNote && (
                <div>
                  <span className="font-bold text-slate-700 text-xs block mb-1">ملاحظة سياقية:</span>
                  <p className="text-xs text-slate-600 italic">
                    {activeVocabModal.contextualNote}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveVocabModal(null)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              فهمت المعنى، إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
