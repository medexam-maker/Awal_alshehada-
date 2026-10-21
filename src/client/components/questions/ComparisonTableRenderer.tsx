import React from 'react';

interface ComparisonTableProps {
  content: {
    prompt: string;
    headers: string[]; // e.g. ['وجه المقارنة', 'الخلية النباتية', 'الخلية الحيوانية']
    rows: Array<{
      criteria: string;
      prefilled?: Record<string, string>;
    }>;
  };
  answer?: {
    cells?: Record<string, string>; // key: `${rowIndex}_${colIndex}`
  };
  onChange: (ans: { cells: Record<string, string> }) => void;
  isReadonly?: boolean;
}

export const ComparisonTableRenderer: React.FC<ComparisonTableProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const cells = answer?.cells || {};

  const handleCellChange = (key: string, val: string) => {
    if (isReadonly) return;
    onChange({
      cells: {
        ...cells,
        [key]: val,
      },
    });
  };

  const headers = content.headers || ['وجه المقارنة', 'الطرف الأول', 'الطرف الثاني'];

  return (
    <div className="space-y-4 overflow-x-auto">
      <table className="w-full border-collapse border border-slate-300 rounded-xl overflow-hidden bg-white text-sm md:text-base">
        <thead>
          <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
            {headers.map((h, i) => (
              <th key={i} className="p-3 text-right font-bold border-l border-slate-300 last:border-l-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.rows.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
              <td className="p-3 font-semibold text-slate-900 bg-slate-50 border-l border-slate-200 w-1/3">
                {row.criteria}
              </td>
              {headers.slice(1).map((_, cIdx) => {
                const cellKey = `${rIdx}_${cIdx + 1}`;
                const prefilled = row.prefilled?.[String(cIdx + 1)];

                return (
                  <td key={cIdx} className="p-2 border-l border-slate-200 last:border-l-0">
                    {prefilled ? (
                      <span className="p-2 block text-slate-600 bg-slate-100 rounded-lg text-xs font-medium">
                        {prefilled}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={cells[cellKey] || ''}
                        onChange={(e) => handleCellChange(cellKey, e.target.value)}
                        disabled={isReadonly}
                        placeholder="أدخل الإجابة..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
