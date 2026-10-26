import React from 'react';

export interface DiagramLabelingRendererProps {
  content?: {
    imageUrl?: string;
    labels?: Array<{ id: string; targetText: string }>;
  };
  answer?: any;
  onChange: (ans: any) => void;
  isReadonly?: boolean;
}

export const DiagramLabelingRenderer: React.FC<DiagramLabelingRendererProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
}) => {
  const labels = content?.labels || [];
  const currentLabels: Record<string, string> = answer?.labels || {};

  const handleChange = (id: string, val: string) => {
    if (isReadonly) return;
    onChange({
      labels: {
        ...currentLabels,
        [id]: val,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto" dir="rtl">
      {content?.imageUrl && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center p-4">
          <img src={content.imageUrl} alt="Diagram" className="max-h-64 object-contain rounded-xl" />
        </div>
      )}
      <div className="space-y-2.5">
        {labels.map((lbl, idx) => (
          <div key={lbl.id || idx} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <input
              type="text"
              disabled={isReadonly}
              value={currentLabels[lbl.id] || ''}
              onChange={(e) => handleChange(lbl.id, e.target.value)}
              placeholder={`تسمية الجزء رقم (${idx + 1})...`}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContourMapRenderer: React.FC<any> = DiagramLabelingRenderer;

export const CalculationRenderer: React.FC<any> = ({ answer, onChange, isReadonly }) => {
  const steps = answer?.steps || '';
  const finalVal = answer?.finalVal || '';

  return (
    <div className="space-y-3 max-w-xl mx-auto" dir="rtl">
      <div>
        <label className="text-xs font-bold text-slate-600 block mb-1">خطوات الحل الرياضي / الفيزيائي:</label>
        <textarea
          disabled={isReadonly}
          value={steps}
          onChange={(e) => !isReadonly && onChange({ steps: e.target.value, finalVal })}
          rows={4}
          placeholder="اكتب القوانين والتعويض بالتفصيل..."
          className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-600 block mb-1">الناتج النهائي (مع وحدة القياس):</label>
        <input
          type="text"
          disabled={isReadonly}
          value={finalVal}
          onChange={(e) => !isReadonly && onChange({ steps, finalVal: e.target.value })}
          placeholder="مثال: 25 m/s"
          className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
        />
      </div>
    </div>
  );
};

export const GrammarRenderer: React.FC<any> = ({ content, answer, onChange, isReadonly }) => {
  const text = answer?.text || '';
  return (
    <div className="space-y-3" dir="rtl">
      {content?.sentence && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-center text-lg font-bold text-slate-900 leading-loose">
          {content.sentence}
        </div>
      )}
      <textarea
        disabled={isReadonly}
        value={text}
        onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
        rows={4}
        placeholder="اكتب الإعراب والتشكيل بالتفصيل..."
        className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
      />
    </div>
  );
};

export const ReadingComprehensionRenderer: React.FC<any> = ({ content, answer, onChange, isReadonly }) => {
  const text = answer?.text || '';
  return (
    <div className="space-y-4" dir="rtl">
      {content?.passage && (
        <div className="p-4 bg-slate-100 rounded-xl text-sm text-slate-800 leading-relaxed max-h-48 overflow-y-auto border border-slate-200">
          {content.passage}
        </div>
      )}
      <textarea
        disabled={isReadonly}
        value={text}
        onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
        rows={5}
        placeholder="أجب عن الأسئلة والاستيعاب القرائي..."
        className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
      />
    </div>
  );
};
