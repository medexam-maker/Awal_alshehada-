import React, { useState, useEffect, useRef } from 'react';
import {
  Mountain,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Compass,
  Layers,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  checkContourBranch,
  EIGHT_DIRECTIONS,
  extractPolygonPoints,
  JEBEL_MARRA_CONTOUR_MAP_SVG_URL
} from '../../../shared/contourUtils';
import {
  playClick,
  playWaterDrop,
  playScratchpad,
  playBookmark,
  playSuccess,
  playPartial,
  playError
} from '../../utils/soundEffects';

export interface ContourSubQuestion {
  id: string;
  question: string;
  unit?: string;
  inputType?: 'numeric' | 'direction8' | 'mapOverlay' | 'text';
  numericTolerance?: number;
  overlayMatchThreshold?: number;
  explanation?: string;
  hint?: string;
  options?: string[];
}

export interface ContourMapProps {
  content: {
    prompt?: string;
    mapUrl?: string;
    mapCode?: string;
    subQuestions?: ContourSubQuestion[];
    questions?: any[]; // legacy fallback
  };
  answer?: {
    subAnswers?: Record<string, any>;
  };
  onChange: (ans: { subAnswers: Record<string, any> }) => void;
  isReadonly?: boolean;
  correctAnswer?: { subAnswers?: Record<string, any> } | Record<string, any>;
  examMode?: 'training' | 'simulator' | 'review';
  studentAnswers?: Record<string, any>;
  onAnswerChange?: (subQId: string, value: any) => void;
  autoSaveKey?: string;
  attemptId?: string;
}

export const ContourMapRenderer: React.FC<ContourMapProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
  studentAnswers,
  onAnswerChange,
  autoSaveKey,
}) => {
  // Normalize subQuestions from content or legacy questions
  const subQuestions: ContourSubQuestion[] = Array.isArray(content?.subQuestions)
    ? content.subQuestions
    : Array.isArray(content?.questions)
      ? content.questions.map((q: any, i: number) => ({
          id: q.id || `cm_${i + 1}`,
          question: q.question || q.text || `سؤال فرعي ${i + 1}`,
          unit: q.unit || '',
          inputType: 'text',
        }))
      : [];

  // Effective subAnswers
  const effectiveAnswers = studentAnswers || answer?.subAnswers || {};
  const [subAnswers, setSubAnswers] = useState<Record<string, any>>(effectiveAnswers);

  // Sync when prop answer changes
  useEffect(() => {
    if (studentAnswers) {
      setSubAnswers(studentAnswers);
    } else if (answer?.subAnswers) {
      setSubAnswers(answer.subAnswers);
    }
  }, [answer?.subAnswers, studentAnswers]);

  // Model answers map
  const rawCorrectSubAnswers =
    (correctAnswer as any)?.subAnswers ||
    (typeof correctAnswer === 'object' && correctAnswer !== null ? correctAnswer : {});

  // Training mode: instant verification state
  const [hasVerifiedTraining, setHasVerifiedTraining] = useState<boolean>(false);

  // Hints display state per sub-question
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  const toggleHint = (subQId: string) => {
    playBookmark();
    setOpenHints((prev) => ({
      ...prev,
      [subQId]: !prev[subQId],
    }));
  };

  // Active overlay branch if polygon drawing is used
  const overlayBranches = subQuestions.filter((sq) => sq.inputType === 'mapOverlay');
  const [activeOverlaySubQId, setActiveOverlaySubQId] = useState<string>(
    overlayBranches[0]?.id || ''
  );

  // Map image ref for coordinate translation
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Draft auto-save in simulator mode
  const saveDraft = (updated: Record<string, any>) => {
    if (autoSaveKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`contour_draft_${autoSaveKey}`, JSON.stringify(updated));
      } catch {
        // ignore quota issues
      }
    }
  };

  const handleSubChange = (id: string, val: any) => {
    if (isReadonly) return;
    playClick();
    const updated = {
      ...subAnswers,
      [id]: val,
    };
    setSubAnswers(updated);
    onChange({ subAnswers: updated });
    onAnswerChange?.(id, val);
    saveDraft(updated);
  };

  // Polygon click handler for mapOverlay
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadonly || examMode === 'review') return;
    if (!activeOverlaySubQId) return;

    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    playWaterDrop();

    // Calculate percentage coordinates (0 - 100)
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const currentPoly: [number, number][] =
      extractPolygonPoints(subAnswers[activeOverlaySubQId]) || [];

    const updatedPoly = [...currentPoly, [x, y] as [number, number]];
    handleSubChange(activeOverlaySubQId, { polygon: updatedPoly });
  };

  const handleClearPolygon = (subQId: string) => {
    if (isReadonly || examMode === 'review') return;
    playScratchpad();
    handleSubChange(subQId, { polygon: [] });
  };

  // Check branch correctness
  const evaluateBranch = (sq: ContourSubQuestion) => {
    const rawStudent = subAnswers[sq.id];
    const rawCorrect = rawCorrectSubAnswers[sq.id];
    return checkContourBranch(rawStudent, rawCorrect, sq);
  };

  // Instant Verification with Audio Feedback
  const handleVerifyTraining = () => {
    setHasVerifiedTraining(true);
    let correctCount = 0;
    subQuestions.forEach((sq) => {
      const res = evaluateBranch(sq);
      if (res.isCorrect) correctCount++;
    });

    if (subQuestions.length > 0 && correctCount === subQuestions.length) {
      playSuccess();
    } else if (correctCount > 0) {
      playPartial();
    } else {
      playError();
    }
  };

  // Effective mapUrl fallback to vector topographic map SVG Data URL
  const effectiveMapUrl =
    content?.mapUrl && content.mapUrl !== '/assets/maps/contour_01.png'
      ? content.mapUrl
      : JEBEL_MARRA_CONTOUR_MAP_SVG_URL;

  return (
    <div className="space-y-6">
      {/* 1. Map Visual Presentation Card */}
      <div className="p-4 bg-amber-950/5 border border-amber-800/20 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden">
        {content?.prompt && (
          <div className="w-full text-right mb-3 text-xs font-black text-slate-800 flex items-center justify-between border-b border-amber-800/10 pb-2">
            <span className="flex items-center gap-1.5 text-amber-950">
              <Compass className="w-4 h-4 text-amber-700" />
              <span>{content.prompt}</span>
            </span>
            {content.mapCode && (
              <span className="font-mono text-[10px] bg-amber-100/70 text-amber-900 px-2.5 py-0.5 rounded-md font-bold">
                {content.mapCode}
              </span>
            )}
          </div>
        )}

        {effectiveMapUrl ? (
          <div
            ref={imageContainerRef}
            onClick={overlayBranches.length > 0 ? handleMapClick : undefined}
            className={`relative max-w-full rounded-2xl overflow-hidden shadow-xs border border-amber-850/15 select-none ${
              overlayBranches.length > 0 && !isReadonly && examMode !== 'review'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
          >
            <img
              src={effectiveMapUrl}
              alt="خريطة كنتورية طوبوغرافية"
              className="max-h-96 w-auto object-contain block mx-auto pointer-events-none"
            />

            {/* Interactive SVG Overlay for mapOverlay polygons */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Show correct polygon in review mode or when training is verified */}
              {(examMode === 'review' || (examMode === 'training' && hasVerifiedTraining)) &&
                overlayBranches.map((sq) => {
                  const correctPoly = extractPolygonPoints(rawCorrectSubAnswers[sq.id]);
                  if (!correctPoly || correctPoly.length < 3) return null;
                  const ptsString = correctPoly.map(([px, py]) => `${px},${py}`).join(' ');
                  return (
                    <polygon
                      key={`correct_${sq.id}`}
                      points={ptsString}
                      fill="rgba(16, 185, 129, 0.35)"
                      stroke="#059669"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                    />
                  );
                })}

              {/* Show student polygon */}
              {overlayBranches.map((sq) => {
                const studentPoly = extractPolygonPoints(subAnswers[sq.id]);
                if (!studentPoly || studentPoly.length === 0) return null;

                const ptsString = studentPoly.map(([px, py]) => `${px},${py}`).join(' ');
                const isCorrect = evaluateBranch(sq).isCorrect;
                const strokeColor =
                  examMode === 'review' || (examMode === 'training' && hasVerifiedTraining)
                    ? isCorrect
                      ? '#10b981'
                      : '#ef4444'
                    : '#3b82f6';
                const fillColor =
                  examMode === 'review' || (examMode === 'training' && hasVerifiedTraining)
                    ? isCorrect
                      ? 'rgba(16, 185, 129, 0.25)'
                      : 'rgba(239, 68, 68, 0.25)'
                    : 'rgba(59, 130, 246, 0.25)';

                return (
                  <g key={`student_${sq.id}`}>
                    <polygon
                      points={ptsString}
                      fill={studentPoly.length >= 3 ? fillColor : 'none'}
                      stroke={strokeColor}
                      strokeWidth="0.8"
                    />
                    {studentPoly.map(([px, py], pIdx) => (
                      <circle
                        key={pIdx}
                        cx={px}
                        cy={py}
                        r="1.2"
                        fill="#ffffff"
                        stroke={strokeColor}
                        strokeWidth="0.6"
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="text-center text-amber-900/60 py-8">
            <Mountain className="w-12 h-12 mx-auto mb-2 opacity-60 text-amber-800" />
            <span className="text-sm font-semibold">
              خريطة كنتورية طوبوغرافية (خطوط الارتفاع المتساوية والفواصل الرأسية)
            </span>
          </div>
        )}

        {/* Overlay tools hint if drawing is active */}
        {overlayBranches.length > 0 && !isReadonly && examMode !== 'review' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 w-full max-w-xl text-xs bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl text-indigo-950">
            <div className="flex items-center gap-1.5 font-bold">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>أداة التحديد المكاني: انقر على الخريطة لرسم حدود المنطقة المطلوبة.</span>
            </div>
            {activeOverlaySubQId && (
              <button
                type="button"
                onClick={() => handleClearPolygon(activeOverlaySubQId)}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة رسم المنطقة</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Review Mode Table (جدول مقارنة تفصيلي للمراجعة بعد التسليم) */}
      {examMode === 'review' && (
        <div className="space-y-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>تقرير مراجعة إجابات الخريطة الكنتورية:</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-black">#</th>
                  <th className="p-3 font-black">السؤال الفرعي</th>
                  <th className="p-3 font-black">إجابة الطالب</th>
                  <th className="p-3 font-black">الإجابة المعتمدة</th>
                  <th className="p-3 font-black text-center">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subQuestions.map((sq, idx) => {
                  const evalRes = evaluateBranch(sq);
                  const rawStudent = subAnswers[sq.id];
                  const rawCorrect = rawCorrectSubAnswers[sq.id];

                  return (
                    <tr key={sq.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                      <td className="p-3 font-extrabold text-slate-900">{sq.question}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {sq.inputType === 'mapOverlay'
                          ? extractPolygonPoints(rawStudent)?.length
                            ? `مضلع محدد (${extractPolygonPoints(rawStudent)?.length} نقاط)`
                            : 'لم يُحدد'
                          : String(rawStudent ?? 'لم يجب')}
                        {sq.unit && <span className="mr-1 text-slate-400 font-normal">({sq.unit})</span>}
                      </td>
                      <td className="p-3 font-bold text-emerald-800">
                        {sq.inputType === 'mapOverlay'
                          ? 'المنطقة المظللة بالأخضر على الخريطة'
                          : String(rawCorrect ?? '')}
                        {sq.unit && <span className="mr-1 text-emerald-600 font-normal">({sq.unit})</span>}
                      </td>
                      <td className="p-3 text-center">
                        {evalRes.isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>صحيح</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{evalRes.fraction > 0 ? `جزئي (${Math.round(evalRes.fraction * 100)}%)` : 'خطأ'}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Sub-questions Inputs (وضع الطالب والمحاكاة والتدريب) */}
      {examMode !== 'review' && (
        <div className="space-y-4">
          {subQuestions.map((sq, idx) => {
            const evalRes = evaluateBranch(sq);
            const isEvaluated = examMode === 'training' && hasVerifiedTraining;
            const isCorrect = evalRes.isCorrect;
            const rawCorrect = rawCorrectSubAnswers[sq.id];

            return (
              <div
                key={sq.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isEvaluated
                    ? isCorrect
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-rose-50/40 border-rose-300'
                    : 'bg-white border-slate-200'
                } space-y-3 shadow-2xs`}
              >
                <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-950 text-xs flex items-center justify-center font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span>{sq.question}</span>
                  </div>

                  {/* Input Type Badge */}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {sq.inputType === 'numeric'
                      ? 'قيمة رقمية'
                      : sq.inputType === 'direction8'
                        ? 'اتجاه جغرافي'
                        : sq.inputType === 'mapOverlay'
                          ? 'تحديد مكاني'
                          : 'إجابة نصية'}
                  </span>
                </div>

                {/* Input Controls */}
                {sq.inputType === 'direction8' ? (
                  <div className="space-y-2">
                    {examMode === 'training' ? (
                      /* وضع التدريب: اختيار من متعدد للاتجاهات */
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>اختر اتجاه انحدار الوادي أو الجريان من الخيارات المعتمدة:</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black">
                            وضع التدريب (اختيار من متعدد)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(sq.options && sq.options.length > 0 ? sq.options : EIGHT_DIRECTIONS).map((dir) => {
                            const isSelected = subAnswers[sq.id] === dir;
                            return (
                              <button
                                key={dir}
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleSubChange(sq.id, dir)}
                                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {dir}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* وضع الامتحان الكامل أو المحاكي: فراغ نصي حر */
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          اكتب اتجاه انحدار الوادي في الفراغ التالي:
                        </label>
                        <input
                          type="text"
                          value={subAnswers[sq.id] || ''}
                          onChange={(e) => handleSubChange(sq.id, e.target.value)}
                          disabled={isReadonly}
                          placeholder="اكتب الاتجاه المطلوب (مثلاً: جنوب غربي)..."
                          className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 bg-white"
                        />
                      </div>
                    )}
                  </div>
                ) : sq.inputType === 'mapOverlay' ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>تحديد المنطقة والظاهرة على الخريطة:</span>
                      <span className="text-indigo-700 font-mono">
                        {extractPolygonPoints(subAnswers[sq.id])?.length || 0} نقاط محددة
                      </span>
                    </div>
                    {!isReadonly && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveOverlaySubQId(sq.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeOverlaySubQId === sq.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{activeOverlaySubQId === sq.id ? 'أداة الرسم نشطة الآن' : 'تفعيل أداة الرسم'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearPolygon(sq.id)}
                          className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>مسح النقاط</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : sq.inputType === 'numeric' ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={subAnswers[sq.id] || ''}
                        onChange={(e) => handleSubChange(sq.id, e.target.value)}
                        disabled={isReadonly}
                        placeholder="أدخل القيمة الحسابية المقروءة للفاصل..."
                        className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 bg-white"
                      />
                      {sq.unit && (
                        <span className="text-xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl">
                          {sq.unit}
                        </span>
                      )}
                    </div>

                    {/* زر التلميح الثابت لطريقة حساب الفاصل الكنتوري الرأسي */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleHint(sq.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{openHints[sq.id] ? 'إخفاء طريقة حساب الفاصل' : '💡 تلميح: طريقة حساب الفاصل الرأسي'}</span>
                      </button>

                      {openHints[sq.id] && (
                        <div className="mt-2 p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs space-y-2 text-amber-950 animate-fadeIn">
                          <div className="flex items-center gap-1.5 font-black text-amber-900">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span>قانون حساب الفاصل الكنتوري الرأسي:</span>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-mono text-center font-black text-amber-950 text-xs shadow-2xs">
                            الفاصل الرأسي = (الفرق بين منسوبي خطين رئيسيين متجاورين) ÷ (عدد الفواصل بينهما)
                          </div>
                          <p className="leading-relaxed text-[11px] text-amber-900/90">
                            {sq.hint ||
                              'طريقة الحل: اختر خطي كنتور رئيسيين مكتوب عليهما الارتفاع بوضوح (مثلاً 1200م و 1000م)، ثم اطرح المنسوب الأصغر من الأكبر، واقسم الناتج على عدد المسافات والخطوط بينهما للحصول على قيمة الفاصل الثابت.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* إدخال نصي عام / وصف الظاهرة التضاريسية */
                  <div className="space-y-2">
                    {sq.options && sq.options.length > 0 && examMode === 'training' ? (
                      /* وضع التدريب: اختيار من متعدد لوصف الظاهرة */
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                          <span>اختر وصف الظاهرة التضاريسية من الخيارات المتاحة:</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black">
                            وضع التدريب (اختيار من متعدد)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sq.options.map((opt) => {
                            const isSelected = subAnswers[sq.id] === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleSubChange(sq.id, opt)}
                                className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-right flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <span>{opt}</span>
                                {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* وضع الامتحان الكامل أو المحاكي: فراغ كتابة نصية حرة */
                      <div className="space-y-1">
                        {examMode !== 'training' && (
                          <label className="text-[11px] font-bold text-slate-600 block">
                            أدخل الإجابة / وصف الظاهرة في الفراغ:
                          </label>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={subAnswers[sq.id] || ''}
                            onChange={(e) => handleSubChange(sq.id, e.target.value)}
                            disabled={isReadonly}
                            placeholder="أدخل الإجابة المطلوبة (فراغ)..."
                            className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 bg-white"
                          />
                          {sq.unit && (
                            <span className="text-xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl">
                              {sq.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* تلميح إضافي إن وجد لفرع نصي */}
                    {sq.hint && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleHint(sq.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{openHints[sq.id] ? 'إخفاء التلميح' : 'إظهار تلميح السؤال 💡'}</span>
                        </button>
                        {openHints[sq.id] && (
                          <div className="mt-1 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                            {sq.hint}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Training Mode: Instant Feedback & Model Answer */}
                {isEvaluated && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <div className="flex items-center gap-1 text-emerald-800 text-xs font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>إجابة صحيحة ومطابقة للمعايير!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-rose-800 text-xs font-black">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>
                            إجابة غير صحيحة. الإجابة النموذجية المعتمدة هي:{' '}
                            <span className="underline font-extrabold mr-1">
                              {sq.inputType === 'mapOverlay'
                                ? 'المنطقة الخضراء المحددة على الخريطة'
                                : String(rawCorrect ?? '')}
                              {sq.unit ? ` ${sq.unit}` : ''}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Methodological Explanation */}
                    {sq.explanation && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs font-medium text-amber-950 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-black block text-amber-900">الشرح والتوجيه المنهجي:</span>
                          <p className="leading-relaxed text-amber-900/90">{sq.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Training Mode: Check Answers Button */}
          {examMode === 'training' && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleVerifyTraining}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تحقق من إجابات الخريطة الكنتورية</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
