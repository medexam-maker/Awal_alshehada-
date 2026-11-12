/**
 * Region Editor State Machine (CR-2026-11-08 — Visual Mastery Lab, Phase B2)
 * Pure reducer: no DOM, no mutation, points normalized 0..1.
 */
import { Point, Region, RectRegion, EllipseRegion, PolygonRegion } from '../../shared/regionGeometry';

export type EditorTool = 'select' | 'rect' | 'ellipse' | 'polygon';

export interface DraftRectOrEllipse {
  type: 'rect' | 'ellipse';
  start: Point;
  current: Point;
}

export interface DraftPolygon {
  type: 'polygon';
  points: Point[];
  previewPoint?: Point | null;
}

export type DraftRegion = DraftRectOrEllipse | DraftPolygon;

export interface SelectedRegion {
  subId: string;
  index: number;
}

export interface EditorState {
  tool: EditorTool;
  activeSubId: string | null;
  regions: Record<string, Region[]>;
  draft: DraftRegion | null;
  selected: SelectedRegion | null;
  past: Record<string, Region[]>[];
  future: Record<string, Region[]>[];
}

export type EditorAction =
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_ACTIVE'; subId: string | null }
  | { type: 'POINTER_DOWN'; point: Point }
  | { type: 'POINTER_MOVE'; point: Point }
  | { type: 'POINTER_UP'; point: Point }
  | { type: 'POLY_CLOSE' }
  | { type: 'CANCEL' }
  | { type: 'SELECT'; subId: string | null; index: number | null }
  | { type: 'DELETE_SELECTED' }
  | { type: 'MOVE_VERTEX'; subId: string; index: number; vertex: number; point: Point }
  | { type: 'SET_TOLERANCE'; subId: string; index: number; value: number }
  | { type: 'REMOVE_SUB'; subId: string }
  | { type: 'RESET_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface Issue {
  subId: string;
  code: 'NO_REGION';
}

function cloneRegions(regions: Record<string, Region[]>): Record<string, Region[]> {
  const next: Record<string, Region[]> = {};
  for (const key of Object.keys(regions)) {
    next[key] = regions[key].map((r) => {
      if (r.type === 'polygon') {
        return {
          ...r,
          points: r.points.map((p) => ({ x: p.x, y: p.y })),
        };
      }
      return { ...r };
    });
  }
  return next;
}

function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

function isValidPoint(p: unknown): p is Point {
  if (!p || typeof p !== 'object') return false;
  const pt = p as { x?: unknown; y?: unknown };
  return typeof pt.x === 'number' && Number.isFinite(pt.x) && typeof pt.y === 'number' && Number.isFinite(pt.y);
}

function clampPoint(p: Point): Point {
  return {
    x: clamp(p.x, 0, 1),
    y: clamp(p.y, 0, 1),
  };
}

export function initialEditorState(initialRegions?: Record<string, Region[]>): EditorState {
  return {
    tool: 'select',
    activeSubId: null,
    regions: initialRegions ? cloneRegions(initialRegions) : {},
    draft: null,
    selected: null,
    past: [],
    future: [],
  };
}

export function editorReducer(state: EditorState, action: unknown): EditorState {
  if (!action || typeof action !== 'object' || !('type' in action)) {
    return state;
  }

  const act = action as EditorAction;

  switch (act.type) {
    case 'SET_TOOL': {
      if (act.tool === state.tool && state.draft === null) return state;
      return {
        ...state,
        tool: act.tool,
        draft: null, // switching tool cancels draft
      };
    }

    case 'SET_ACTIVE': {
      if (act.subId === state.activeSubId && state.draft === null) return state;
      return {
        ...state,
        activeSubId: act.subId,
        draft: null, // switching active sub cancels draft
      };
    }

    case 'CANCEL': {
      if (!state.draft) return state;
      return {
        ...state,
        draft: null,
      };
    }

    case 'REMOVE_SUB': {
      const { subId } = act;
      if (!subId || !state.regions[subId]) return state;

      const nextRegions = cloneRegions(state.regions);
      delete nextRegions[subId];

      const nextActive = state.activeSubId === subId ? null : state.activeSubId;
      const nextSelected = state.selected?.subId === subId ? null : state.selected;

      return {
        ...state,
        regions: nextRegions,
        activeSubId: nextActive,
        selected: nextSelected,
        draft: null,
        past: [...state.past, cloneRegions(state.regions)],
        future: [],
      };
    }

    case 'POINTER_DOWN': {
      if (!state.activeSubId) return state;
      if (!isValidPoint(act.point)) return state;
      const pt = clampPoint(act.point);

      if (state.tool === 'rect' || state.tool === 'ellipse') {
        return {
          ...state,
          draft: {
            type: state.tool,
            start: pt,
            current: pt,
          },
        };
      }

      if (state.tool === 'polygon') {
        if (!state.draft || state.draft.type !== 'polygon') {
          return {
            ...state,
            draft: {
              type: 'polygon',
              points: [pt],
              previewPoint: pt,
            },
          };
        }

        const last = state.draft.points[state.draft.points.length - 1];
        if (last && Math.abs(last.x - pt.x) < 1e-6 && Math.abs(last.y - pt.y) < 1e-6) {
          return state; // ignore repeated identical point
        }

        return {
          ...state,
          draft: {
            ...state.draft,
            points: [...state.draft.points, pt],
            previewPoint: pt,
          },
        };
      }

      return state;
    }

    case 'POINTER_MOVE': {
      if (!state.draft) return state;
      if (!isValidPoint(act.point)) return state;
      const pt = clampPoint(act.point);

      if (state.draft.type === 'rect' || state.draft.type === 'ellipse') {
        return {
          ...state,
          draft: {
            ...state.draft,
            current: pt,
          },
        };
      }

      if (state.draft.type === 'polygon') {
        return {
          ...state,
          draft: {
            ...state.draft,
            previewPoint: pt,
          },
        };
      }

      return state;
    }

    case 'POINTER_UP': {
      if (!state.draft || !state.activeSubId) return state;
      if (!isValidPoint(act.point)) return state;
      const pt = clampPoint(act.point);

      if (state.draft.type === 'rect' || state.draft.type === 'ellipse') {
        const start = state.draft.start;
        const end = pt;
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);

        // Tiny drag (< 0.01 in either direction) is discarded without touching history
        if (dx < 0.01 || dy < 0.01) {
          return {
            ...state,
            draft: null,
          };
        }

        let newRegion: Region;
        if (state.draft.type === 'rect') {
          const rect: RectRegion = {
            type: 'rect',
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            w: dx,
            h: dy,
          };
          newRegion = rect;
        } else {
          const minX = Math.min(start.x, end.x);
          const maxX = Math.max(start.x, end.x);
          const minY = Math.min(start.y, end.y);
          const maxY = Math.max(start.y, end.y);
          const ellipse: EllipseRegion = {
            type: 'ellipse',
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            rx: dx / 2,
            ry: dy / 2,
          };
          newRegion = ellipse;
        }

        const subId = state.activeSubId;
        const existingList = state.regions[subId] || [];
        const nextList = [...existingList, newRegion];
        const nextRegions = {
          ...state.regions,
          [subId]: nextList,
        };

        return {
          ...state,
          regions: nextRegions,
          draft: null,
          selected: { subId, index: existingList.length },
          past: [...state.past, cloneRegions(state.regions)],
          future: [],
        };
      }

      return state;
    }

    case 'POLY_CLOSE': {
      if (!state.draft || state.draft.type !== 'polygon' || !state.activeSubId) return state;
      if (state.draft.points.length < 3) return state; // must not close with < 3 points

      const poly: PolygonRegion = {
        type: 'polygon',
        points: state.draft.points.map((p) => ({ x: p.x, y: p.y })),
      };

      const subId = state.activeSubId;
      const existingList = state.regions[subId] || [];
      const nextList = [...existingList, poly];
      const nextRegions = {
        ...state.regions,
        [subId]: nextList,
      };

      return {
        ...state,
        regions: nextRegions,
        draft: null,
        selected: { subId, index: existingList.length },
        past: [...state.past, cloneRegions(state.regions)],
        future: [],
      };
    }

    case 'SELECT': {
      if (!act.subId || act.index === null || act.index === undefined) {
        return { ...state, selected: null };
      }
      const list = state.regions[act.subId];
      if (!list || act.index < 0 || act.index >= list.length) {
        return { ...state, selected: null };
      }
      return {
        ...state,
        selected: { subId: act.subId, index: act.index },
      };
    }

    case 'DELETE_SELECTED': {
      if (!state.selected) return state;
      const { subId, index } = state.selected;
      const list = state.regions[subId];
      if (!list || index < 0 || index >= list.length) {
        return { ...state, selected: null };
      }

      const nextList = list.filter((_, i) => i !== index);
      const nextRegions = {
        ...state.regions,
        [subId]: nextList,
      };

      return {
        ...state,
        regions: nextRegions,
        selected: null,
        past: [...state.past, cloneRegions(state.regions)],
        future: [],
      };
    }

    case 'MOVE_VERTEX': {
      const { subId, index, vertex, point } = act;
      if (!isValidPoint(point)) return state;
      const list = state.regions[subId];
      if (!list || index < 0 || index >= list.length) return state;
      const target = list[index];
      if (target.type !== 'polygon') return state;
      if (vertex < 0 || vertex >= target.points.length) return state;

      const clamped = clampPoint(point);
      const nextPoints = target.points.map((p, i) => (i === vertex ? clamped : { x: p.x, y: p.y }));
      const nextTarget: PolygonRegion = { ...target, points: nextPoints };
      const nextList = list.map((r, i) => (i === index ? nextTarget : r));
      const nextRegions = {
        ...state.regions,
        [subId]: nextList,
      };

      return {
        ...state,
        regions: nextRegions,
        past: [...state.past, cloneRegions(state.regions)],
        future: [],
      };
    }

    case 'SET_TOLERANCE': {
      const { subId, index, value } = act;
      if (typeof value !== 'number' || !Number.isFinite(value)) return state;
      const list = state.regions[subId];
      if (!list || index < 0 || index >= list.length) return state;
      const target = list[index];

      const clampedTol = clamp(value, 0, 0.1);
      const nextTarget = { ...target, tolerance: clampedTol };
      const nextList = list.map((r, i) => (i === index ? nextTarget : r));
      const nextRegions = {
        ...state.regions,
        [subId]: nextList,
      };

      return {
        ...state,
        regions: nextRegions,
        past: [...state.past, cloneRegions(state.regions)],
        future: [],
      };
    }

    case 'RESET_ALL': {
      return {
        ...state,
        regions: {},
        draft: null,
        selected: null,
        past: [],
        future: [],
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const nextPast = state.past.slice(0, -1);
      const nextFuture = [cloneRegions(state.regions), ...state.future];

      return {
        ...state,
        regions: previous,
        draft: null,
        selected: null,
        past: nextPast,
        future: nextFuture,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const nextFuture = state.future.slice(1);
      const nextPast = [...state.past, cloneRegions(state.regions)];

      return {
        ...state,
        regions: next,
        draft: null,
        selected: null,
        past: nextPast,
        future: nextFuture,
      };
    }

    default:
      return state;
  }
}

export function toKey(state: EditorState): Record<string, { regions: Region[] }> {
  const result: Record<string, { regions: Region[] }> = {};
  for (const [subId, list] of Object.entries(state.regions)) {
    if (list && list.length > 0) {
      result[subId] = {
        regions: list.map((r) => {
          if (r.type === 'polygon') {
            return {
              ...r,
              points: r.points.map((p) => ({ x: p.x, y: p.y })),
            };
          }
          return { ...r };
        }),
      };
    }
  }
  return result;
}

export function issues(state: EditorState, subQuestions: Array<{ id: string; kind: string }>): Issue[] {
  const res: Issue[] = [];
  for (const sq of subQuestions) {
    if (sq.kind === 'locate') {
      const list = state.regions[sq.id];
      if (!list || list.length === 0) {
        res.push({ subId: sq.id, code: 'NO_REGION' });
      }
    }
  }
  return res;
}
