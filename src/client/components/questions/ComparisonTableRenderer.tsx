import React, { useState } from 'react';
import { Check, X, ChevronDown, CheckCircle2 } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

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

  // Active bottom sheet modal state for cell option picking
  const [activeCellModal, setActiveCellModal] = useState<{
    rowLabel: string;
    header: string;
    cell: ComparisonTableCell;
  } | null>(null);

  const headers = content?.tableHeaders || content?.headers || [];
  const rows = content?.rows || [];

  // Correct answers map for training mode
  const correctMap: Record<string, string> = correctAnswer?.cells || {};

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

    if (isTraining) {
      const expected = correctMap[cellId];
      if (expected) {
        if (optionId === expected) {
          playFeedbackSound('correct');
        } else {
          playFeedbackSound('incorrect');
        }
      }
    }

    setActiveCellModal(null);
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
          const rowLabel = row.label || row.criteria || `المعيار ${rIdx + 1}`;
          const rowCells = row.cells || [];

          return (
            <div
              key={row.id || rIdx}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
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

                  // Interactive Cell Dropdown Button
                  const expectedOptionId = correctMap[cell.id];
                  const isAnswered = Boolean(currentSelectedId);
                  const isCorrect = isTraining && isAnswered && expectedOptionId && currentSelectedId === expectedOptionId;
                  const isIncorrect = isTraining && isAnswered && expectedOptionId && currentSelectedId !== expectedOptionId;

                  let cellBtnClass = 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300';
                  let feedbackIcon = <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />;

                  if (isTraining && isAnswered) {
                    if (isCorrect) {
                      cellBtnClass = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold';
                      feedbackIcon = <Check className="w-4 h-4 text-emerald-700 stroke-[3] shrink-0" />;
                    } else if (isIncorrect) {
                      cellBtnClass = 'bg-rose-50 border-rose-500 text-rose-950 font-bold';
                      feedbackIcon = <X className="w-4 h-4 text-rose-700 stroke-[3] shrink-0" />;
                    }
                  } else if (isAnswered) {
                    // Simulator selected
                    cellBtnClass = 'bg-emerald-50/60 border-emerald-500 text-emerald-950 font-bold';
                  }

                  return (
                    <div key={cell.id || cIdx} className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 block">
                        {headerTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          !isReadonly &&
                          setActiveCellModal({
                            rowLabel,
                            header: headerTitle,
                            cell,
                          })
                        }
                        disabled={isReadonly}
                        className={`w-full p-3 rounded-xl border-2 text-right text-sm transition-all flex items-center justify-between gap-2 cursor-pointer ${cellBtnClass}`}
                      >
                        <span className="truncate">
                          {selectedOption ? selectedOption.text : 'اضغط لاختيار الإجابة...'}
                        </span>
                        {feedbackIcon}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sheet / Modal for 3-Option Dropdown Selection */}
      {activeCellModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 max-h-[85vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold text-emerald-600 block">
                  {activeCellModal.rowLabel} — {activeCellModal.header}
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  اختر القيمة المطابقة للخلية:
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveCellModal(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Large Tap-Friendly Buttons */}
            <div className="grid grid-cols-1 gap-2.5">
              {normalizeOptions(activeCellModal.cell.options).map((opt) => {
                const isSelected = cellsAnswer[activeCellModal.cell.id] === opt.id;
                const isCorrect = isTraining && correctMap[activeCellModal.cell.id] === opt.id;

                let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-emerald-50/50 hover:border-emerald-300';
                if (isSelected) {
                  btnStyle = 'bg-emerald-100 border-emerald-600 text-emerald-950 font-bold ring-2 ring-emerald-500/20';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(activeCellModal.cell.id, opt.id)}
                    className={`p-4 rounded-2xl border-2 text-right text-sm md:text-base leading-relaxed transition-all cursor-pointer flex items-center justify-between gap-3 ${btnStyle}`}
                  >
                    <span>{opt.text}</span>
                    {isSelected && (
                      <Check className="w-5 h-5 text-emerald-700 stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveCellModal(null)}
              className="w-full py-2.5 text-center text-xs text-slate-500 font-bold hover:text-slate-700"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
