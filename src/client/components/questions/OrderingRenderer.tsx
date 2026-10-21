import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface OrderingProps {
  content: {
    prompt: string;
    items: Array<{ id: string; text: string }>;
  };
  answer?: {
    orderedIds?: string[];
  };
  onChange: (ans: { orderedIds: string[] }) => void;
  isReadonly?: boolean;
}

export const OrderingRenderer: React.FC<OrderingProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  // Initial order from answer or content
  const currentOrder =
    answer?.orderedIds && answer.orderedIds.length === content.items.length
      ? answer.orderedIds
      : content.items.map((i) => i.id);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isReadonly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const newOrder = [...currentOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    onChange({ orderedIds: newOrder });
  };

  const getItemText = (id: string) => content.items.find((i) => i.id === id)?.text || id;

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500 font-medium">
        رتب العناصر التالية تصاعدياً / تسلسلياً باستخدام الأسهم (من الأعلى إلى الأسفل):
      </div>

      <div className="space-y-2.5">
        {currentOrder.map((id, idx) => (
          <div
            key={id}
            className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs transition-all hover:border-slate-300"
          >
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
              {idx + 1}
            </span>

            <span className="flex-1 text-slate-800 font-medium text-base">
              {getItemText(id)}
            </span>

            {!isReadonly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                  title="تحريك لأعلى"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === currentOrder.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-slate-600"
                  title="تحريك لأسفل"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
