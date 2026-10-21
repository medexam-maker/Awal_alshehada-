import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface DiagramLabelingProps {
  content: {
    prompt: string;
    diagramUrl?: string;
    labels: Array<{
      targetId: string;
      title: string;
    }>;
  };
  answer?: {
    assignedLabels?: Record<string, string>; // targetId -> labelValue
  };
  onChange: (ans: { assignedLabels: Record<string, string> }) => void;
  isReadonly?: boolean;
}

export const DiagramLabelingRenderer: React.FC<DiagramLabelingProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const assigned = answer?.assignedLabels || {};

  const handleLabelChange = (targetId: string, val: string) => {
    if (isReadonly) return;
    onChange({
      assignedLabels: {
        ...assigned,
        [targetId]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Diagram Area */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[220px]">
        {content.diagramUrl ? (
          <img
            src={content.diagramUrl}
            alt="رسم توضيحي للامتحان"
            className="max-h-80 object-contain rounded-xl shadow-xs"
          />
        ) : (
          <div className="text-center text-slate-400 py-10">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <span className="text-sm">رسم تخطيطي للمسألة (الأرقام مشار إليها في المخطط)</span>
          </div>
        )}
      </div>

      {/* Target Labels inputs */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-700">حدد البيانات المشار إليها بالأسهم/الأرقام:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {content.labels.map((lbl) => (
            <div key={lbl.targetId} className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                {lbl.targetId}
              </span>
              <span className="text-sm font-semibold text-slate-700 w-28 truncate">{lbl.title}:</span>
              <input
                type="text"
                value={assigned[lbl.targetId] || ''}
                onChange={(e) => handleLabelChange(lbl.targetId, e.target.value)}
                disabled={isReadonly}
                placeholder="اسم العضو أو البيان..."
                className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
