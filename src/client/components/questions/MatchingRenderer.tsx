import React, { useState } from 'react';
import { ArrowLeftRight, Check } from 'lucide-react';

interface MatchingProps {
  content: {
    prompt: string;
    columnA: Array<{ id: string; text: string }>;
    columnB: Array<{ id: string; text: string }>;
  };
  answer?: {
    pairs?: Array<{ leftId: string; rightId: string }>;
  };
  onChange: (ans: { pairs: Array<{ leftId: string; rightId: string }> }) => void;
  isReadonly?: boolean;
}

export const MatchingRenderer: React.FC<MatchingProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const pairs = answer?.pairs || [];

  const handleLeftClick = (id: string) => {
    if (isReadonly) return;
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightId: string) => {
    if (isReadonly || !selectedLeft) return;

    // Remove existing pair with this left or right
    const filtered = pairs.filter((p) => p.leftId !== selectedLeft && p.rightId !== rightId);
    const updated = [...filtered, { leftId: selectedLeft, rightId }];
    onChange({ pairs: updated });
    setSelectedLeft(null);
  };

  const removePair = (leftId: string) => {
    if (isReadonly) return;
    onChange({ pairs: pairs.filter((p) => p.leftId !== leftId) });
  };

  const getMatchedRight = (leftId: string) => {
    const p = pairs.find((item) => item.leftId === leftId);
    return p ? content.columnB.find((b) => b.id === p.rightId) : null;
  };

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500 font-medium">
        انقر على عنصر من القائمة (أ) ثم انقر على العنصر المناسب له من القائمة (ب) للمزاوجة بينهما:
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column A */}
        <div className="space-y-3">
          <div className="font-bold text-slate-700 bg-slate-100 p-2 rounded-lg text-center text-sm">
            القائمة (أ)
          </div>
          {content.columnA.map((item) => {
            const isSelected = selectedLeft === item.id;
            const matchedRight = getMatchedRight(item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleLeftClick(item.id)}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30'
                    : matchedRight
                    ? 'border-emerald-300 bg-white text-slate-900'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="font-medium">{item.text}</span>
                {matchedRight && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      removePair(item.id);
                    }}
                    className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>مرتبط</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Column B */}
        <div className="space-y-3">
          <div className="font-bold text-slate-700 bg-slate-100 p-2 rounded-lg text-center text-sm">
            القائمة (ب)
          </div>
          {content.columnB.map((item) => {
            const isPaired = pairs.some((p) => p.rightId === item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleRightClick(item.id)}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedLeft && !isPaired
                    ? 'border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100 text-slate-900 animate-pulse'
                    : isPaired
                    ? 'border-slate-200 bg-slate-50 text-slate-500'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="font-medium">{item.text}</span>
                {isPaired && <span className="text-xs text-slate-400">مختار</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
