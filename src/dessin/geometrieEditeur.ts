import type { Local, Point2 } from '../modele/types';
import { pointDansPolygone } from '../metres/geometrie';

export interface Viewport {
  /** Centre de la vue, en m. */
  cx: number;
  cy: number;
  /** Pixels par mètre. */
  ppm: number;
}

export function ecranVersMonde(v: Viewport, largeur: number, hauteur: number, sx: number, sy: number): Point2 {
  return { x: (sx - largeur / 2) / v.ppm + v.cx, y: (sy - hauteur / 2) / v.ppm + v.cy };
}

export function mondeVersEcran(v: Viewport, largeur: number, hauteur: number, p: Point2): Point2 {
  return { x: (p.x - v.cx) * v.ppm + largeur / 2, y: (p.y - v.cy) * v.ppm + hauteur / 2 };
}

export function arrondirGrille(valeur: number, pas: number): number {
  return Math.round(valeur / pas) * pas;
}

/** Aimantation : d'abord sur un sommet existant à portée, sinon sur la grille. */
export function aimanter(
  p: Point2,
  locaux: Local[],
  pasGrille: number,
  porteeSommet: number,
  exclure?: { localId: string; index: number },
): Point2 {
  let meilleur: Point2 | null = null;
  let meilleureDistance = porteeSommet;
  for (const l of locaux) {
    l.polygone.forEach((s, i) => {
      if (exclure && exclure.localId === l.id && exclure.index === i) return;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < meilleureDistance) {
        meilleureDistance = d;
        meilleur = s;
      }
    });
  }
  if (meilleur) return { ...(meilleur as Point2) };
  return { x: arrondirGrille(p.x, pasGrille), y: arrondirGrille(p.y, pasGrille) };
}

export function localContenant(p: Point2, locaux: Local[]): Local | undefined {
  return locaux.find((l) => l.polygone.length >= 3 && pointDansPolygone(p, l.polygone));
}

export function cadrer(points: Point2[], largeur: number, hauteur: number, marge = 40): Viewport {
  if (points.length === 0 || largeur === 0 || hauteur === 0) return { cx: 10, cy: 7, ppm: Math.max(10, Math.min(largeur, hauteur) / 24) };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const w = Math.max(maxX - minX, 2);
  const h = Math.max(maxY - minY, 2);
  const ppm = Math.max(4, Math.min((largeur - 2 * marge) / w, (hauteur - 2 * marge) / h, 200));
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, ppm };
}
