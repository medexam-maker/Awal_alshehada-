import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, X, Check, Bell, Sparkles, RefreshCw } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

export interface OrderingItem {
  id: string;
  text: string;
}

export interface OrderingRendererProps {
  questionId?: string;
  content: {
    prompt?: string;
    items?: OrderingItem[];
    shuffledBank?: OrderingItem[];
    correctOrder?: string[];
    scoring_type?: 'all_or_nothing' | 'partial';
  };
  answer?: {
    orderedIds?: string[];
    order?: Record<string, number>;
  };
  onChange: (ans: { orderedIds: string[]; order?: Record<string, number> }) => void;
  isReadonly?: boolean;
  correctAnswer?: {
    orderedIds?: string[];
    order?: Record<string, number>;
  };
  examMode?: 'simulator' | 'training';
}

/**
 * Single Fisher-Yates shuffle algorithm for stable bank items.
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const OrderingRenderer: React.FC<OrderingRendererProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const isTraining = examMode !== 'simulator';

  // Raw items from content
  const rawItems: OrderingItem[] = useMemo(() => {
    if (Array.isArray(content?.items) && content.items.length > 0) {
      return content.items.map((it: any, idx: number) => ({
        id: typeof it === 'string' ? `s${idx + 1}` : String(it.id || `s${idx + 1}`),
        text: typeof it === 'string' ? it : String(it.text || ''),
      }));
    }
    return [];
  }, [content?.items]);

  // Determine correct order IDs
  const correctOrder: string[] = useMemo(() => {
    if (Array.isArray(content?.correctOrder) && content.correctOrder.length > 0) {
      return content.correctOrder;
    }
    if (Array.isArray(correctAnswer?.orderedIds) && correctAnswer.orderedIds.length > 0) {
      return correctAnswer.orderedIds;
    }
    if (correctAnswer?.order && typeof correctAnswer.order === 'object') {
      return Object.entries(correctAnswer.order)
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .map(([id]) => id);
    }
    return rawItems.map((i) => i.id);
  }, [content?.correctOrder, correctAnswer, rawItems]);

  // Initial shuffled bank (stable across re-renders for same question)
  const shuffledBank: OrderingItem[] = useMemo(() => {
    if (Array.isArray(content?.shuffledBank) && content.shuffledBank.length > 0) {
      return content.shuffledBank.map((it: any, idx: number) => ({
        id: typeof it === 'string' ? `s${idx + 1}` : String(it.id || `s${idx + 1}`),
        text: typeof it === 'string' ? it : String(it.text || ''),
      }));
    }
    return fisherYatesShuffle(rawItems);
  }, [content?.shuffledBank, rawItems]);

  // Ordered IDs in the top Build Area
  const orderedIds: string[] = useMemo(() => {
    if (Array.isArray(answer?.orderedIds)) {
      return answer.orderedIds;
    }
    if (answer?.order && typeof answer.order === 'object') {
      return Object.entries(answer.order)
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .map(([id]) => id);
    }
    return [];
  }, [answer?.orderedIds, answer?.order]);

  // Bank items (unplaced items in the bottom basket)
  const bankItems = useMemo(() => {
    return shuffledBank.filter((item) => !orderedIds.includes(item.id));
  }, [shuffledBank, orderedIds]);

  // Training mode feedback states
  const [feedbackState, setFeedbackState] = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [shakeItemId, setShakeItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Helper map ID -> text
  const getItemText = (id: string): string => {
    const found = rawItems.find((i) => i.id === id) || shuffledBank.find((i) => i.id === id);
    return found ? found.text : id;
  };

  const mapToOrderRecord = (ids: string[]): Record<string, number> => {
    return ids.reduce((acc, id, idx) => ({ ...acc, [id]: idx }), {});
  };

  // Handle clicking an item in the bottom bank
  const handleBankItemClick = (item: OrderingItem) => {
    if (isReadonly) return;

    if (isTraining) {
      const expectedNextId = correctOrder[orderedIds.length];

      if (item.id === expectedNextId) {
        // Correct next item!
        setFeedbackState({ [item.id]: 'correct' });
        playFeedbackSound('correct');

        setTimeout(() => {
          const nextOrdered = [...orderedIds, item.id];
          onChange({
            orderedIds: nextOrdered,
            order: mapToOrderRecord(nextOrdered),
          });
          setFeedbackState({});

          if (nextOrdered.length === correctOrder.length) {
            setIsCompleted(true);
            playFeedbackSound('correct');
          }
        }, 220);
      } else {
        // Incorrect item!
        setFeedbackState({ [item.id]: 'incorrect' });
        setShakeItemId(item.id);
        setErrorMessage('❌ ترتيب غير صحيح، حاول مرة أخرى!');
        playFeedbackSound('incorrect');

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([100, 50, 100, 50, 200]);
          } catch {
            // Ignore
          }
        }

        setTimeout(() => {
          setFeedbackState({});
          setShakeItemId(null);
          setErrorMessage(null);
        }, 800);
      }
    } else {
      // Simulator / Exam mode: no instant sound/color feedback
      const nextOrdered = [...orderedIds, item.id];
      onChange({
        orderedIds: nextOrdered,
        order: mapToOrderRecord(nextOrdered),
      });
    }
  };

  // Move item up/down in top build area
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isReadonly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedIds.length) return;

    const nextOrdered = [...orderedIds];
    const temp = nextOrdered[index];
    nextOrdered[index] = nextOrdered[targetIndex];
    nextOrdered[targetIndex] = temp;

    setIsCompleted(false);
    onChange({
      orderedIds: nextOrdered,
      order: mapToOrderRecord(nextOrdered),
    });
  };

  // Remove item from top build area and return to bank
  const removeItem = (id: string) => {
    if (isReadonly) return;
    const nextOrdered = orderedIds.filter((item) => item !== id);
    setIsCompleted(false);
    onChange({
      orderedIds: nextOrdered,
      order: mapToOrderRecord(nextOrdered),
    });
  };

  // Reset all
  const resetOrder = () => {
    if (isReadonly) return;
    setIsCompleted(false);
    onChange({
      orderedIds: [],
      order: {},
    });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Prompt / Instructions */}
      <div className="text-sm text-slate-600 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        {content?.prompt || 'رتب الأحداث أو العناصر التالية في التسلسل الصحيح:'}
      </div>

      {/* Error / Success Feedback Banner for Training Mode */}
      {isTraining && errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2 animate-bounce">
          <Bell className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isTraining && isCompleted && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-black rounded-xl flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>أحسنت! أتممت الترتيب التسلسلي الصحيح بنجاح 🎉</span>
        </div>
      )}

      {/* TOP BUILD AREA (المنطقة العلوية للترتيب) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>الترتيب الحالي (من الأعلى إلى الأسفل):</span>
          {!isReadonly && orderedIds.length > 0 && (
            <button
              type="button"
              onClick={resetOrder}
              className="text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة الضبط</span>
            </button>
          )}
        </div>

        {orderedIds.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-2xl min-h-[120px] flex items-center justify-center p-6 text-slate-400 font-medium text-center bg-slate-50/50 text-sm">
            اضغط على الأحداث من السلة السفلية للبدء بالترتيب الصحيح...
          </div>
        ) : (
          <div className="space-y-2.5">
            {orderedIds.map((id, idx) => (
              <div
                key={id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  !isTraining
                    ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-800 font-medium shadow-xs'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center shrink-0 text-sm ${
                    !isTraining
                      ? 'bg-indigo-200 text-indigo-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {idx + 1}
                </span>

                <span className="flex-1 text-base font-medium">{getItemText(id)}</span>

                {!isReadonly && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="تحريك لأعلى"
                      aria-label={`تحريك ${getItemText(id)} لأعلى`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === orderedIds.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                      title="تحريك لأسفل"
                      aria-label={`تحريك ${getItemText(id)} لأسفل`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(id)}
                      className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                      title="إعادة للسلة"
                      aria-label={`إلغاء ${getItemText(id)} وإعادته للسلة`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM BANK (السلة السفلية المبعثرة) */}
      {!isReadonly && bankItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-700">
            سلة الأحداث المتاحة (اضغط لاختيار الحدث التالي):
          </div>

          <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[80px]">
            {bankItems.map((item) => {
              const status = feedbackState[item.id];
              const isShaking = shakeItemId === item.id;

              let btnClasses =
                'p-3 rounded-xl border text-sm font-medium shadow-2xs hover:border-emerald-400 transition-all cursor-pointer select-none flex items-center gap-2 ';

              if (status === 'correct') {
                btnClasses += 'bg-emerald-500 text-white border-emerald-600';
              } else if (status === 'incorrect') {
                btnClasses += 'bg-red-500 text-white border-red-600';
              } else {
                btnClasses += 'bg-white border-slate-200 text-slate-800 hover:bg-emerald-50/50';
              }

              if (isShaking) {
                btnClasses += ' animate-shake';
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleBankItemClick(item)}
                  className={btnClasses}
                  aria-label={`اختيار ${item.text}`}
                >
                  <span>{item.text}</span>
                  {status === 'correct' && <Check className="w-4 h-4 shrink-0" />}
                  {status === 'incorrect' && <Bell className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Readonly Review mode showing correct sequence comparison */}
      {isReadonly && (
        <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>الترتيب النموذجي الصحيح:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 font-medium">
            {correctOrder.map((id) => (
              <li key={id}>{getItemText(id)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

