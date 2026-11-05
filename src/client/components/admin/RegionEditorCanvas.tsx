import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Square,
  Circle,
  Hexagon,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Target,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  EditorState,
  EditorAction,
  EditorTool,
  DraftRegion
} from '../../lib/regionEditorState';
import {
  fitRect,
  screenToNormalized,
  normalizedToScreen,
  clampViewport,
  zoomAt,
  panBy,
  Point,
  Size,
  Viewport
} from '../../lib/imageViewport';
import { Region, pointInRegion, RectRegion, EllipseRegion, PolygonRegion } from '../../../shared/regionGeometry';
import { DiagramSubQuestion } from '../questions/DiagramLabelingRenderer';

export const SUB_COLORS = [
  { stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.22)', dash: '', label: 'أزرق (مستمر)', name: 'blue' },
  { stroke: '#059669', fill: 'rgba(5, 150, 105, 0.22)', dash: '6 3', label: 'أخضر (متقطع)', name: 'emerald' },
  { stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.22)', dash: '3 3', label: 'كهرماني (منقط)', name: 'amber' },
  { stroke: '#7c3aed', fill: 'rgba(124, 58, 237, 0.22)', dash: '8 3 2 3', label: 'بنفسجي (شرطة ونقطة)', name: 'purple' },
  { stroke: '#e11d48', fill: 'rgba(225, 29, 72, 0.22)', dash: '10 4', label: 'وردي (شرطات عريضة)', name: 'rose' },
  { stroke: '#0891b2', fill: 'rgba(8, 145, 178, 0.22)', dash: '4 4 1 1', label: 'فيروزي (مركب)', name: 'cyan' },
];

export interface RegionEditorCanvasProps {
  imageUrl: string;
  subQuestions: DiagramSubQuestion[];
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  testClickMode: boolean;
  onToggleTestClickMode: () => void;
}

export const RegionEditorCanvas: React.FC<RegionEditorCanvasProps> = ({
  imageUrl,
  subQuestions,
  state,
  dispatch,
  testClickMode,
  onToggleTestClickMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 });

  // Test click feedback
  const [testResult, setTestResult] = useState<{
    hit: boolean;
    point: Point;
    activeTitle: string;
  } | null>(null);

  // Dragging vertex state
  const [dragVertex, setDragVertex] = useState<{
    subId: string;
    index: number;
    vertex: number;
  } | null>(null);

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point | null>(null);

  // Load natural image dimensions
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Monitor container size
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
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        dispatch({ type: 'CANCEL' });
      } else if (e.key === 'Enter') {
        if (state.tool === 'polygon' && state.draft?.type === 'polygon') {
          dispatch({ type: 'POLY_CLOSE' });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selected) {
          dispatch({ type: 'DELETE_SELECTED' });
          e.preventDefault();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.tool, state.draft, state.selected, dispatch]);

  // Screen point to normalized helper
  const getNormPoint = (e: React.PointerEvent<HTMLDivElement>): Point | null => {
    if (!containerRef.current || !imageSize) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return screenToNormalized(screenPt, containerSize, imageSize, viewport);
  };

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageSize) return;

    // Middle click or space+click initiates pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return; // left click only for drawing

    const normPt = getNormPoint(e);
    if (!normPt) return;

    // Test Click mode
    if (testClickMode) {
      const activeSub = subQuestions.find((s) => s.id === state.activeSubId);
      const activeRegions = state.regions[state.activeSubId || ''] || [];
      const hit = activeRegions.some((reg) => pointInRegion(normPt, reg));
      setTestResult({
        hit,
        point: normPt,
        activeTitle: activeSub?.prompt || state.activeSubId || 'السؤال الحالي',
      });
      return;
    }

    // Normal drawing / selecting
    if (state.tool === 'select') {
      // Check if clicked inside any existing region
      let foundSelection: { subId: string; index: number } | null = null;
      // Search active subId regions first
      if (state.activeSubId && state.regions[state.activeSubId]) {
        state.regions[state.activeSubId].forEach((reg, i) => {
          if (pointInRegion(normPt, reg)) {
            foundSelection = { subId: state.activeSubId!, index: i };
          }
        });
      }
      // Then other subIds
      if (!foundSelection) {
        for (const [sId, rList] of Object.entries(state.regions)) {
          ((rList as Region[]) || []).forEach((reg, i) => {
            if (pointInRegion(normPt, reg)) {
              foundSelection = { subId: sId, index: i };
            }
          });
          if (foundSelection) break;
        }
      }

      if (foundSelection) {
        dispatch({ type: 'SELECT', subId: (foundSelection as any).subId, index: (foundSelection as any).index });
        dispatch({ type: 'SET_ACTIVE', subId: (foundSelection as any).subId });
      } else {
        dispatch({ type: 'SELECT', subId: null, index: null });
      }
      return;
    }

    // Drawing tool
    dispatch({ type: 'POINTER_DOWN', point: normPt });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Handling pan
    if (isPanningRef.current && panStartRef.current && imageSize) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setViewport((prev) => panBy(prev, dx, dy, containerSize, imageSize));
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handling vertex drag
    if (dragVertex) {
      const normPt = getNormPoint(e);
      if (normPt) {
        dispatch({
          type: 'MOVE_VERTEX',
          subId: dragVertex.subId,
          index: dragVertex.index,
          vertex: dragVertex.vertex,
          point: normPt,
        });
      }
      return;
    }

    if (testClickMode) return;

    // Handling draft drawing move
    if (state.draft) {
      const normPt = getNormPoint(e);
      if (normPt) {
        dispatch({ type: 'POINTER_MOVE', point: normPt });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (dragVertex) {
      setDragVertex(null);
      return;
    }

    if (testClickMode) return;

    if (state.draft && (state.draft.type === 'rect' || state.draft.type === 'ellipse')) {
      const normPt = getNormPoint(e);
      if (normPt) {
        dispatch({ type: 'POINTER_UP', point: normPt });
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current || !imageSize) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const centerScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setViewport((prev) => zoomAt(prev, factor, centerScreen, containerSize, imageSize));
  };

  const handleZoomIn = () => {
    if (!imageSize) return;
    setViewport((prev) =>
      zoomAt(prev, 1.3, { x: containerSize.width / 2, y: containerSize.height / 2 }, containerSize, imageSize)
    );
  };

  const handleZoomOut = () => {
    if (!imageSize) return;
    setViewport((prev) =>
      zoomAt(prev, 0.77, { x: containerSize.width / 2, y: containerSize.height / 2 }, containerSize, imageSize)
    );
  };

  const handleResetZoom = () => {
    setViewport({ scale: 1, x: 0, y: 0 });
  };

  // Active selected region details
  const selectedRegion: Region | null =
    state.selected && state.regions[state.selected.subId]?.[state.selected.index]
      ? state.regions[state.selected.subId][state.selected.index]
      : null;

  // Active sub question styling
  const activeSubIndex = subQuestions.findIndex((s) => s.id === state.activeSubId);
  const activeStyle = SUB_COLORS[(activeSubIndex >= 0 ? activeSubIndex : 0) % SUB_COLORS.length];

  // Base fitted rect for image inside container
  const baseFit = imageSize && containerSize.width > 0 ? fitRect(containerSize, imageSize) : null;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Canvas Toolbar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_TOOL', tool: 'select' })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              state.tool === 'select' && !testClickMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="تحديد النطاقات وتعديلها (Select)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>تحديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (testClickMode) onToggleTestClickMode();
              dispatch({ type: 'SET_TOOL', tool: 'rect' });
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              state.tool === 'rect' && !testClickMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="رسم مستطيل (Rectangle)"
          >
            <Square className="w-3.5 h-3.5" />
            <span>مستطيل</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (testClickMode) onToggleTestClickMode();
              dispatch({ type: 'SET_TOOL', tool: 'ellipse' });
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              state.tool === 'ellipse' && !testClickMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="رسم شكل بيضاوي (Ellipse)"
          >
            <Circle className="w-3.5 h-3.5" />
            <span>بيضاوي</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (testClickMode) onToggleTestClickMode();
              dispatch({ type: 'SET_TOOL', tool: 'polygon' });
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              state.tool === 'polygon' && !testClickMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="رسم مضلع حر بالنقاط (Polygon)"
          >
            <Hexagon className="w-3.5 h-3.5" />
            <span>مضلع</span>
          </button>
        </div>

        {/* History & Edit Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={state.past.length === 0}
            onClick={() => dispatch({ type: 'UNDO' })}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="تراجع (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={state.future.length === 0}
            onClick={() => dispatch({ type: 'REDO' })}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="إعادة (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={!state.selected}
            onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="حذف النطاق المحدد (Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Test Click Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTestClickMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              testClickMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="اختبار النقر على النطاقات المرسومة"
          >
            <Target className="w-3.5 h-3.5" />
            <span>اختبر النقر</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="تكبير"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-500 px-1">
            {Math.round(viewport.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="تصغير"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="إعادة ضبط المقياس"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Region Tolerance Bar (if selected) */}
      {selectedRegion && state.selected && (
        <div className="px-4 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold">
              هامش سماحية النقر (Tolerance) للنطاق المحدد:
            </span>
            <span className="font-mono font-bold text-blue-700">
              {((selectedRegion.tolerance ?? 0.01) * 100).toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={(selectedRegion.tolerance ?? 0.01) * 100}
              onChange={(e) => {
                const val = parseFloat(e.target.value) / 100;
                dispatch({
                  type: 'SET_TOLERANCE',
                  subId: state.selected!.subId,
                  index: state.selected!.index,
                  value: val,
                });
              }}
              className="w-36 accent-blue-600 cursor-pointer"
            />
            <span className="text-[10px] text-blue-600">
              (يزيد من نطاق قبول نقرات الطلاب)
            </span>
          </div>
        </div>
      )}

      {/* Test Click Feedback Toast (if active) */}
      {testClickMode && testResult && (
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-xs font-bold transition-all ${
            testResult.hit
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.hit ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-amber-600" />
            )}
            <span>
              {testResult.hit
                ? `✅ النقر داخل النطاق المحدد للسؤال: "${testResult.activeTitle}"`
                : `❌ النقر خارج نطاقات السؤال: "${testResult.activeTitle}"`}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            x: {Math.round(testResult.point.x * 100)}%, y: {Math.round(testResult.point.y * 100)}%
          </span>
        </div>
      )}

      {/* Polygon Draft Instruction Bar */}
      {state.tool === 'polygon' && state.draft?.type === 'polygon' && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <span>
            نقاط المضلع الحالية: {state.draft.points.length}. انقر لإضافة نقاط، واضغط{' '}
            <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px]">
              Enter
            </kbd>{' '}
            للإغلاق (يتطلب 3 نقاط على الأقل)، أو{' '}
            <kbd className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px]">
              Esc
            </kbd>{' '}
            للإلغاء.
          </span>
          {state.draft.points.length >= 3 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'POLY_CLOSE' })}
              className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px] font-bold"
            >
              إغلاق المضلع الآن
            </button>
          )}
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`relative w-full h-[480px] bg-slate-900 select-none overflow-hidden touch-none cursor-${
          testClickMode
            ? 'crosshair'
            : state.tool === 'select'
            ? 'default'
            : 'crosshair'
        }`}
      >
        {imageUrl ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              transformOrigin: '0 0',
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            }}
          >
            {/* The Image */}
            <img
              src={imageUrl}
              alt="Diagram"
              draggable={false}
              className="absolute pointer-events-none select-none max-w-none"
              style={
                baseFit
                  ? {
                      left: `${baseFit.x}px`,
                      top: `${baseFit.y}px`,
                      width: `${baseFit.width}px`,
                      height: `${baseFit.height}px`,
                    }
                  : { width: '100%', height: '100%', objectFit: 'contain' }
              }
            />

            {/* SVG Overlays */}
            {baseFit && (
              <svg
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {/* Defs for Layer Pattern distinctions */}
                <defs>
                  <pattern id="diag-stripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#2563eb" strokeWidth="1.5" strokeOpacity="0.4" />
                  </pattern>
                  <pattern id="dot-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
                    <circle cx="3" cy="3" r="1" fill="#059669" fillOpacity="0.5" />
                  </pattern>
                </defs>

                {/* Render Existing Saved Regions for All Sub-Questions */}
                {Object.entries(state.regions).map(([subId, list]) => {
                  const sIdx = subQuestions.findIndex((s) => s.id === subId);
                  const style = SUB_COLORS[(sIdx >= 0 ? sIdx : 0) % SUB_COLORS.length];
                  const isActiveSub = subId === state.activeSubId;

                  return ((list as Region[]) || []).map((reg, rIdx) => {
                    const isSelected =
                      state.selected?.subId === subId && state.selected?.index === rIdx;
                    const stroke = isSelected ? '#ffffff' : style.stroke;
                    const strokeWidth = isSelected ? 3.5 : isActiveSub ? 2.5 : 1.5;
                    const fill = isSelected ? 'rgba(255, 255, 255, 0.35)' : isActiveSub ? style.fill : 'rgba(150, 150, 150, 0.15)';
                    const dash = isSelected ? '' : style.dash;

                    if (reg.type === 'ellipse') {
                      const cx = baseFit.x + reg.cx * baseFit.width;
                      const cy = baseFit.y + reg.cy * baseFit.height;
                      const rx = reg.rx * baseFit.width;
                      const ry = reg.ry * baseFit.height;
                      return (
                        <g key={`${subId}-${rIdx}`}>
                          <ellipse
                            cx={cx}
                            cy={cy}
                            rx={rx}
                            ry={ry}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            fill={fill}
                            strokeDasharray={dash}
                          />
                          {/* Label tag */}
                          <text
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                          >
                            س{sIdx + 1}
                          </text>
                        </g>
                      );
                    }

                    if (reg.type === 'rect') {
                      const r = reg as RectRegion;
                      const x = baseFit.x + r.x * baseFit.width;
                      const y = baseFit.y + r.y * baseFit.height;
                      const w = r.w * baseFit.width;
                      const h = r.h * baseFit.height;
                      return (
                        <g key={`${subId}-${rIdx}`}>
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            fill={fill}
                            strokeDasharray={dash}
                            rx="4"
                          />
                          <text
                            x={x + w / 2}
                            y={y + h / 2}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                          >
                            س{sIdx + 1}
                          </text>
                        </g>
                      );
                    }

                    if (reg.type === 'polygon' && reg.points.length >= 3) {
                      const ptsStr = reg.points
                        .map((p) => `${baseFit.x + p.x * baseFit.width},${baseFit.y + p.y * baseFit.height}`)
                        .join(' ');
                      const cx =
                        baseFit.x +
                        (reg.points.reduce((acc, p) => acc + p.x, 0) / reg.points.length) * baseFit.width;
                      const cy =
                        baseFit.y +
                        (reg.points.reduce((acc, p) => acc + p.y, 0) / reg.points.length) * baseFit.height;

                      return (
                        <g key={`${subId}-${rIdx}`}>
                          <polygon
                            points={ptsStr}
                            stroke={stroke}
                            strokeWidth={strokeWidth}
                            fill={fill}
                            strokeDasharray={dash}
                          />
                          <text
                            x={cx}
                            y={cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                          >
                            س{sIdx + 1}
                          </text>
                          {/* Vertex drag handles if polygon is selected */}
                          {isSelected &&
                            reg.points.map((p, vIdx) => {
                              const vx = baseFit.x + p.x * baseFit.width;
                              const vy = baseFit.y + p.y * baseFit.height;
                              return (
                                <circle
                                  key={`v-${vIdx}`}
                                  cx={vx}
                                  cy={vy}
                                  r="6"
                                  fill="#3b82f6"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  style={{ pointerEvents: 'auto', cursor: 'move' }}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setDragVertex({ subId, index: rIdx, vertex: vIdx });
                                  }}
                                />
                              );
                            })}
                        </g>
                      );
                    }

                    return null;
                  });
                })}

                {/* Render Current In-Progress Draft */}
                {state.draft && (
                  <g>
                    {state.draft.type === 'rect' && (
                      <rect
                        x={baseFit.x + Math.min(state.draft.start.x, state.draft.current.x) * baseFit.width}
                        y={baseFit.y + Math.min(state.draft.start.y, state.draft.current.y) * baseFit.height}
                        width={Math.abs(state.draft.current.x - state.draft.start.x) * baseFit.width}
                        height={Math.abs(state.draft.current.y - state.draft.start.y) * baseFit.height}
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                        fill="rgba(96, 165, 250, 0.3)"
                        strokeDasharray="4 2"
                        rx="4"
                      />
                    )}

                    {state.draft.type === 'ellipse' && (
                      <ellipse
                        cx={
                          baseFit.x +
                          ((state.draft.start.x + state.draft.current.x) / 2) * baseFit.width
                        }
                        cy={
                          baseFit.y +
                          ((state.draft.start.y + state.draft.current.y) / 2) * baseFit.height
                        }
                        rx={(Math.abs(state.draft.current.x - state.draft.start.x) / 2) * baseFit.width}
                        ry={(Math.abs(state.draft.current.y - state.draft.start.y) / 2) * baseFit.height}
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                        fill="rgba(96, 165, 250, 0.3)"
                        strokeDasharray="4 2"
                      />
                    )}

                    {state.draft.type === 'polygon' && (
                      <>
                        {/* Connecting lines */}
                        {state.draft.points.map((p, idx) => {
                          const px = baseFit.x + p.x * baseFit.width;
                          const py = baseFit.y + p.y * baseFit.height;
                          const next = state.draft.type === 'polygon' ? state.draft.points[idx + 1] : undefined;

                          return (
                            <React.Fragment key={`p-${idx}`}>
                              {next && (
                                <line
                                  x1={px}
                                  y1={py}
                                  x2={baseFit.x + next.x * baseFit.width}
                                  y2={baseFit.y + next.y * baseFit.height}
                                  stroke="#60a5fa"
                                  strokeWidth="2"
                                />
                              )}
                              <circle cx={px} cy={py} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                            </React.Fragment>
                          );
                        })}

                        {/* Line to current pointer preview */}
                        {state.draft.previewPoint && state.draft.points.length > 0 && (
                          <line
                            x1={
                              baseFit.x +
                              state.draft.points[state.draft.points.length - 1].x * baseFit.width
                            }
                            y1={
                              baseFit.y +
                              state.draft.points[state.draft.points.length - 1].y * baseFit.height
                            }
                            x2={baseFit.x + state.draft.previewPoint.x * baseFit.width}
                            y2={baseFit.y + state.draft.previewPoint.y * baseFit.height}
                            stroke="#60a5fa"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                        )}
                      </>
                    )}
                  </g>
                )}

                {/* Test Click Pulse Dot */}
                {testClickMode && testResult && (
                  <circle
                    cx={baseFit.x + testResult.point.x * baseFit.width}
                    cy={baseFit.y + testResult.point.y * baseFit.height}
                    r="8"
                    fill={testResult.hit ? '#10b981' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="animate-ping"
                  />
                )}
              </svg>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Layers className="w-8 h-8 opacity-40" />
            <p className="text-xs">الرجاء اختيار رسم توضيحي لعرضه في لوحة المحرر</p>
          </div>
        )}
      </div>

      {/* Footer Instructions and Layer Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            {state.tool === 'select'
              ? 'انقر على أي نطاق لتحديده وتعديل سماحيته أو حذفه.'
              : state.tool === 'polygon'
              ? 'انقر لإضافة نقاط المضلع، واضغط Enter للإغلاق.'
              : 'اسحب بالمؤشر لتحديد النطاق الصحيح على الرسم.'}
          </span>
        </div>

        {/* Sub-Questions Layers Legend */}
        <div className="flex items-center gap-2">
          {subQuestions.map((sq, i) => {
            const style = SUB_COLORS[i % SUB_COLORS.length];
            const count = (state.regions[sq.id] || []).length;
            const isActive = sq.id === state.activeSubId;

            return (
              <button
                key={sq.id}
                type="button"
                onClick={() => dispatch({ type: 'SET_ACTIVE', subId: sq.id })}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white border-2 shadow-xs'
                    : 'bg-slate-100 hover:bg-white text-slate-600'
                }`}
                style={{ borderColor: isActive ? style.stroke : undefined }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: style.stroke }}
                />
                <span>س{i + 1}</span>
                <span className="text-[10px] text-slate-400 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
