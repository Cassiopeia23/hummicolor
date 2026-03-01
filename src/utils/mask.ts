import type { MaskData, Point } from '../types';

export const toNormalizedPoints = (points: Point[], width: number, height: number): Point[] => {
  if (width <= 0 || height <= 0) {
    return [];
  }

  return points.map((p) => ({
    x: p.x / width,
    y: p.y / height,
  }));
};

export const fromNormalizedPoints = (points: Point[], width: number, height: number): Point[] => {
  return points.map((p) => ({
    x: p.x * width,
    y: p.y * height,
  }));
};

export const exportMask = (mask: MaskData): string => JSON.stringify(mask, null, 2);

export const parseMask = (content: string): MaskData | null => {
  try {
    const parsed = JSON.parse(content) as Partial<MaskData>;

    if (
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number' ||
      !Array.isArray(parsed.points) ||
      typeof parsed.closed !== 'boolean'
    ) {
      return null;
    }

    const points = parsed.points.filter(
      (p): p is Point =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as { x?: unknown }).x === 'number' &&
        typeof (p as { y?: unknown }).y === 'number',
    );

    return {
      width: parsed.width,
      height: parsed.height,
      points,
      closed: parsed.closed,
    };
  } catch {
    return null;
  }
};

export const findNearestVertex = (
  points: Point[],
  target: Point,
  maxDistance = 14,
): number => {
  let minIdx = -1;
  let minDistance = Number.POSITIVE_INFINITY;

  points.forEach((point, idx) => {
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d < minDistance) {
      minDistance = d;
      minIdx = idx;
    }
  });

  return minDistance <= maxDistance ? minIdx : -1;
};
