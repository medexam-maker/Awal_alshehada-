/**
 * Region Geometry for Diagram Labeling (C2 — Visual Mastery Lab)
 * Normalized coordinates (0..1) on x and y.
 * Supported geometries: ellipse, rect, polygon.
 * Optional tolerance (0..0.1, default 0.01).
 */

export interface Point {
  x: number;
  y: number;
}

export interface EllipseRegion {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tolerance?: number;
}

export interface RectRegion {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  tolerance?: number;
}

export interface PolygonRegion {
  type: 'polygon';
  points: Point[];
  tolerance?: number;
}

export type Region = EllipseRegion | RectRegion | PolygonRegion;

export interface RegionValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a Region object conforms to canonical constraints:
 * - Normalized 0..1 coordinates
 * - rx/ry/w/h > 0
 * - tolerance in [0, 0.1]
 * - polygon points length >= 3
 */
export function validateRegion(region: unknown): RegionValidationResult {
  if (!region || typeof region !== 'object') {
    return { valid: false, error: 'Region must be a non-null object' };
  }

  const r = region as Record<string, unknown>;

  if (r.tolerance !== undefined) {
    if (typeof r.tolerance !== 'number' || !Number.isFinite(r.tolerance) || r.tolerance < 0 || r.tolerance > 0.1) {
      return { valid: false, error: 'Tolerance must be a finite number between 0 and 0.1' };
    }
  }

  if (r.type === 'ellipse') {
    const { cx, cy, rx, ry } = r;
    if (
      typeof cx !== 'number' || !Number.isFinite(cx) || cx < 0 || cx > 1 ||
      typeof cy !== 'number' || !Number.isFinite(cy) || cy < 0 || cy > 1
    ) {
      return { valid: false, error: 'Ellipse center (cx, cy) must be normalized coordinates in [0, 1]' };
    }
    if (
      typeof rx !== 'number' || !Number.isFinite(rx) || rx <= 0 || rx > 1 ||
      typeof ry !== 'number' || !Number.isFinite(ry) || ry <= 0 || ry > 1
    ) {
      return { valid: false, error: 'Ellipse radii (rx, ry) must be positive finite numbers <= 1' };
    }
    return { valid: true };
  }

  if (r.type === 'rect') {
    const { x, y, w, h } = r;
    if (
      typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1 ||
      typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1
    ) {
      return { valid: false, error: 'Rectangle origin (x, y) must be normalized coordinates in [0, 1]' };
    }
    if (
      typeof w !== 'number' || !Number.isFinite(w) || w <= 0 ||
      typeof h !== 'number' || !Number.isFinite(h) || h <= 0
    ) {
      return { valid: false, error: 'Rectangle width and height (w, h) must be positive finite numbers' };
    }
    if (x + w > 1 || y + h > 1) {
      return { valid: false, error: 'Rectangle exceeds normalized boundary [0, 1]' };
    }
    return { valid: true };
  }

  if (r.type === 'polygon') {
    if (!Array.isArray(r.points) || r.points.length < 3) {
      return { valid: false, error: 'Polygon must have at least 3 points' };
    }
    for (let i = 0; i < r.points.length; i++) {
      const p = r.points[i];
      if (
        !p || typeof p !== 'object' ||
        typeof p.x !== 'number' || !Number.isFinite(p.x) || p.x < 0 || p.x > 1 ||
        typeof p.y !== 'number' || !Number.isFinite(p.y) || p.y < 0 || p.y > 1
      ) {
        return { valid: false, error: `Polygon point at index ${i} is not a valid normalized coordinate in [0, 1]` };
      }
    }
    return { valid: true };
  }

  return { valid: false, error: `Unsupported region type: ${String(r.type)}` };
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function isPointInPolygonDirect(p: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether a given normalized point (x, y) falls inside the specified region,
 * taking into account the region's tolerance (default: 0.01).
 * Never throws on invalid points or regions (returns false).
 */
export function pointInRegion(point: unknown, region: unknown): boolean {
  if (!point || typeof point !== 'object') return false;
  const p = point as { x?: unknown; y?: unknown };
  if (
    typeof p.x !== 'number' || !Number.isFinite(p.x) || p.x < 0 || p.x > 1 ||
    typeof p.y !== 'number' || !Number.isFinite(p.y) || p.y < 0 || p.y > 1
  ) {
    return false;
  }

  const validRes = validateRegion(region);
  if (!validRes.valid) return false;

  const r = region as Region;
  const tol = typeof r.tolerance === 'number' ? r.tolerance : 0.01;
  const pt: Point = { x: p.x, y: p.y };

  if (r.type === 'ellipse') {
    const rxTol = r.rx + tol;
    const ryTol = r.ry + tol;
    const dx = pt.x - r.cx;
    const dy = pt.y - r.cy;
    return (dx / rxTol) ** 2 + (dy / ryTol) ** 2 <= 1;
  }

  if (r.type === 'rect') {
    const minX = r.x - tol;
    const maxX = r.x + r.w + tol;
    const minY = r.y - tol;
    const maxY = r.y + r.h + tol;
    return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
  }

  if (r.type === 'polygon') {
    if (isPointInPolygonDirect(pt, r.points)) {
      return true;
    }
    if (tol > 0) {
      for (let i = 0, j = r.points.length - 1; i < r.points.length; j = i++) {
        if (distToSegment(pt, r.points[i], r.points[j]) <= tol) {
          return true;
        }
      }
    }
    return false;
  }

  return false;
}
