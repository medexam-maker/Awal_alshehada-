import React from 'react';
import { Ban, Check, X, HelpCircle } from 'lucide-react';
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
    };
    requireReason?: boolean;
  };
  answer?: {
    selectedItemIds?: string[];
    reasonChoiceId?: string;
    reasonText?: string;
    // Legacy support
    selectedItem?: string;
    reason?: string;
  };
  onChange: (ans: {
    selectedItemIds: string[];
    reasonChoiceId?: string;
    reasonText?: string;
    selectedItem?: string;
    reason?: string;
  }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

export const OddOneOutRenderer: React.FC<OddOneOutProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const isTraining = examMode === 'training';

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

  const handleSelectOddItem = (item: { id: string; text: string }) => {
    if (isReadonly) return;
    const newSelected = [item.id];
    onChange({
      selectedItemIds: newSelected,
      reasonChoiceId: isTraining ? undefined : reasonChoiceId,
      reasonText,
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
      selectedItem: items.find((i) => selectedItemIds.includes(i.id))?.text,
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
    if (isReadonly) return;
    onChange({
      selectedItemIds,
      reasonChoiceId,
      reasonText: val,
      selectedItem: items.find((i) => selectedItemIds.includes(i.id))?.text,
      reason: val,
    });
  };

  const hasReasoning = Boolean(content?.reasoning?.prompt || content?.requireReason);
  const trainingChoices = content?.reasoning?.trainingChoices || [];

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
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>المرحلة الأولى: حدد الكلمة أو المصطلح الشاذ (الذي لا ينتمي إلى المجموعة):</span>
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

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectOddItem(item)}
                disabled={isReadonly}
                className={`p-4 rounded-2xl border-2 text-center font-bold text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[96px] ${cardStyle}`}
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
          ) : (
            /* Simulator Mode: Free-text justification ALWAYS visible */
            <div className="space-y-1.5">
              <textarea
                value={reasonText}
                onChange={(e) => handleReasonTextChange(e.target.value)}
                disabled={isReadonly}
                rows={3}
                placeholder="اكتب تعليل اختيارك بكلماتك الخاصة هنا..."
                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-xs text-slate-400">
                سيتم تقييم التعليل تلقائياً وفق المفاهيم والمصطلحات المنهجية المعتمدة.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
