import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface LegacyDiagramLabelingProps {
  content: {
    prompt?: string;
    diagramUrl?: string;
    diagram?: { url?: string; assetId?: string };
    labels?: Array<{
      targetId?: string;
      id?: string;
      pointNumber?: number;
      title?: string;
      correctValue?: string;
      options?: string[];
    }>;
  };
  answer?: {
    assignedLabels?: Record<string, string>;
    labels?: Record<string, string>;
  };
  onChange: (ans: any) => void;
  isReadonly?: boolean;
}

export const LegacyDiagramLabelingRenderer: React.FC<LegacyDiagramLabelingProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const assigned = answer?.assignedLabels || answer?.labels || {};
  const labels = content.labels || [];
  const diagramUrl = content.diagramUrl || content.diagram?.url || (content.diagram?.assetId ? `/api/media/${content.diagram.assetId}` : undefined);

  const handleLabelChange = (targetId: string, val: string) => {
    if (isReadonly) return;
    onChange({
      assignedLabels: {
        ...assigned,
        [targetId]: val,
      },
      labels: {
        ...assigned,
        [targetId]: val,
      },
    });
  };

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* Diagram Area */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[220px]">
        {diagramUrl ? (
          <img
            src={diagramUrl}
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
          {labels.map((lbl, idx) => {
            const key = lbl.targetId || lbl.id || `lbl_${idx + 1}`;
            const title = lbl.title || (lbl.pointNumber ? `نقطة ${lbl.pointNumber}` : `بيان ${idx + 1}`);

            return (
              <div key={key} className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-sm">
                  {key}
                </span>
                <span className="text-sm font-semibold text-slate-700 w-28 truncate">{title}:</span>
                <input
                  type="text"
                  value={assigned[key] || ''}
                  onChange={(e) => handleLabelChange(key, e.target.value)}
                  disabled={isReadonly}
                  placeholder="اسم العضو أو البيان..."
                  className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
