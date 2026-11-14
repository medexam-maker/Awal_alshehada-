import React, { useEffect, useState } from 'react';
import { Check, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import {
  OddOneOutFormState,
  BuildOddOneOutResult,
  emptyOddOneOutForm,
  loadOddOneOutForm,
  buildOddOneOutQuestion,
} from '../../lib/oddOneOutAuthoring';

interface OddOneOutAuthoringFormProps {
  prompt: string;
  initialQuestion?: {
    id?: string;
    prompt?: string;
    content?: any;
    correctAnswer?: any;
  } | null;
  onChange: (result: BuildOddOneOutResult) => void;
}

export const OddOneOutAuthoringForm: React.FC<OddOneOutAuthoringFormProps> = ({
  prompt,
  initialQuestion,
  onChange,
}) => {
  const [form, setForm] = useState<OddOneOutFormState>(() =>
    initialQuestion ? loadOddOneOutForm(initialQuestion) : emptyOddOneOutForm(prompt)
  );

  // Reload form when switching between editing questions or resetting
  useEffect(() => {
    if (initialQuestion) {
      setForm(loadOddOneOutForm(initialQuestion));
    } else {
      setForm(emptyOddOneOutForm(prompt));
    }
  }, [initialQuestion?.id]);

  // Keep prompt synced from parent form
  useEffect(() => {
    setForm((prev) => {
      if (prev.prompt === prompt) return prev;
      return { ...prev, prompt };
    });
  }, [prompt]);

  // Notify parent on any change
  useEffect(() => {
    onChange(buildOddOneOutQuestion(form));
  }, [form]);

  const updateForm = (patch: Partial<OddOneOutFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleItemTextChange = (idx: number, val: string) => {
    setForm((prev) => {
      const nextItems = prev.items.map((it, i) => (i === idx ? { ...it, text: val } : it));
      return { ...prev, items: nextItems };
    });
  };

  const handleToggleOddItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedItemIds: [itemId],
    }));
  };

  const handleAddItem = () => {
    setForm((prev) => {
      const nextNum = prev.items.length + 1;
      return {
        ...prev,
        items: [...prev.items, { id: `i${nextNum}_${Date.now().toString(36).slice(-3)}`, text: '' }],
      };
    });
  };

  const handleRemoveItem = (idx: number) => {
    setForm((prev) => {
      if (prev.items.length <= 2) return prev;
      const removed = prev.items[idx];
      const nextItems = prev.items.filter((_, i) => i !== idx);
      const nextSelected = prev.selectedItemIds.filter((id) => id !== removed.id);
      return {
        ...prev,
        items: nextItems,
        selectedItemIds: nextSelected,
      };
    });
  };

  const previewValidation = buildOddOneOutQuestion(form);
  const marksPercent = Math.round((form.marksFraction ?? 0.5) * 100);

  return (
    <div className="space-y-5 bg-white p-4 rounded-2xl border border-emerald-200" dir="rtl">
      {/* Items List & Odd Item Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-800">
            العناصر والكلمات (اختر الكلمة الشاذة بالضغط على الدائرة بجانبها):
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ إضافة عنصر</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {form.items.map((item, idx) => {
            const isOdd = form.selectedItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  isOdd ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleOddItem(item.id)}
                  title="تعيين ككلمة شاذة صحيحة"
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                    isOdd
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-transparent hover:border-emerald-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => handleItemTextChange(idx, e.target.value)}
                  placeholder={`العنصر ${idx + 1}`}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {form.items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="حذف العنصر"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reasoning Toggle */}
      <div className="pt-3 border-t border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-800">
            <input
              type="checkbox"
              checked={form.hasReasoning}
              onChange={(e) => updateForm({ hasReasoning: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>تضمين المرحلة الثانية: تعليل اختيار الكلمة الشاذة</span>
          </label>

          {form.hasReasoning && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">نسبة درجة التعليل:</label>
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={marksPercent}
                onChange={(e) => {
                  const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  updateForm({ marksFraction: pct / 100 });
                }}
                className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center"
              />
              <span className="text-xs font-bold text-slate-600">%</span>
            </div>
          )}
        </div>

        {form.hasReasoning && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                نص طلب التعليل:
              </label>
              <input
                type="text"
                value={form.reasoningPrompt}
                onChange={(e) => updateForm({ reasoningPrompt: e.target.value })}
                placeholder="علل سبب استبعادك لهذه الكلمة:"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-emerald-900 block">
                السبب الصحيح <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.referenceReason}
                onChange={(e) => updateForm({ referenceReason: e.target.value })}
                placeholder="اكتب السبب الصحيح في جملة واحدة واضحة (يظهر للطالب في المحاكاة الأسبوعية لتقييم إجابته)..."
                className="w-full bg-white border-2 border-emerald-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700">
                  مشتتات وضع التدريب (اختياري):
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  عند ملء المشتتين تتولد خيارات التدريب (3 خيارات) تلقائياً؛ وعند تركهما فارغين يصبح السؤال للمحاكاة فقط.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">مشتت 1 (اختياري)</label>
                  <input
                    type="text"
                    value={form.distractor1}
                    onChange={(e) => updateForm({ distractor1: e.target.value })}
                    placeholder="اكتب خياراً خاطئاً مقنعاً للتدريب..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">مشتت 2 (اختياري)</label>
                  <input
                    type="text"
                    value={form.distractor2}
                    onChange={(e) => updateForm({ distractor2: e.target.value })}
                    placeholder="اكتب خياراً خاطئاً ثانياً للتدريب..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inline Validation Notice */}
      {!previewValidation.ok && previewValidation.errors.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900 font-bold">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {previewValidation.errors.map((err, idx) => (
              <div key={idx}>{err}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
