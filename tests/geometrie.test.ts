import { describe, expect, it } from 'vitest';
import { boiteEnglobante, centroidePolygone, perimetrePolygone, pointDansPolygone, surfacePolygone } from '../src/metres/geometrie';
import { rectangle } from '../src/modele/projet';

describe('géométrie des locaux', () => {
  const rect = rectangle(2, 3, 6, 4);
  it('surface et périmètre d’un rectangle', () => {
    expect(surfacePolygone(rect)).toBe(24);
    expect(perimetrePolygone(rect)).toBe(20);
  });
  it('surface d’un polygone en L, quel que soit le sens', () => {
    const L = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 13 },
      { x: 2, y: 13 },
      { x: 2, y: 9 },
      { x: 0, y: 9 },
    ];
    expect(surfacePolygone(L)).toBe(6 * 13 - 2 * 4);
    expect(surfacePolygone([...L].reverse())).toBe(6 * 13 - 2 * 4);
    expect(perimetrePolygone(L)).toBe(6 + 13 + 4 + 4 + 2 + 9);
  });
  it('polygone dégénéré → 0', () => {
    expect(surfacePolygone([])).toBe(0);
    expect(surfacePolygone([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
  it('centroïde et boîte englobante', () => {
    expect(centroidePolygone(rect)).toEqual({ x: 5, y: 5 });
    expect(boiteEnglobante(rect)).toEqual({ min: { x: 2, y: 3 }, max: { x: 8, y: 7 } });
  });
  it('point dans polygone', () => {
    expect(pointDansPolygone({ x: 5, y: 5 }, rect)).toBe(true);
    expect(pointDansPolygone({ x: 1, y: 5 }, rect)).toBe(false);
  });
});
