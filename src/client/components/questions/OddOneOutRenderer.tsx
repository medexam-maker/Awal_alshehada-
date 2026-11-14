import React, { useState } from 'react';
import { Ban, Check, X, HelpCircle, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

interface OddOneOutProps {
  content: {
    prompt?: string;
    passage?: string;
    items: Array<string | { id: string; text: string }>;
    reasoning?: {
      prompt: string;
      marksFraction?: number;
      trainingChoices?: Array<{ id: string; text: string }>;
      referenceReason?: string;
    };
    requireReason?: boolean;
  };
  answer?: {
    selectedItemIds?: string[];
    reasonChoiceId?: string;
    reasonText?: string;
    reasonConfirmed?: boolean;
    reasonSelfEval?: boolean;
    // Legacy support
    selectedItem?: string;
    reason?: string;
  };
  onChange: (ans: {
    selectedItemIds: string[];
    reasonChoiceId?: string;
    reasonText?: string;
    reasonConfirmed?: boolean;
    reasonSelfEval?: boolean;
    selectedItem?: string;
    reason?: string;
  }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
  trainingSubMode?: 'yearly' | 'curriculum_review' | 'weekly';
  isWeeklySimulation?: boolean;
}

export const OddOneOutRenderer: React.FC<OddOneOutProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
  trainingSubMode,
  isWeeklySimulation = false,
}) => {
  const isTraining = examMode === 'training';
  const isWeeklySimulationActive =
    examMode === 'simulator' &&
    (isWeeklySimulation === true || trainingSubMode === 'weekly');

  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  // Normalize items
  const items = (content?.items || []).map((it, idx) => {
    if (typeof it === 'object' && it !== null && 'id' in it) {
      return { id: String(it.id), text: String(it.text) };
    }
    const str = String(it);
    return { id: str || `item_${idx}`, text: str };
  });

  // Selected item IDs
  const selectedItemIds: string[] = answer?.selectedItemIds && answer.selectedItemIds.length > 0
    ? answer.selectedItemIds
    : answer?.selectedItem
    ? [answer.selectedItem]
    : [];

  const reasonChoiceId = answer?.reasonChoiceId;
  const reasonText = answer?.reasonText ?? answer?.reason ?? '';
  const isReasonConfirmed = isWeeklySimulationActive && Boolean(answer?.reasonConfirmed);
  const reasonSelfEval = answer?.reasonSelfEval;
  const hasSelfEvalChoice = isReasonConfirmed && typeof reasonSelfEval === 'boolean';

  // Correct answer resolution in Training mode
  const correctItemIds: string[] = Array.isArray(correctAnswer?.selectedItemIds)
    ? correctAnswer.selectedItemIds
    : correctAnswer?.selectedItem
    ? [correctAnswer.selectedItem]
    : typeof correctAnswer === 'string'
    ? [correctAnswer]
    : [];

  const correctChoiceId: string | undefined = correctAnswer?.reasoning?.correctChoiceId ?? correctAnswer?.correctChoiceId;

  const isStage1Correct = isTraining && selectedItemIds.length > 0 && correctItemIds.length > 0 &&
    selectedItemIds.length === correctItemIds.length &&
    selectedItemIds.every((id) => correctItemIds.includes(id));

  const selectedItemText = items.find((i) => selectedItemIds.includes(i.id))?.text;

  const handleSelectOddItem = (item: { id: string; text: string }) => {
    if (isReadonly || isReasonConfirmed) return;
    setWeeklyError(null);
    const newSelected = [item.id];
    onChange({
      selectedItemIds: newSelected,
      reasonChoiceId: isTraining ? undefined : reasonChoiceId,
      reasonText,
      ...(answer?.reasonConfirmed !== undefined ? { reasonConfirmed: answer.reasonConfirmed } : {}),
      ...(typeof answer?.reasonSelfEval === 'boolean' ? { reasonSelfEval: answer.reasonSelfEval } : {}),
      selectedItem: item.text,
      reason: reasonText,
    });

    if (isTraining && correctItemIds.length > 0) {
      if (correctItemIds.includes(item.id)) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  const handleReasonChoiceSelect = (choice: { id: string; text: string }) => {
    if (isReadonly) return;
    onChange({
      selectedItemIds,
      reasonChoiceId: choice.id,
      reasonText,
      selectedItem: selectedItemText,
      reason: reasonText,
    });

    if (isTraining && correctChoiceId) {
      if (choice.id === correctChoiceId) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  const handleReasonTextChange = (val: string) => {
    if (isReadonly || isReasonConfirmed) return;
    setWeeklyError(null);
    onChange({
      selectedItemIds,
      reasonChoiceId,
      reasonText: val,
      ...(answer?.reasonConfirmed !== undefined ? { reasonConfirmed: answer.reasonConfirmed } : {}),
      ...(typeof answer?.reasonSelfEval === 'boolean' ? { reasonSelfEval: answer.reasonSelfEval } : {}),
      selectedItem: selectedItemText,
      reason: val,
    });
  };

  const handleRevealWeeklyReason = () => {
    if (isReadonly || isReasonConfirmed) return;
    if (selectedItemIds.length === 0) {
      setWeeklyError('يرجى تحديد الكلمة الشاذة أولاً قبل إظهار السبب الصحيح.');
      return;
    }
    if (!reasonText.trim()) {
      setWeeklyError('يرجى كتابة تعليل اختيارك أولاً قبل إظهار السبب الصحيح.');
      return;
    }
    setWeeklyError(null);
    onChange({
      selectedItemIds,
      reasonText: reasonText.trim(),
      reasonConfirmed: true,
      ...(typeof answer?.reasonSelfEval === 'boolean' ? { reasonSelfEval: answer.reasonSelfEval } : {}),
      selectedItem: selectedItemText,
      reason: reasonText.trim(),
    });
  };

  const handleWeeklySelfEval = (val: boolean) => {
    if (isReadonly || hasSelfEvalChoice) return;
    onChange({
      selectedItemIds,
      reasonText: reasonText.trim(),
      reasonConfirmed: true,
      reasonSelfEval: val,
      selectedItem: selectedItemText,
      reason: reasonText.trim(),
    });
    playFeedbackSound(val ? 'correct' : 'incorrect');
  };

  const hasReasoning = Boolean(content?.reasoning?.prompt || content?.requireReason);
  const trainingChoices = content?.reasoning?.trainingChoices || [];
  const referenceReason = content?.reasoning?.referenceReason || '';

  return (
    <div className="space-y-6 dir-rtl text-right font-sans" dir="rtl">
      {/* Passage if present */}
      {content?.passage && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed text-sm md:text-base">
          {content.passage}
        </div>
      )}

      {/* Stage 1: Item Selection Cards */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>المرحلة الأولى: حدد الكلمة أو المصطلح الشاذ (الذي لا ينتمي إلى المجموعة):</span>
          </div>
          {isReasonConfirmed && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Lock className="w-3 h-3" />
              <span>تم قفل الاختيار</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const isSelected = selectedItemIds.includes(item.id);

            let cardStyle = 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30';
            let iconElement = <Ban className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />;

            if (isTraining && correctItemIds.length > 0) {
              const isItemCorrect = correctItemIds.includes(item.id);
              if (isSelected) {
                if (isItemCorrect) {
                  cardStyle = 'bg-emerald-100 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm';
                  iconElement = <Check className="w-5 h-5 text-emerald-700 stroke-[3]" />;
                } else {
                  cardStyle = 'bg-rose-100 border-rose-600 text-rose-950 ring-2 ring-rose-500/20 shadow-sm';
                  iconElement = <X className="w-5 h-5 text-rose-700 stroke-[3]" />;
                }
              } else if (selectedItemIds.length > 0 && isItemCorrect) {
                cardStyle = 'bg-emerald-50 border-dashed border-emerald-400 text-emerald-900';
                iconElement = <Check className="w-5 h-5 text-emerald-600 stroke-[2]" />;
              }
            } else if (isSelected) {
              // Simulator: neutral selection
              cardStyle = 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm font-bold';
              iconElement = <Check className="w-5 h-5 text-emerald-600 stroke-[2.5]" />;
            }

            const isLockedCard = isReadonly || isReasonConfirmed;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectOddItem(item)}
                disabled={isLockedCard}
                className={`p-4 rounded-2xl border-2 text-center font-bold text-base transition-all flex flex-col items-center justify-center gap-2 min-h-[96px] ${
                  isLockedCard ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                } ${cardStyle}`}
              >
                {iconElement}
                <span>{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage 2: Reasoning */}
      {hasReasoning && (
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <label className="text-sm font-bold text-slate-800 block">
            {content.reasoning?.prompt || 'علل سبب استبعادك لهذه الكلمة:'}
          </label>

          {/* Training Mode: 3 Choice Chips (revealed once odd item is selected) */}
          {isTraining ? (
            <div className="space-y-2">
              {!isStage1Correct && selectedItemIds.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  حدد الكلمة الشاذة الصحيحة أولاً لإظهار خيارات التعليل.
                </p>
              )}

              {isStage1Correct && trainingChoices.length > 0 && (
                <div className="grid grid-cols-1 gap-2.5">
                  {trainingChoices.map((choice) => {
                    const isChoiceSelected = reasonChoiceId === choice.id;
                    const isChoiceCorrect = choice.id === correctChoiceId;

                    let choiceStyle = 'bg-white border-slate-200 text-slate-800 hover:border-slate-300';
                    let statusIcon = null;

                    if (isChoiceSelected) {
                      if (correctChoiceId && isChoiceCorrect) {
                        choiceStyle = 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold';
                        statusIcon = <Check className="w-4 h-4 text-emerald-700 stroke-[3] shrink-0" />;
                      } else if (correctChoiceId && !isChoiceCorrect) {
                        choiceStyle = 'bg-rose-100 border-rose-600 text-rose-950 font-bold';
                        statusIcon = <X className="w-4 h-4 text-rose-700 stroke-[3] shrink-0" />;
                      } else {
                        choiceStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                      }
                    } else if (reasonChoiceId && correctChoiceId && isChoiceCorrect) {
                      choiceStyle = 'bg-emerald-50/70 border-dashed border-emerald-400 text-emerald-900';
                      statusIcon = <Check className="w-4 h-4 text-emerald-600 shrink-0" />;
                    }

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => handleReasonChoiceSelect(choice)}
                        disabled={isReadonly}
                        className={`p-3.5 rounded-xl border-2 text-right text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${choiceStyle}`}
                      >
                        <span className="leading-relaxed">{choice.text}</span>
                        {statusIcon}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isWeeklySimulationActive ? (
            /* Weekly Simulation Mode: single-line input (no autocomplete), Enter or "أظهر السبب" button, then reveal referenceReason & lock + نعم/لا */
            <div className="space-y-4">
              {!isReasonConfirmed ? (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      value={reasonText}
                      onChange={(e) => handleReasonTextChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRevealWeeklyReason();
                        }
                      }}
                      disabled={isReadonly || isReasonConfirmed}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder="اكتب تعليل اختيارك هنا ثم اضغط أظهر السبب..."
                      className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl bg-white text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleRevealWeeklyReason}
                      disabled={isReadonly || isReasonConfirmed}
                      className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>أظهر السبب</span>
                    </button>
                  </div>

                  {weeklyError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{weeklyError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Confirmed State (Locked): show written reason, true referenceReason card, and locked نعم / لا self-evaluation */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span>إجابتك المسجلة:</span>
                        <Lock className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 leading-relaxed">
                        {reasonText}
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50 border-2 border-emerald-200 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-emerald-800 block">
                        السبب الصحيح:
                      </span>
                      <div className="text-sm font-black text-emerald-950 leading-relaxed">
                        {referenceReason || 'غير محدد'}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-emerald-400" />
                        <span>هل كانت إجابتك صحيحة؟</span>
                      </div>
                      {hasSelfEvalChoice && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>تم تسجيل تقييمك</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={isReadonly || hasSelfEvalChoice}
                        onClick={() => handleWeeklySelfEval(true)}
                        className={`py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                          reasonSelfEval === true
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-md'
                            : hasSelfEvalChoice
                            ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>نعم</span>
                      </button>

                      <button
                        type="button"
                        disabled={isReadonly || hasSelfEvalChoice}
                        onClick={() => handleWeeklySelfEval(false)}
                        className={`py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
                          reasonSelfEval === false
                            ? 'bg-rose-600 text-white ring-2 ring-rose-300 shadow-md'
                            : hasSelfEvalChoice
                            ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer'
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        <span>لا</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Simulator Mode: Free-text justification only, no reveal, nothing locked until submission */
            <div className="space-y-1.5">
              <textarea
                value={reasonText}
                onChange={(e) => handleReasonTextChange(e.target.value)}
                disabled={isReadonly}
                rows={3}
                autoComplete="off"
                placeholder="اكتب تعليل اختيارك بكلماتك الخاصة هنا..."
                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-xs text-slate-400">
                سيتم تقييم التعليل وفق المعايير المعتمدة بعد التسليم.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

