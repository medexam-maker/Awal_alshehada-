import React from 'react';
import { Ban } from 'lucide-react';

interface OddOneOutProps {
  content: {
    prompt: string;
    items: string[];
    requireReason?: boolean;
  };
  answer?: {
    selectedItem?: string;
    reason?: string;
  };
  onChange: (ans: { selectedItem: string; reason?: string }) => void;
  isReadonly?: boolean;
}

export const OddOneOutRenderer: React.FC<OddOneOutProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const selectedItem = answer?.selectedItem;
  const reason = answer?.reason || '';

  const handleSelect = (item: string) => {
    if (isReadonly) return;
    onChange({
      selectedItem: item,
      reason,
    });
  };

  const handleReasonChange = (val: string) => {
    if (isReadonly || !selectedItem) return;
    onChange({
      selectedItem,
      reason: val,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500 font-medium">
        اختر الكلمة أو المصطلح الشاذ (الذي لا ينتمي إلى المجموعة):
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {content?.items?.map((item, idx) => {
          const isSelected = selectedItem === item;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              disabled={isReadonly}
              className={`p-4 rounded-xl border-2 text-center font-bold text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isSelected
                  ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <Ban className={`w-5 h-5 ${isSelected ? 'text-rose-600' : 'text-slate-300'}`} />
              <span>{item}</span>
            </button>
          );
        })}
      </div>

      {content.requireReason && (
        <div className="space-y-2 pt-2">
          <label className="text-sm font-bold text-slate-700 block">
            سبب الاختيار (الرابط المشترك بين باقي العناصر):
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            disabled={isReadonly}
            placeholder="علل اختيارك..."
            className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      )}
    </div>
  );
};
