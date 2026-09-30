import type { Point2 } from '../modele/types';

/** Aire d'un polygone (formule du lacet), en m². Toujours positive. */
export function surfacePolygone(p: Point2[]): number {
  if (p.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Périmètre d'un polygone fermé, en m. */
export function perimetrePolygone(p: Point2[]): number {
  if (p.length < 2) return 0;
  let l = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    l += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return l;
}

export function centroidePolygone(p: Point2[]): Point2 {
  if (p.length === 0) return { x: 0, y: 0 };
  const aire = surfacePolygoneSignee(p);
  if (Math.abs(aire) < 1e-9) {
    const s = p.reduce((acc, q) => ({ x: acc.x + q.x, y: acc.y + q.y }), { x: 0, y: 0 });
    return { x: s.x / p.length, y: s.y / p.length };
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    const f = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * f;
    cy += (a.y + b.y) * f;
  }
  return { x: cx / (6 * aire), y: cy / (6 * aire) };
}

function surfacePolygoneSignee(p: Point2[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!;
    const b = p[(i + 1) % p.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Test point-dans-polygone (ray casting). */
export function pointDansPolygone(q: Point2, p: Point2[]): boolean {
  let dedans = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i]!;
    const b = p[j]!;
    const coupe = a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x;
    if (coupe) dedans = !dedans;
  }
  return dedans;
}

export function boiteEnglobante(p: Point2[]): { min: Point2; max: Point2 } | null {
  if (p.length === 0) return null;
  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };
  for (const q of p) {
    min.x = Math.min(min.x, q.x);
    min.y = Math.min(min.y, q.y);
    max.x = Math.max(max.x, q.x);
    max.y = Math.max(max.y, q.y);
  }
  return { min, max };
}

export function arrondir(v: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round(v * f) / f;
}
