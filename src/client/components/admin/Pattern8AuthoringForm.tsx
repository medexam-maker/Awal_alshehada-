import React, { useState } from 'react';
import { PlusCircle, Trash2, CheckCircle2, Copy, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { MathView } from '../common/MathView';

export interface Pattern8FormFields {
  question_text: string;
  model_answer: string;
  mandatory_keywords: string[];
  hint: string;
  max_words: number;
  max_score: number;
  grading_mode: 'auto' | 'manual' | 'hybrid';
  partial_threshold: number;
}

export interface Pattern8AuthoringFormProps {
  initialValues?: Partial<Pattern8FormFields>;
  onChange: (data: Pattern8FormFields) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const Pattern8AuthoringForm: React.FC<Pattern8AuthoringFormProps> = ({
  initialValues,
  onChange,
  onSave,
  isSaving = false,
}) => {
  const [questionText, setQuestionText] = useState(
    initialValues?.question_text ||
      'اذكر باختصار الفائدتان الأساسيتان من إنشاء خطوط الدفاع الخلفية (الاحتياطية) في التكتيكات العسكرية؟'
  );
  const [modelAnswer, setModelAnswer] = useState(
    initialValues?.model_answer ||
      '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات عند حدوث انهيار في الخطوط الأمامية.'
  );
  const [hint, setHint] = useState(
    initialValues?.hint || 'فكر في دور القوات غير المشاركة مباشرة في الاشتباك الأمامي، وكيف تؤمن الخلفية والتموين.'
  );
  const [maxWords, setMaxWords] = useState<number>(initialValues?.max_words || 30);
  const [maxScore, setMaxScore] = useState<number>(initialValues?.max_score || 2);
  const [gradingMode, setGradingMode] = useState<'auto' | 'manual' | 'hybrid'>(
    initialValues?.grading_mode || 'auto'
  );
  const [partialThreshold, setPartialThreshold] = useState<number>(
    initialValues?.partial_threshold ?? 0.5
  );

  // Mandatory keywords list
  const [keywords, setKeywords] = useState<string[]>(
    initialValues?.mandatory_keywords && initialValues.mandatory_keywords.length > 0
      ? initialValues.mandatory_keywords
      : ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات']
  );
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Sync state upward
  const notifyChange = (updated: Partial<Pattern8FormFields>) => {
    const payload: Pattern8FormFields = {
      question_text: updated.question_text ?? questionText,
      model_answer: updated.model_answer ?? modelAnswer,
      mandatory_keywords: updated.mandatory_keywords ?? keywords,
      hint: updated.hint ?? hint,
      max_words: updated.max_words ?? maxWords,
      max_score: updated.max_score ?? maxScore,
      grading_mode: updated.grading_mode ?? gradingMode,
      partial_threshold: updated.partial_threshold ?? partialThreshold,
    };
    onChange(payload);
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      const updated = [...keywords, trimmed];
      setKeywords(updated);
      setNewKeyword('');
      notifyChange({ mandatory_keywords: updated });
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const updated = keywords.filter((_, i) => i !== index);
    setKeywords(updated);
    notifyChange({ mandatory_keywords: updated });
  };

  // Dynamic Template Copy (Copies ONLY manual fields)
  const handleCopyTemplate = () => {
    const templateObject = {
      question_text: questionText,
      model_answer: modelAnswer,
      mandatory_keywords: keywords,
      hint: hint,
      max_words: maxWords,
    };
    const jsonStr = JSON.stringify(templateObject, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm" dir="rtl">
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl font-black text-sm">
            النمط 8
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              نموذج إدخال سؤال مقالي قصير (Short Structured Essay)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              مطابقة كلمات مفتاحية موثقة نقية بدون AI متوافقة مع جميع العقود المعمارية
            </p>
          </div>
        </div>

        {/* Dynamic Copy Template Button */}
        <button
          type="button"
          onClick={handleCopyTemplate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
        >
          {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copySuccess ? 'تم نسخ القالب!' : 'نسخ قالب الإدخال (JSON)'}</span>
        </button>
      </div>

      {/* Manual Input Fields */}
      <div className="space-y-4">
        {/* Question Text */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-800 block">
            نص السؤال المقالي (Question Text): <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value);
              notifyChange({ question_text: e.target.value });
            }}
            rows={3}
            placeholder="اكتب نص السؤال هنا (يدعم صيغ LaTeX الرياضية)..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
          />
        </div>

        {/* Model Answer */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-800 block">
            الإجابة النموذجية المعتمدة (Model Answer): <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={modelAnswer}
            onChange={(e) => {
              setModelAnswer(e.target.value);
              notifyChange({ model_answer: e.target.value });
            }}
            rows={3}
            placeholder="اكتب الإجابة النموذجية الكاملة المتوقعة..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
          />
        </div>

        {/* Mandatory Keywords Tag Input */}
        <div className="space-y-2 p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
          <label className="text-xs font-black text-amber-950 block">
            الكلمات والمفاهيم المفتاحية الإلزامية (Mandatory Keywords): <span className="text-rose-500">*</span>
          </label>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            أدخل الكلمات أو العبارات المركبة الإلزامية (مثل: "تأمين الإمداد"، "قوة احتياطية"). يُشترط وجود كلمة واحدة على الأقل.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
              placeholder="اكتب مفهومًا مفتاحيًا واضغط إضافة..."
              className="flex-1 p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>

          {/* Keywords Tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {keywords.map((kw, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-950 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-2xs"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(idx)}
                  className="text-amber-700 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Hint and Max Words */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">التلميح المنهجي (Hint - اختياري):</label>
            <input
              type="text"
              value={hint}
              onChange={(e) => {
                setHint(e.target.value);
                notifyChange({ hint: e.target.value });
              }}
              placeholder="تلميح يظهر للطالب عند الطلب في وضع التدريب..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">الحد الأقصى للكلمات الموصى به:</label>
            <input
              type="number"
              value={maxWords}
              onChange={(e) => {
                const val = Number(e.target.value) || 30;
                setMaxWords(val);
                notifyChange({ max_words: val });
              }}
              min={5}
              max={200}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Configuration Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">درجة السؤال (Max Score):</label>
            <select
              value={maxScore}
              onChange={(e) => {
                const val = Number(e.target.value) || 2;
                setMaxScore(val);
                notifyChange({ max_score: val });
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value={1}>درجة واحدة (1)</option>
              <option value={2}>درجتان (2)</option>
              <option value={3}>3 درجات</option>
              <option value={5}>5 درجات</option>
              <option value={10}>10 درجات</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">نمط التصحيح (Grading Mode):</label>
            <select
              value={gradingMode}
              onChange={(e) => {
                const val = e.target.value as 'auto' | 'manual' | 'hybrid';
                setGradingMode(val);
                notifyChange({ grading_mode: val });
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value="auto">آلي بالمفاهيم المفتاحية (Auto)</option>
              <option value="hybrid">مزدوج (آلي + معلم - Hybrid)</option>
              <option value="manual">مراجعة معلم بشرية (Manual)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">عتبة الاستحقاق الجزئي (Partial Threshold):</label>
            <select
              value={partialThreshold}
              onChange={(e) => {
                const val = Number(e.target.value) || 0.5;
                setPartialThreshold(val);
                notifyChange({ partial_threshold: val });
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              <option value={0.33}>33% من الكلمات (0.33)</option>
              <option value={0.5}>50% من الكلمات (0.50 - الافتراضي)</option>
              <option value={0.75}>75% من الكلمات (0.75)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
        <div className="text-xs font-bold text-slate-700">معاينة نص السؤال والكلمات المفتاحية:</div>
        <div className="text-sm font-bold text-slate-900">
          <MathView text={questionText} />
        </div>
      </div>

      {/* Save Button */}
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || keywords.length === 0}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ وسجل السؤال بنجاح'}</span>
        </button>
      )}
    </div>
  );
};

export default Pattern8AuthoringForm;
