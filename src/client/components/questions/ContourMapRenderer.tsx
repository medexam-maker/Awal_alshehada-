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
  Check,
  X,
  ZoomIn,
  MapPin,
  Undo2
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
  playBookmark
} from '../../utils/soundEffects';
import { playFeedbackSound } from '../../utils/soundManager';

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
  const isTraining = examMode === 'training';
  const isReview = examMode === 'review';

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

  // Model answers map (hidden in simulator mode)
  const rawCorrectSubAnswers: Record<string, any> =
    isTraining || isReview
      ? (correctAnswer as any)?.subAnswers ||
        (typeof correctAnswer === 'object' && correctAnswer !== null ? correctAnswer : {})
      : {};

  // Training mode: instant verification state
  const [hasVerifiedTraining, setHasVerifiedTraining] = useState<boolean>(false);

  // Hints display state per sub-question (Training only)
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});

  // Map load fallback & zoom modal state
  const [mapLoadError, setMapLoadError] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  useEffect(() => {
    setMapLoadError(false);
  }, [content?.mapUrl]);

  const toggleHint = (subQId: string) => {
    if (!isTraining) return;
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

  // Map image refs for coordinate translation and scroll-to-map navigation
  const mapCardRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Draft auto-save
  const saveDraft = (updated: Record<string, any>) => {
    if (autoSaveKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`contour_draft_${autoSaveKey}`, JSON.stringify(updated));
      } catch {
        // ignore quota issues
      }
    }
  };

  const commitSubAnswer = (id: string, val: any) => {
    const updated = {
      ...subAnswers,
      [id]: val,
    };
    setSubAnswers(updated);
    onChange({ subAnswers: updated });
    onAnswerChange?.(id, val);
    saveDraft(updated);
  };

  const handleSubChange = (id: string, val: any) => {
    if (isReadonly) return;
    playClick();
    commitSubAnswer(id, val);
  };

  // Immediate feedback for Training MCQ buttons (direction8 & text options)
  const handleSelectOption = (sq: ContourSubQuestion, optVal: string) => {
    if (isReadonly) return;
    commitSubAnswer(sq.id, optVal);

    if (isTraining && rawCorrectSubAnswers[sq.id] !== undefined) {
      const res = checkContourBranch(optVal, rawCorrectSubAnswers[sq.id], sq);
      playFeedbackSound(res.isCorrect ? 'correct' : 'incorrect');
    } else {
      playWaterDrop();
    }
  };

  // Polygon click handler for mapOverlay (supports both inline and zoomed view)
  const handleMapClick = (
    e: React.MouseEvent<HTMLDivElement>,
    containerEl: HTMLDivElement | null = imageContainerRef.current
  ) => {
    if (isReadonly || isReview) return;
    if (!activeOverlaySubQId) return;

    const rect = containerEl?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    playWaterDrop();

    // Calculate percentage coordinates (0 - 100)
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const currentPoly: [number, number][] =
      extractPolygonPoints(subAnswers[activeOverlaySubQId]) || [];

    const updatedPoly = [...currentPoly, [x, y] as [number, number]];
    commitSubAnswer(activeOverlaySubQId, { polygon: updatedPoly });
  };

  const handleUndoPolygonPoint = (subQId: string) => {
    if (isReadonly || isReview) return;
    const currentPoly: [number, number][] = extractPolygonPoints(subAnswers[subQId]) || [];
    if (currentPoly.length === 0) return;
    playScratchpad();
    commitSubAnswer(subQId, { polygon: currentPoly.slice(0, -1) });
  };

  const handleClearPolygon = (subQId: string) => {
    if (isReadonly || isReview) return;
    playScratchpad();
    commitSubAnswer(subQId, { polygon: [] });
  };

  // Check branch correctness
  const evaluateBranch = (sq: ContourSubQuestion) => {
    const rawStudent = subAnswers[sq.id];
    const rawCorrect = rawCorrectSubAnswers[sq.id];
    return checkContourBranch(rawStudent, rawCorrect, sq);
  };

  // Instant Verification with Audio Feedback
  const handleVerifyTraining = () => {
    if (!isTraining) return;
    setHasVerifiedTraining(true);
    let correctCount = 0;
    subQuestions.forEach((sq) => {
      const res = evaluateBranch(sq);
      if (res.isCorrect) correctCount++;
    });

    if (subQuestions.length > 0 && correctCount === subQuestions.length) {
      playFeedbackSound('correct');
    } else {
      playFeedbackSound('incorrect');
    }
  };

  const scrollToMap = (sqId?: string) => {
    if (sqId) setActiveOverlaySubQId(sqId);
    mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Effective mapUrl fallback to guaranteed explicit-dimension vector topographic map SVG Data URL
  const rawMapUrl = typeof content?.mapUrl === 'string' ? content.mapUrl.trim() : '';
  const isLegacyMissingUrl = !rawMapUrl || rawMapUrl === '/assets/maps/contour_01.png';
  const effectiveMapUrl =
    !mapLoadError && !isLegacyMissingUrl ? rawMapUrl : JEBEL_MARRA_CONTOUR_MAP_SVG_URL;

  const isDrawingActive = overlayBranches.length > 0 && !isReadonly && !isReview;

  const renderOverlaySvg = () => (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Show correct polygon in review mode or when training is verified */}
      {(isReview || (isTraining && hasVerifiedTraining)) &&
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
              strokeWidth="0.9"
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
          isReview || (isTraining && hasVerifiedTraining)
            ? isCorrect
              ? '#10b981'
              : '#ef4444'
            : '#2563eb';
        const fillColor =
          isReview || (isTraining && hasVerifiedTraining)
            ? isCorrect
              ? 'rgba(16, 185, 129, 0.25)'
              : 'rgba(239, 68, 68, 0.25)'
            : 'rgba(37, 99, 235, 0.22)';

        return (
          <g key={`student_${sq.id}`}>
            <polygon
              points={ptsString}
              fill={studentPoly.length >= 3 ? fillColor : 'none'}
              stroke={strokeColor}
              strokeWidth="0.9"
            />
            {studentPoly.map(([px, py], pIdx) => (
              <circle
                key={pIdx}
                cx={px}
                cy={py}
                r="1.4"
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="0.7"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div className="space-y-6 dir-rtl text-right" dir="rtl">
      {/* 1. Map Visual Presentation Card */}
      <div
        ref={mapCardRef}
        className="p-3.5 sm:p-4 bg-amber-950/5 border border-amber-800/20 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden space-y-3"
      >
        {/* Clear Header Locating the Attached Map */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-amber-800/15 pb-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-950">
            <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </span>
            <span>الخريطة الكنتورية المرفقة للسؤال</span>
          </div>

          <div className="flex items-center gap-2">
            {content.mapCode && (
              <span className="font-mono text-[10px] bg-amber-100/80 text-amber-900 px-2.5 py-1 rounded-lg font-bold">
                {content.mapCode}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5 text-amber-700" />
              <span>تكبير الخريطة</span>
            </button>
          </div>
        </div>

        {/* Definite Aspect-Ratio Map Canvas (never collapses on mobile) */}
        {effectiveMapUrl ? (
          <div
            ref={imageContainerRef}
            onClick={isDrawingActive ? (e) => handleMapClick(e, imageContainerRef.current) : undefined}
            className={`relative w-full max-w-2xl aspect-[8/5] rounded-2xl overflow-hidden shadow-sm border-2 bg-amber-50/60 select-none transition-all ${
              isDrawingActive
                ? 'cursor-crosshair border-indigo-500 ring-4 ring-indigo-500/15'
                : 'cursor-default border-amber-800/20'
            }`}
          >
            <img
              src={effectiveMapUrl}
              onError={() => setMapLoadError(true)}
              alt="خريطة كنتورية طوبوغرافية"
              className="w-full h-full object-contain block pointer-events-none"
            />

            {/* Interactive SVG Overlay for mapOverlay polygons */}
            {renderOverlaySvg()}
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
        {isDrawingActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-2xl text-xs bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl text-indigo-950">
            <div className="flex items-center gap-1.5 font-bold">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>أداة التحديد المكاني نشطة: انقر مباشرة على الخريطة أعلاه لرسم حدود المنطقة المطلوبة.</span>
            </div>
            {activeOverlaySubQId && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUndoPolygonPoint(activeOverlaySubQId)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>تراجع نقطة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleClearPolygon(activeOverlaySubQId)}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة رسم المنطقة</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zoom Modal for Mobile Inspection & Precision Tapping */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Compass className="w-4 h-4 text-amber-700" />
                <span>عرض مكبّر للخريطة الكنتورية</span>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                aria-label="إغلاق التكبير"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              ref={zoomContainerRef}
              onClick={isDrawingActive ? (e) => handleMapClick(e, zoomContainerRef.current) : undefined}
              className={`relative w-full aspect-[8/5] rounded-2xl overflow-hidden border-2 bg-amber-50/60 select-none ${
                isDrawingActive ? 'cursor-crosshair border-indigo-500' : 'border-amber-800/20'
              }`}
            >
              <img
                src={effectiveMapUrl}
                alt="عرض مكبر للخريطة الكنتورية"
                className="w-full h-full object-contain block pointer-events-none"
              />
              {renderOverlaySvg()}
            </div>

            {isDrawingActive && activeOverlaySubQId && (
              <div className="flex items-center justify-between text-xs text-indigo-900 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200">
                <span className="font-bold">يمكنك النقر مباشرة على الخريطة المكبّرة لتحديد النقاط بدقة.</span>
                <button
                  type="button"
                  onClick={() => handleClearPolygon(activeOverlaySubQId)}
                  className="px-2.5 py-1 bg-white text-rose-700 border border-rose-200 rounded-lg font-bold cursor-pointer"
                >
                  مسح النقاط
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Review Mode Table (جدول مقارنة تفصيلي للمراجعة بعد التسليم) */}
      {isReview && (
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
      {!isReview && (
        <div className="space-y-4">
          {subQuestions.map((sq, idx) => {
            const evalRes = evaluateBranch(sq);
            const hasKey = isTraining && rawCorrectSubAnswers[sq.id] !== undefined;
            const isMcqBranch =
              isTraining &&
              (sq.inputType === 'direction8' || (sq.options && sq.options.length > 0 && sq.inputType !== 'numeric' && sq.inputType !== 'mapOverlay'));
            const hasMcqSelection = isMcqBranch && Boolean(subAnswers[sq.id]);
            const isEvaluated = isTraining && hasVerifiedTraining;
            const isCorrect = evalRes.isCorrect;
            const rawCorrect = rawCorrectSubAnswers[sq.id];

            // Card border/background: Training shows red if verified wrong (or MCQ selected wrong), green if verified right
            let cardTone = 'bg-white border-slate-200';
            if (isEvaluated) {
              cardTone = isCorrect ? 'bg-emerald-50/40 border-emerald-300' : 'bg-rose-50/40 border-rose-300';
            } else if (hasMcqSelection && hasKey) {
              cardTone = isCorrect ? 'bg-emerald-50/25 border-emerald-300' : 'bg-rose-50/25 border-rose-300';
            }

            return (
              <div
                key={sq.id}
                className={`p-4 rounded-2xl border transition-all ${cardTone} space-y-3 shadow-2xs`}
              >
                <div className="text-sm font-bold text-slate-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-950 text-xs flex items-center justify-center font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span>{sq.question}</span>
                  </div>

                  {/* Input Type Badge */}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
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
                    {isTraining ? (
                      /* وضع التدريب: اختيار من متعدد للاتجاهات مع تلوين أحمر/أخضر فوري */
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
                            const optEval = hasKey ? checkContourBranch(dir, rawCorrect, sq) : { isCorrect: false };

                            let btnStyle =
                              'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300';
                            let icon: React.ReactNode = null;

                            if (isSelected) {
                              if (hasKey) {
                                if (optEval.isCorrect) {
                                  btnStyle =
                                    'bg-emerald-100 text-emerald-950 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs';
                                  icon = <Check className="w-4 h-4 text-emerald-700 stroke-[3] shrink-0" />;
                                } else {
                                  btnStyle =
                                    'bg-rose-100 text-rose-950 border-rose-600 ring-2 ring-rose-500/20 shadow-xs';
                                  icon = <X className="w-4 h-4 text-rose-700 stroke-[3] shrink-0" />;
                                }
                              } else {
                                btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                              }
                            } else if ((isEvaluated || isReadonly) && hasKey && optEval.isCorrect) {
                              btnStyle =
                                'bg-emerald-50 text-emerald-900 border-emerald-500 border-dashed';
                              icon = <Check className="w-4 h-4 text-emerald-600 shrink-0" />;
                            }

                            return (
                              <button
                                key={dir}
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleSelectOption(sq, dir)}
                                className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${btnStyle}`}
                              >
                                <span>{dir}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                        {hasMcqSelection && hasKey && !isEvaluated && (
                          <div
                            className={`text-xs font-bold flex items-center gap-1.5 ${
                              isCorrect ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>إجابة صحيحة!</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>إجابة خاطئة، راجع اتجاه السهم والمناسيب على الخريطة.</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* وضع المحاكي: فراغ نصي حر بدون تلميحات أو ألوان */
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
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                      <span>تحديد المنطقة والظاهرة بالنقر على الخريطة الكنتورية في الأعلى:</span>
                      <span className="text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {extractPolygonPoints(subAnswers[sq.id])?.length || 0} نقاط محددة
                      </span>
                    </div>
                    {!isReadonly && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => scrollToMap(sq.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeOverlaySubQId === sq.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{activeOverlaySubQId === sq.id ? 'عرض الخريطة والتحديد عليها' : 'تفعيل الرسم على الخريطة'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUndoPolygonPoint(sq.id)}
                          className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>تراجع نقطة</span>
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
                        className={`flex-1 p-2.5 text-xs border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-colors ${
                          isEvaluated
                            ? isCorrect
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                              : 'border-rose-500 bg-rose-50 text-rose-950'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                      {sq.unit && (
                        <span className="text-xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl">
                          {sq.unit}
                        </span>
                      )}
                    </div>

                    {/* زر التلميح لطريقة حساب الفاصل الكنتوري الرأسي (وضع التدريب فقط) */}
                    {isTraining && (
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
                    )}
                  </div>
                ) : (
                  /* إدخال نصي عام / وصف الظاهرة التضاريسية */
                  <div className="space-y-2">
                    {sq.options && sq.options.length > 0 && isTraining ? (
                      /* وضع التدريب: اختيار من متعدد مع تلوين أحمر للخطأ وأخضر للصواب */
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
                            const optEval = hasKey ? checkContourBranch(opt, rawCorrect, sq) : { isCorrect: false };

                            let btnStyle =
                              'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300';
                            let icon: React.ReactNode = null;

                            if (isSelected) {
                              if (hasKey) {
                                if (optEval.isCorrect) {
                                  btnStyle =
                                    'bg-emerald-100 text-emerald-950 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs';
                                  icon = <Check className="w-4 h-4 text-emerald-700 stroke-[3] shrink-0" />;
                                } else {
                                  btnStyle =
                                    'bg-rose-100 text-rose-950 border-rose-600 ring-2 ring-rose-500/20 shadow-xs';
                                  icon = <X className="w-4 h-4 text-rose-700 stroke-[3] shrink-0" />;
                                }
                              } else {
                                btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                                icon = <Check className="w-4 h-4 text-white shrink-0" />;
                              }
                            } else if ((isEvaluated || isReadonly) && hasKey && optEval.isCorrect) {
                              btnStyle =
                                'bg-emerald-50 text-emerald-900 border-emerald-500 border-dashed';
                              icon = <Check className="w-4 h-4 text-emerald-600 shrink-0" />;
                            }

                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isReadonly}
                                onClick={() => handleSelectOption(sq, opt)}
                                className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer text-right flex items-center justify-between gap-2 ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                        {hasMcqSelection && hasKey && !isEvaluated && (
                          <div
                            className={`text-xs font-bold flex items-center gap-1.5 ${
                              isCorrect ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>إجابة صحيحة!</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>إجابة خاطئة، راجع شكل خطوط الكنتور على الخريطة.</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* وضع الامتحان الكامل أو المحاكي: فراغ كتابة نصية حرة */
                      <div className="space-y-1">
                        {!isTraining && (
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
                            className={`flex-1 p-2.5 text-xs border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold transition-colors ${
                              isEvaluated
                                ? isCorrect
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                                  : 'border-rose-500 bg-rose-50 text-rose-950'
                                : 'border-slate-300 bg-white text-slate-900'
                            }`}
                          />
                          {sq.unit && (
                            <span className="text-xs font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl">
                              {sq.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* تلميح إضافي إن وجد لفرع نصي (وضع التدريب فقط) */}
                    {isTraining && sq.hint && (
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
          {isTraining && (
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
