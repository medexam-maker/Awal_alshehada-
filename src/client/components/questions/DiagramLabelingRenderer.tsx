import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  RefreshCw,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  fitRect,
  screenToNormalized,
  normalizedToScreen,
  clampViewport,
  zoomAt,
  panBy,
  classifyGesture,
  Point,
  Size,
  Viewport
} from '../../../client/lib/imageViewport';
import { inMemoryDiagramCache } from '../../../client/lib/examAssetPreload';
import { loadDiagramImage } from '../../../client/lib/diagramImageLoader';
import { apiClient } from '../../api/apiClient';
import { Region, pointInRegion } from '../../../shared/regionGeometry';

export interface DiagramSubQuestion {
  id: string;
  kind: 'locate' | 'name' | 'function';
  prompt: string;
  marks?: number;
  skill?: 'recognition' | 'identification' | 'understanding';
  target?: Region;
  options?: Array<{ id: string; text: string }>;
  hints?: string[];
  explanation?: string;
}

export interface DiagramLabelingProps {
  content: {
    prompt: string;
    diagram: {
      assetId?: string;
      url?: string;
      alt?: string;
    };
    subQuestions: DiagramSubQuestion[];
  };
  answer?: {
    subAnswers?: Record<
      string,
      {
        point?: { x: number; y: number };
        optionId?: string;
        text?: string;
      }
    >;
  };
  onChange: (ans: { subAnswers: Record<string, any> }) => void;
  isReadonly?: boolean;
  examMode?: 'simulator' | 'training';
  correctAnswer?: {
    subAnswers?: Record<string, any>;
    explanations?: Record<string, string>;
  };
}

export const DiagramLabelingRenderer: React.FC<DiagramLabelingProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  examMode = 'training',
  correctAnswer,
}) => {
  const isSimulator = examMode === 'simulator';
  const subAnswers = answer?.subAnswers || {};
  const subQuestions = content.subQuestions || [];

  // Active sub-question index
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const currentSub = subQuestions[activeSubIndex] || subQuestions[0];

  // Image loading & caching states
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);
  const createdBlobUrlRef = useRef<string | null>(null);

  // Viewport state
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });

  // Training mode feedback states
  const [checkedSubAnswers, setCheckedSubAnswers] = useState<Record<string, boolean>>({});
  const [activeHintLevel, setActiveHintLevel] = useState<Record<string, number>>({});
  const [announcement, setAnnouncement] = useState<string>('');

  // Key / pointer gesture tracking
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastTouchDistRef = useRef<number | null>(null);

  // Keyboard navigation marker position (0..1)
  const [kbdMarker, setKbdMarker] = useState<Point>({ x: 0.5, y: 0.5 });

  // 1. Resolve and cache image through pure loadDiagramImage
  const revokeRef = useRef<(() => void) | null>(null);

  const loadImage = useCallback(async () => {
    setImgLoading(true);
    setImgError(false);

    let src = content.diagram?.url;
    if (content.diagram?.assetId) {
      src = `/api/media/${content.diagram.assetId}`;
    }

    if (revokeRef.current) {
      revokeRef.current();
      revokeRef.current = null;
    }

    const res = await loadDiagramImage(src);
    revokeRef.current = res.revoke;
    setImageUrl(res.imageUrl);
    setImgError(res.error);
    setImgLoading(false);
  }, [content.diagram?.assetId, content.diagram?.url]);

  useEffect(() => {
    loadImage();
    return () => {
      // Clean up object URL on unmount to prevent memory leaks
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }
    };
  }, [loadImage]);

  // Update container size on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update sub-answer helper
  const handleSubChange = (subId: string, val: { point?: { x: number; y: number }; optionId?: string; text?: string }) => {
    if (isReadonly) return;
    const existing = subAnswers[subId] || {};
    const updated = { ...existing, ...val };
    onChange({
      subAnswers: {
        ...subAnswers,
        [subId]: updated,
      },
    });
  };

  // Handle pointer down (tap / pan / zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    pointerStartRef.current = { x: pt.x, y: pt.y, time: Date.now() };
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const dx = currentPt.x - pointerStartRef.current.x;
    const dy = currentPt.y - pointerStartRef.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDraggingRef.current = true;
      // Pan viewport if zoomed
      if (viewport.scale > 1) {
        setViewport((prev) =>
          panBy(prev, dx, dy, containerSize, imageSize || { width: 400, height: 300 })
        );
        pointerStartRef.current = { x: currentPt.x, y: currentPt.y, time: Date.now() };
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const endPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const duration = Date.now() - pointerStartRef.current.time;

    const gesture = classifyGesture(pointerStartRef.current, endPt, duration);

    if (gesture === 'tap' && !isReadonly && currentSub && currentSub.kind === 'locate' && imageSize) {
      const norm = screenToNormalized(endPt, containerSize, imageSize, viewport);
      if (norm) {
        handleSubChange(currentSub.id, { point: norm });
        setAnnouncement(`تم وضع العلامة على الصورة عند الموقع x: ${Math.round(norm.x * 100)}%، y: ${Math.round(norm.y * 100)}%`);
      }
    }

    pointerStartRef.current = null;
    isDraggingRef.current = false;
  };

  // Keyboard navigation for marker placement
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReadonly || !currentSub || currentSub.kind !== 'locate' || !imageSize) return;

    let { x, y } = kbdMarker;
    const step = 0.01; // 1% movement per arrow key press

    if (e.key === 'ArrowUp') {
      y = Math.max(0, y - step);
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      y = Math.min(1, y + step);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      x = Math.max(0, x - step);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      x = Math.min(1, x + step);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      handleSubChange(currentSub.id, { point: { x, y } });
      setAnnouncement(`تم تأكيد موقع النقطة عند x: ${Math.round(x * 100)}%، y: ${Math.round(y * 100)}%`);
      e.preventDefault();
      return;
    }

    setKbdMarker({ x, y });
  };

  // Check action in Training mode
  const handleCheckSubAnswer = (subId: string) => {
    if (isSimulator || isReadonly) return;
    setCheckedSubAnswers((prev) => ({ ...prev, [subId]: true }));

    const sq = subQuestions.find((s) => s.id === subId);
    const sa = subAnswers[subId];
    const caKey = correctAnswer?.subAnswers?.[subId];

    let isCorrect = false;
    if (sq?.kind === 'locate' && sa?.point && caKey?.regions) {
      isCorrect = caKey.regions.some((reg: Region) => pointInRegion(sa.point!, reg));
    } else if (sq?.kind === 'name') {
      if (sa?.optionId && caKey?.optionId) isCorrect = sa.optionId === caKey.optionId;
      else if (sa?.text && caKey?.acceptedNames) {
        const norm = sa.text.trim().toLowerCase();
        isCorrect = caKey.acceptedNames.some((acc: string) => acc.trim().toLowerCase() === norm);
      }
    } else if (sq?.kind === 'function' && sa?.optionId && caKey?.optionId) {
      isCorrect = sa.optionId === caKey.optionId;
    }

    setAnnouncement(isCorrect ? 'إجابة صحيحة! أحسنت.' : 'إجابة خاطئة. حاول مرة أخرى أو راجع التلميح.');
  };

  // Render SVG region shapes for `name` / `function` target, or correct target in locate review
  const renderRegionSVG = (region: Region, baseRect: { x: number; y: number; width: number; height: number }, strokeColor = '#3b82f6', fillColor = 'rgba(59, 130, 246, 0.2)') => {
    if (!region) return null;

    if (region.type === 'ellipse') {
      const cx = baseRect.x + region.cx * baseRect.width;
      const cy = baseRect.y + region.cy * baseRect.height;
      const rx = region.rx * baseRect.width;
      const ry = region.ry * baseRect.height;
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={strokeColor} strokeWidth="2.5" fill={fillColor} strokeDasharray="4 2" />;
    } else if (region.type === 'rect') {
      const r = region as any;
      const x = baseRect.x + r.x * baseRect.width;
      const y = baseRect.y + r.y * baseRect.height;
      const wVal = typeof r.w === 'number' ? r.w : (r.width || 0);
      const hVal = typeof r.h === 'number' ? r.h : (r.height || 0);
      const width = wVal * baseRect.width;
      const height = hVal * baseRect.height;
      return <rect x={x} y={y} width={width} height={height} stroke={strokeColor} strokeWidth="2.5" fill={fillColor} strokeDasharray="4 2" rx="4" />;
    } else if (region.type === 'polygon' && Array.isArray(region.points) && region.points.length > 2) {
      const pointsStr = region.points
        .map((p: any) => {
          const px = Array.isArray(p) ? p[0] : p.x;
          const py = Array.isArray(p) ? p[1] : p.y;
          return `${baseRect.x + px * baseRect.width},${baseRect.y + py * baseRect.height}`;
        })
        .join(' ');
      return <polygon points={pointsStr} stroke={strokeColor} strokeWidth="2.5" fill={fillColor} strokeDasharray="4 2" />;
    }
    return null;
  };

  const baseFit = imageSize && containerSize.width > 0 ? fitRect(containerSize, imageSize) : null;

  return (
    <div className="space-y-6 dir-rtl text-right font-sans">
      {/* Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* Title / Prompt */}
      {content.prompt && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl font-bold text-base leading-relaxed flex items-center gap-2 shadow-sm">
          <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{content.prompt}</span>
        </div>
      )}

      {/* Main Diagram Area */}
      <div className="relative border border-slate-300 rounded-2xl bg-slate-950 overflow-hidden min-h-[55vh] flex flex-col justify-center items-center shadow-md select-none">
        {/* Viewport Control Bar */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-xl border border-slate-700/80 shadow-lg text-white">
          <button
            type="button"
            onClick={() =>
              setViewport((v) =>
                zoomAt(
                  v,
                  1.25,
                  { x: containerSize.width / 2, y: containerSize.height / 2 },
                  containerSize,
                  imageSize || { width: 400, height: 300 }
                )
              )
            }
            aria-label="تكبير الرسم"
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={() =>
              setViewport((v) =>
                zoomAt(
                  v,
                  0.8,
                  { x: containerSize.width / 2, y: containerSize.height / 2 },
                  containerSize,
                  imageSize || { width: 400, height: 300 }
                )
              )
            }
            aria-label="تصغير الرسم"
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            type="button"
            onClick={() => setViewport({ scale: 1, tx: 0, ty: 0 })}
            aria-label="إعادة تعيين التكبير والموضع"
            className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer text-xs font-bold gap-1"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">إعادة ضبط</span>
          </button>
        </div>

        {/* Interactive Diagram Canvas */}
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="w-full h-full min-h-[55vh] relative flex items-center justify-center cursor-crosshair focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-2xl"
        >
          {imgLoading && (
            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 py-20">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-sm font-bold">جاري تحميل الرسم البياني التفاعلي...</span>
            </div>
          )}

          {imgError && !imgLoading && (
            <div className="flex flex-col items-center justify-center text-rose-400 space-y-3 py-20 px-4 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <span className="text-sm font-bold">عذراً، تعذر تحميل الرسم البياني</span>
              <button
                type="button"
                onClick={loadImage}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {imageUrl && !imgLoading && (
            <div
              className="relative transition-transform duration-75 ease-out"
              style={{
                transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
              }}
            >
              {/* Image Element */}
              <img
                src={imageUrl}
                alt={content.diagram?.alt || 'رسم بياني تفاعلي'}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                }}
                className="w-full h-full object-contain pointer-events-none select-none"
              />

              {/* SVG Overlay for Target Regions & Markers */}
              {baseFit && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Highlight current subQuestion target region if `name` or `function` */}
                  {currentSub && (currentSub.kind === 'name' || currentSub.kind === 'function') && currentSub.target && (
                    renderRegionSVG(currentSub.target, baseFit, '#3b82f6', 'rgba(59, 130, 246, 0.25)')
                  )}

                  {/* Outline correct target regions for locate in Training checked / review mode */}
                  {(checkedSubAnswers[currentSub?.id] || isReadonly) && correctAnswer?.subAnswers?.[currentSub?.id]?.regions && (
                    (correctAnswer.subAnswers[currentSub.id].regions as Region[]).map((reg, idx) => (
                      <g key={idx}>
                        {renderRegionSVG(reg, baseFit, '#10b981', 'rgba(16, 185, 129, 0.2)')}
                      </g>
                    ))
                  )}

                  {/* Student Placed Marker for `locate` subQuestions */}
                  {subQuestions.map((sq) => {
                    const sa = subAnswers[sq.id];
                    if (sq.kind !== 'locate' || !sa?.point) return null;

                    const screenPt = normalizedToScreen(sa.point, containerSize, imageSize || { width: 400, height: 300 }, { scale: 1, tx: 0, ty: 0 });
                    const isCurrent = sq.id === currentSub?.id;

                    return (
                      <g key={sq.id} transform={`translate(${screenPt.x}, ${screenPt.y})`}>
                        <circle
                          r="12"
                          fill={isCurrent ? '#f59e0b' : '#10b981'}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="animate-pulse"
                        />
                        <text
                          y="4"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          📍
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Question Stepper Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg text-xs">
              سؤال {activeSubIndex + 1} من {subQuestions.length}
            </span>
            {currentSub?.skill && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                مهارة: {currentSub.skill === 'recognition' ? 'التعرف' : currentSub.skill === 'identification' ? 'التحديد' : 'الفهم والتفسير'}
              </span>
            )}
          </div>

          {/* Status Dots with Shapes & Icons */}
          <div className="flex items-center gap-1.5">
            {subQuestions.map((sq, idx) => {
              const isSelected = idx === activeSubIndex;
              const sa = subAnswers[sq.id];
              const isAnswered = sa?.point !== undefined || sa?.optionId !== undefined || (sa?.text && sa.text.trim().length > 0);
              const isChecked = checkedSubAnswers[sq.id];

              let bg = 'bg-slate-100 border-slate-300 text-slate-500';
              let icon = String(idx + 1);

              if (isAnswered) {
                bg = 'bg-emerald-100 border-emerald-400 text-emerald-900';
              }
              if (isChecked && !isSimulator) {
                bg = 'bg-emerald-600 border-emerald-600 text-white';
                icon = '✓';
              }

              return (
                <button
                  key={sq.id}
                  type="button"
                  onClick={() => setActiveSubIndex(idx)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs border transition-all flex items-center justify-center cursor-pointer ${bg} ${
                    isSelected ? 'ring-2 ring-emerald-500 scale-110 shadow-sm' : ''
                  }`}
                  aria-label={`الانتقال للسؤال الفرعي ${idx + 1}`}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Sub-question Prompt */}
        {currentSub && (
          <div className="space-y-4">
            <div className="text-base font-bold text-slate-900 leading-relaxed flex items-start gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                {activeSubIndex + 1}
              </span>
              <span>{currentSub.prompt}</span>
            </div>

            {/* Sub-Question Input Controls */}
            {currentSub.kind === 'locate' && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950 font-medium">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <MapPin className="w-4 h-4 text-amber-700" />
                    <span>حدد الموضع بالضغط المباشر على الرسم أعلاه</span>
                  </span>
                  {subAnswers[currentSub.id]?.point && !isReadonly && (
                    <button
                      type="button"
                      onClick={() => handleSubChange(currentSub.id, { point: undefined })}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold underline cursor-pointer"
                    >
                      مسح الموضع
                    </button>
                  )}
                </div>
                {subAnswers[currentSub.id]?.point ? (
                  <p className="text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    تم تحديد الموقع: X = {Math.round(subAnswers[currentSub.id].point!.x * 100)}٪ ، Y = {Math.round(subAnswers[currentSub.id].point!.y * 100)}٪
                  </p>
                ) : (
                  <p className="text-slate-600 italic">
                    لم يتم تحديد أي نقطة بعد. اضغط على الرسم في الأعلى لوضع الدبوس.
                  </p>
                )}
              </div>
            )}

            {currentSub.kind === 'name' && (
              <div className="space-y-2">
                {!isSimulator && currentSub.options && currentSub.options.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {currentSub.options.map((opt) => {
                      const isSelected = subAnswers[currentSub.id]?.optionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSubChange(currentSub.id, { optionId: opt.id })}
                          disabled={isReadonly}
                          className={`p-3 rounded-xl border text-right text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={subAnswers[currentSub.id]?.text || ''}
                    onChange={(e) => handleSubChange(currentSub.id, { text: e.target.value })}
                    disabled={isReadonly}
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    placeholder="اكتب اسم العضو أو الجزء المشار إليه..."
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium min-h-[44px]"
                  />
                )}
              </div>
            )}

            {currentSub.kind === 'function' && currentSub.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentSub.options.map((opt) => {
                  const isSelected = subAnswers[currentSub.id]?.optionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSubChange(currentSub.id, { optionId: opt.id })}
                      disabled={isReadonly}
                      className={`p-3 rounded-xl border text-right text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TRAINING ONLY: Check Answer, Progressive Hints, Explanations */}
            {!isSimulator && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCheckSubAnswer(currentSub.id)}
                    disabled={isReadonly}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تحقق من الإجابة</span>
                  </button>

                  {currentSub.hints && currentSub.hints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const curr = activeHintLevel[currentSub.id] || 0;
                        if (curr < currentSub.hints!.length) {
                          setActiveHintLevel({ ...activeHintLevel, [currentSub.id]: curr + 1 });
                          setAnnouncement(`تلميح ${curr + 1}: ${currentSub.hints![curr]}`);
                        }
                      }}
                      className="px-3 py-2 bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200 font-bold text-xs rounded-xl transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span>
                        تلميح ({(activeHintLevel[currentSub.id] || 0)} من {currentSub.hints.length})
                      </span>
                    </button>
                  )}
                </div>

                {/* Active Hints */}
                {(activeHintLevel[currentSub.id] || 0) > 0 && currentSub.hints && (
                  <div className="space-y-1.5">
                    {currentSub.hints.slice(0, activeHintLevel[currentSub.id]).map((hintText, hIdx) => (
                      <div key={hIdx} className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 font-medium leading-relaxed flex items-start gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                        <span><strong>تلميح {hIdx + 1}:</strong> {hintText}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Checked Explanation */}
                {checkedSubAnswers[currentSub.id] && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Info className="w-4 h-4 text-emerald-600" />
                      <span>التوضيح والتعليل الأكاديمي:</span>
                    </div>
                    <p>{correctAnswer?.explanations?.[currentSub.id] || currentSub.explanation || 'تم التحقق من الإجابة مع النموذج التصحيحي المعيارى.'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeSubIndex === 0}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السؤال السابق</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubIndex((prev) => Math.min(subQuestions.length - 1, prev + 1))}
                disabled={activeSubIndex === subQuestions.length - 1}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer min-h-[44px]"
              >
                <span>السؤال التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
