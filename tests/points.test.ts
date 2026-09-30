import { describe, expect, it } from 'vitest';
import { pointsEquipement } from '../src/metres/points';
import { creerEquipement } from '../src/modele/projet';
import { referentielPoints } from '../src/referentiels';

describe('comptage de points (points.json)', () => {
  it('départ hydraulique = 10, sans condition', () => {
    const e = creerEquipement('z', 'distribution', 'Départ');
    expect(pointsEquipement(e, referentielPoints)).toMatchObject({ points: 10, regleId: 'depart-hydraulique' });
  });
  it('chaudière = 10 via l’attribut type, insensible à la casse', () => {
    const e = creerEquipement('z', 'generation', 'Chaudière', { type: 'Chaudiere' });
    expect(pointsEquipement(e, referentielPoints).points).toBe(10);
    const pac = creerEquipement('z', 'generation', 'PAC', { type: 'pac' });
    expect(pointsEquipement(pac, referentielPoints)).toMatchObject({ points: 0, regleId: null });
  });
  it('CTA simple flux = 20, double flux = 40', () => {
    expect(pointsEquipement(creerEquipement('z', 'cta', 'CTA', { flux: 'simple' }), referentielPoints).points).toBe(20);
    expect(pointsEquipement(creerEquipement('z', 'cta', 'CTA', { flux: 'double' }), referentielPoints).points).toBe(40);
  });
  it('type sans règle → 0 point, non référencé', () => {
    expect(pointsEquipement(creerEquipement('z', 'eclairage', 'Ecl'), referentielPoints)).toMatchObject({ points: 0, regleId: null });
  });
  it('le référentiel porte version, date et source', () => {
    expect(referentielPoints.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(referentielPoints.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(referentielPoints.source.length).toBeGreaterThan(10);
  });
});
