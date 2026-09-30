import { describe, expect, it } from 'vitest';
import { metrerLiaison } from '../src/metres/cables';
import { creerEquipement, creerNiveau } from '../src/modele/projet';
import type { Equipement } from '../src/modele/types';

const params = { coefficientCheminement: 1.2, seuilFilaireRadioM: 15 };
const rdc = creerNiveau('z', 'RDC', 0, 3, 0, 'n_rdc');
const r1 = creerNiveau('z', 'R+1', 3.5, 3, 1, 'n_r1');

function eq(id: string, niveauId: string | null, pos: { x: number; y: number; z: number } | null): Equipement {
  const e = creerEquipement('z', 'capteur', id, {}, id);
  e.niveauId = niveauId;
  e.position = pos;
  return e;
}

describe('longueurs de câble d’une liaison lieA', () => {
  it('même niveau : manhattan + montée + descente, × coefficient ; vol d’oiseau euclidien', () => {
    const a = eq('a', rdc.id, { x: 0, y: 0, z: 1 });
    const b = eq('b', rdc.id, { x: 3, y: 4, z: 2 });
    const l = metrerLiaison(a, b, rdc, rdc, params);
    expect(l.calculable).toBe(true);
    expect(l.volOiseau).toBeCloseTo(Math.hypot(3, 4, 1), 6);
    // (3+4) + (3−1) + 0 + (3−2) = 10 → × 1,2 = 12
    expect(l.detail).toEqual({ manhattan: 7, montee: 2, deltaNiveaux: 0, descente: 1, coefficient: 1.2 });
    expect(l.estimee).toBeCloseTo(12, 6);
    expect(l.sousCategorie).toBe('filaire');
  });

  it('changement de niveau : ajoute |Δz| entre planchers', () => {
    const a = eq('a', rdc.id, { x: 0, y: 0, z: 1 });
    const b = eq('b', r1.id, { x: 2, y: 0, z: 1.5 });
    const l = metrerLiaison(a, b, rdc, r1, params);
    // 2 + 2 + 3,5 + 1,5 = 9 → 10,8
    expect(l.detail.deltaNiveaux).toBe(3.5);
    expect(l.estimee).toBeCloseTo(10.8, 6);
    expect(l.volOiseau).toBeCloseTo(Math.hypot(2, 0, 3.5 + 1.5 - 1), 6);
  });

  it('seuil 15 m : ≤ 15 → filaire, > 15 → radio, sur la longueur estimée', () => {
    const a = eq('a', rdc.id, { x: 0, y: 0, z: 3 }); // au plafond : montée 0
    // 12,5 + 0 + 0 + 0 = 12,5 × 1,2 = 15 exactement → filaire
    const b = eq('b', rdc.id, { x: 12.5, y: 0, z: 3 });
    expect(metrerLiaison(a, b, rdc, rdc, params).estimee).toBeCloseTo(15, 9);
    expect(metrerLiaison(a, b, rdc, rdc, params).sousCategorie).toBe('filaire');
    const c = eq('c', rdc.id, { x: 12.6, y: 0, z: 3 });
    expect(metrerLiaison(a, c, rdc, rdc, params).sousCategorie).toBe('radio');
    // Sans coefficient, 12,6 m resterait filaire : le seuil s'applique bien après le coefficient.
    expect(metrerLiaison(a, c, rdc, rdc, { ...params, coefficientCheminement: 1 }).sousCategorie).toBe('filaire');
  });

  it('coefficient de cheminement réglable', () => {
    const a = eq('a', rdc.id, { x: 0, y: 0, z: 3 });
    const b = eq('b', rdc.id, { x: 10, y: 0, z: 3 });
    expect(metrerLiaison(a, b, rdc, rdc, { ...params, coefficientCheminement: 1.5 }).estimee).toBeCloseTo(15, 9);
  });

  it('équipement non placé → liaison non calculable', () => {
    const a = eq('a', rdc.id, { x: 0, y: 0, z: 1 });
    const b = eq('b', null, null);
    const l = metrerLiaison(a, b, rdc, undefined, params);
    expect(l.calculable).toBe(false);
    expect(l.estimee).toBe(0);
  });
});
