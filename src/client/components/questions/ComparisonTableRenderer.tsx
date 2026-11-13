import React, { useEffect, useState } from 'react';
import { Check, X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';
import { playWaterDrop } from '../../utils/soundEffects';

interface ComparisonTableOption {
  id: string;
  text: string;
}

interface ComparisonTableCell {
  id: string;
  value: string | null;
  correctValue?: string;
  options?: Array<string | ComparisonTableOption>;
}

interface ComparisonTableRow {
  id: string;
  label?: string;
  criteria?: string;
  cells?: ComparisonTableCell[];
  prefilled?: Record<string, string>;
}

interface ComparisonTableProps {
  content: {
    prompt?: string;
    tableHeaders?: string[];
    headers?: string[];
    rows: ComparisonTableRow[];
  };
  answer?: {
    cells?: Record<string, string>;
  };
  onChange: (ans: { cells: Record<string, string> }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

export const ComparisonTableRenderer: React.FC<ComparisonTableProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const isTraining = examMode === 'training';
  const cellsAnswer = answer?.cells || {};

  // Active inline dropdown cell key (anchored directly below the clicked button)
  const [openCellKey, setOpenCellKey] = useState<string | null>(null);

  useEffect(() => {
    if (!openCellKey) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-comparison-dropdown]')) return;
      setOpenCellKey(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCellKey(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openCellKey]);

  const headers = content?.tableHeaders || content?.headers || [];
  const rows = content?.rows || [];

  // Correct answers map for training mode only
  const correctMap: Record<string, string> = isTraining ? (correctAnswer?.cells || {}) : {};

  // Count total interactive cells and answered cells
  let totalInteractive = 0;
  let answeredCount = 0;

  rows.forEach((row) => {
    (row.cells || []).forEach((c) => {
      if (c.value === null) {
        totalInteractive++;
        if (cellsAnswer[c.id]) {
          answeredCount++;
        }
      }
    });
  });

  const handleSelectOption = (cellId: string, optionId: string) => {
    if (isReadonly) return;
    const nextCells = { ...cellsAnswer, [cellId]: optionId };
    onChange({ cells: nextCells });

    const expected = correctMap[cellId];
    if (isTraining && expected) {
      playFeedbackSound(optionId === expected ? 'correct' : 'incorrect');
    } else {
      playWaterDrop();
    }

    setOpenCellKey(null);
  };

  const normalizeOptions = (opts?: Array<string | ComparisonTableOption>): ComparisonTableOption[] => {
    if (!Array.isArray(opts)) return [];
    return opts.map((o) => {
      if (typeof o === 'object' && o !== null && 'id' in o) {
        return { id: String(o.id), text: String(o.text) };
      }
      const s = String(o);
      return { id: s, text: s };
    });
  };

  return (
    <div className="space-y-6 dir-rtl text-right font-sans" dir="rtl">
      {/* Progress Counter */}
      {totalInteractive > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>اكتمال الجدول: {answeredCount} من {totalInteractive} خلايا</span>
          </div>
          <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalInteractive) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Mobile-First Card View of Comparison Rows */}
      <div className="space-y-4">
        {rows.map((row, rIdx) => {
          const rowKey = String(row.id || rIdx);
          const rowLabel = row.label || row.criteria || `المعيار ${rIdx + 1}`;
          const rowCells = row.cells || [];
          const rowHasOpenDropdown = Boolean(openCellKey && openCellKey.startsWith(`${rowKey}::`));

          return (
            <div
              key={rowKey}
              className={`relative p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 ${
                rowHasOpenDropdown ? 'z-30' : 'z-0'
              }`}
            >
              <div className="font-bold text-slate-900 text-sm md:text-base border-b border-slate-100 pb-2">
                {rowLabel}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rowCells.map((cell, cIdx) => {
                  const headerTitle = headers[cIdx] || `الطرف ${cIdx + 1}`;
                  const isPrefilled = cell.value !== null && cell.value !== undefined;
                  const currentSelectedId = cellsAnswer[cell.id];
                  const options = normalizeOptions(cell.options);
                  const selectedOption = options.find((o) => o.id === currentSelectedId);

                  if (isPrefilled) {
                    return (
                      <div
                        key={cell.id || cIdx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1"
                      >
                        <span className="text-xs font-semibold text-slate-500 block">
                          {headerTitle}
                        </span>
                        <div className="text-sm font-bold text-slate-800">
                          {String(cell.value)}
                        </div>
                      </div>
                    );
                  }

                  // Interactive Cell Dropdown Trigger + Inline Menu
                  const cellKey = `${rowKey}::${cell.id || cIdx}`;
                  const isOpen = openCellKey === cellKey;
                  const expectedOptionId = correctMap[cell.id];
                  const isAnswered = Boolean(currentSelectedId);
                  const isCorrect = isTraining && isAnswered && Boolean(expectedOptionId) && currentSelectedId === expectedOptionId;
                  const isIncorrect = isTraining && isAnswered && Boolean(expectedOptionId) && currentSelectedId !== expectedOptionId;

                  let cellBtnClass = isOpen
                    ? 'bg-white border-emerald-500 text-slate-800 ring-2 ring-emerald-500/15'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300';
                  let statusIcon: React.ReactNode = null;

                  if (isTraining && isAnswered) {
                    if (isCorrect) {
                      cellBtnClass = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                      statusIcon = <Check className="w-4 h-4 text-emerald-700 stroke-[3] shrink-0" />;
                    } else if (isIncorrect) {
                      cellBtnClass = 'bg-rose-50 border-rose-500 text-rose-950 font-bold';
                      statusIcon = <X className="w-4 h-4 text-rose-700 stroke-[3] shrink-0" />;
                    }
                  } else if (isAnswered) {
                    // Simulator selected (neutral highlight without revealing correctness)
                    cellBtnClass = 'bg-emerald-50/60 border-emerald-500 text-emerald-950 font-bold';
                  }

                  return (
                    <div key={cell.id || cIdx} className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 block">
                        {headerTitle}
                      </span>
                      <div className="relative" data-comparison-dropdown>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-haspopup="listbox"
                          onClick={() => {
                            if (isReadonly) return;
                            setOpenCellKey((prev) => (prev === cellKey ? null : cellKey));
                          }}
                          disabled={isReadonly}
                          className={`w-full px-3 py-2.5 rounded-xl border-2 text-right text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${cellBtnClass}`}
                        >
                          <span className="truncate">
                            {selectedOption ? selectedOption.text : 'اضغط لاختيار الإجابة...'}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {statusIcon}
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-150 ${
                                isOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                          </span>
                        </button>

                        {isOpen && (
                          <div
                            role="listbox"
                            className="absolute left-0 right-0 top-full mt-1.5 z-40 w-full bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/10 py-1 divide-y divide-slate-100 max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150 origin-top"
                            dir="rtl"
                          >
                            {options.map((opt) => {
                              const isSelected = currentSelectedId === opt.id;
                              const isOptCorrect = isTraining && expectedOptionId === opt.id;
                              const isOptWrong = isTraining && isSelected && expectedOptionId && expectedOptionId !== opt.id;

                              let optStyle = 'text-slate-700 hover:bg-slate-50';
                              let optIcon: React.ReactNode = null;

                              if (isSelected) {
                                if (isTraining && expectedOptionId) {
                                  if (isOptCorrect) {
                                    optStyle = 'bg-emerald-50 text-emerald-950 font-bold';
                                    optIcon = <Check className="w-4 h-4 text-emerald-700 stroke-[2.5] shrink-0" />;
                                  } else if (isOptWrong) {
                                    optStyle = 'bg-rose-50 text-rose-950 font-bold';
                                    optIcon = <X className="w-4 h-4 text-rose-700 stroke-[2.5] shrink-0" />;
                                  }
                                } else {
                                  optStyle = 'bg-emerald-50/70 text-emerald-950 font-semibold';
                                  optIcon = <Check className="w-4 h-4 text-emerald-600 stroke-[2.5] shrink-0" />;
                                }
                              }

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => handleSelectOption(cell.id, opt.id)}
                                  className={`w-full px-3 py-2.5 text-right text-sm leading-snug transition-colors cursor-pointer flex items-center justify-between gap-2 ${optStyle}`}
                                >
                                  <span className="break-words">{opt.text}</span>
                                  {optIcon}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
