import { describe, expect, it } from 'vitest';
import { aimanter, arrondirGrille, cadrer, ecranVersMonde, localContenant, mondeVersEcran } from '../src/dessin/geometrieEditeur';
import { creerLocal, rectangle } from '../src/modele/projet';

describe('géométrie de l’éditeur 2D', () => {
  const vue = { cx: 10, cy: 5, ppm: 20 };
  it('conversions écran ↔ monde inverses', () => {
    const m = ecranVersMonde(vue, 800, 600, 100, 50);
    expect(m).toEqual({ x: 10 + (100 - 400) / 20, y: 5 + (50 - 300) / 20 });
    expect(mondeVersEcran(vue, 800, 600, m)).toEqual({ x: 100, y: 50 });
  });
  it('aimantation : grille de 0,5 m, puis sommet existant à portée', () => {
    expect(arrondirGrille(1.26, 0.5)).toBe(1.5);
    const local = creerLocal('z', 'n', 'A', rectangle(0, 0, 4, 3), '', 'l1');
    expect(aimanter({ x: 1.3, y: 1.2 }, [local], 0.5, 0.3)).toEqual({ x: 1.5, y: 1 });
    // à 0,2 m du sommet (4,3) : aimanté sur le sommet plutôt que sur la grille
    expect(aimanter({ x: 4.2, y: 3.1 }, [local], 0.5, 0.3)).toEqual({ x: 4, y: 3 });
    // le sommet exclu (celui qu'on déplace) n'attire pas
    expect(aimanter({ x: 4.2, y: 3.1 }, [local], 0.5, 0.3, { localId: 'l1', index: 2 })).toEqual({ x: 4, y: 3 });
    expect(aimanter({ x: 4.2, y: 3.2 }, [local], 0.5, 0.3, { localId: 'l1', index: 2 })).toEqual({ x: 4, y: 3 });
  });
  it('local contenant un point', () => {
    const a = creerLocal('z', 'n', 'A', rectangle(0, 0, 4, 3), '', 'a');
    const vide = creerLocal('z', 'n', 'B', [], '', 'b');
    expect(localContenant({ x: 1, y: 1 }, [vide, a])?.id).toBe('a');
    expect(localContenant({ x: 9, y: 9 }, [vide, a])).toBeUndefined();
  });
  it('cadrage : tout le contenu visible, avec marge', () => {
    const v = cadrer(rectangle(0, 0, 20, 10), 1000, 600, 40);
    expect(v.cx).toBe(10);
    expect(v.cy).toBe(5);
    expect(v.ppm).toBeCloseTo(Math.min(920 / 20, 520 / 10), 6);
    expect(cadrer([], 1000, 600).ppm).toBeGreaterThan(0);
  });
});
