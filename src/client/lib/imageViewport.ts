/**
 * VISUAL MASTERY LAB — Viewport math pure functions for diagram labeler & student renderer.
 * All screen points are relative to top-left of interactive container (CSS px).
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * Calculates the bounding box of an image fitted into container via object-fit: contain.
 */
export function fitRect(container: Size, image: Size): Rect {
  if (
    !container ||
    !image ||
    !Number.isFinite(container.width) ||
    !Number.isFinite(container.height) ||
    !Number.isFinite(image.width) ||
    !Number.isFinite(image.height) ||
    container.width <= 0 ||
    container.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const cAspect = container.width / container.height;
  const iAspect = image.width / image.height;

  let width = 0;
  let height = 0;
  let x = 0;
  let y = 0;

  if (iAspect > cAspect) {
    width = container.width;
    height = container.width / iAspect;
    x = 0;
    y = (container.height - height) / 2;
  } else {
    height = container.height;
    width = container.height * iAspect;
    x = (container.width - width) / 2;
    y = 0;
  }

  return { x, y, width, height };
}

/**
 * Converts container screen coordinates (px) to normalized 0..1 image coordinates.
 * Returns null if screenPoint is null/invalid or falls in letterbox area outside the image.
 */
export function screenToNormalized(
  screenPoint: Point | null | undefined,
  container: Size,
  image: Size,
  viewport: Viewport
): Point | null {
  if (
    !screenPoint ||
    !Number.isFinite(screenPoint.x) ||
    !Number.isFinite(screenPoint.y) ||
    !viewport ||
    !Number.isFinite(viewport.scale) ||
    viewport.scale <= 0 ||
    !Number.isFinite(viewport.tx) ||
    !Number.isFinite(viewport.ty)
  ) {
    return null;
  }

  const base = fitRect(container, image);
  if (base.width <= 0 || base.height <= 0) {
    return null;
  }

  // Base container px before scale/tx/ty
  const bx = (screenPoint.x - viewport.tx) / viewport.scale;
  const by = (screenPoint.y - viewport.ty) / viewport.scale;

  const normX = (bx - base.x) / base.width;
  const normY = (by - base.y) / base.height;

  const eps = 1e-7;
  if (normX < -eps || normX > 1 + eps || normY < -eps || normY > 1 + eps) {
    return null;
  }

  const clampedX = Math.max(0, Math.min(1, normX));
  const clampedY = Math.max(0, Math.min(1, normY));

  return { x: clampedX, y: clampedY };
}

/**
 * Converts normalized 0..1 image coordinates to container screen coordinates (px).
 */
export function normalizedToScreen(
  normPoint: Point,
  container: Size,
  image: Size,
  viewport: Viewport
): Point {
  const base = fitRect(container, image);
  const bx = base.x + normPoint.x * base.width;
  const by = base.y + normPoint.y * base.height;

  const screenX = viewport.scale * bx + viewport.tx;
  const screenY = viewport.scale * by + viewport.ty;

  return { x: screenX, y: screenY };
}

/**
 * Clamps scale to [1, maxScale] and translation to keep container covered.
 */
export function clampViewport(
  viewport: Viewport,
  container: Size,
  image: Size,
  options?: { maxScale?: number }
): Viewport {
  if (!viewport || !Number.isFinite(viewport.scale)) {
    return { scale: 1, tx: 0, ty: 0 };
  }

  const maxScale = options?.maxScale ?? 4;
  const scale = Math.max(1, Math.min(maxScale, viewport.scale));

  if (scale === 1) {
    return { scale: 1, tx: 0, ty: 0 };
  }

  const minTx = -(scale - 1) * (container?.width || 0);
  const maxTx = 0;

  const minTy = -(scale - 1) * (container?.height || 0);
  const maxTy = 0;

  const tx = Math.max(minTx, Math.min(maxTx, Number.isFinite(viewport.tx) ? viewport.tx : 0));
  const ty = Math.max(minTy, Math.min(maxTy, Number.isFinite(viewport.ty) ? viewport.ty : 0));

  return { scale, tx, ty };
}

/**
 * Zooms viewport by scale factor around an anchor point in container screen coordinates.
 */
export function zoomAt(
  viewport: Viewport,
  factor: number,
  anchor: Point,
  container: Size,
  image: Size,
  options?: { maxScale?: number }
): Viewport {
  if (
    !viewport ||
    !Number.isFinite(viewport.scale) ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    !anchor ||
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y)
  ) {
    return viewport;
  }

  const targetScale = viewport.scale * factor;
  const maxScale = options?.maxScale ?? 4;
  const clampedScale = Math.max(1, Math.min(maxScale, targetScale));

  if (clampedScale === viewport.scale) {
    return viewport;
  }

  // Anchor point fixed in image space
  const s1 = viewport.scale;
  const s2 = clampedScale;

  const tx2 = anchor.x - (s2 / s1) * (anchor.x - viewport.tx);
  const ty2 = anchor.y - (s2 / s1) * (anchor.y - viewport.ty);

  return clampViewport({ scale: s2, tx: tx2, ty: ty2 }, container, image, options);
}

/**
 * Pans viewport by (dx, dy) in container screen pixels.
 */
export function panBy(
  viewport: Viewport,
  dx: number,
  dy: number,
  container: Size,
  image: Size,
  options?: { maxScale?: number }
): Viewport {
  if (!viewport || !Number.isFinite(dx) || !Number.isFinite(dy)) {
    return viewport;
  }

  const newV = {
    scale: viewport.scale,
    tx: (viewport.tx || 0) + dx,
    ty: (viewport.ty || 0) + dy,
  };

  return clampViewport(newV, container, image, options);
}

/**
 * Classifies gesture based on distance moved and hold duration.
 */
export function classifyGesture(
  startPoint: Point,
  currentPoint: Point,
  durationMs: number
): 'tap' | 'pan' | 'longpress' {
  const dx = currentPoint.x - startPoint.x;
  const dy = currentPoint.y - startPoint.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 10) {
    return 'pan';
  }
  if (durationMs >= 500) {
    return 'longpress';
  }
  return 'tap';
}
