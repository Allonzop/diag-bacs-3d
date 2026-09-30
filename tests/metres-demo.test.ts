import { describe, expect, it } from 'vitest';
import { metresProjet } from '../src/metres';
import { metresEnCsv, metresEnJson } from '../src/metres/export';
import { projetDemo } from '../src/modele/demo';
import { referentielMetres, referentielPoints, versionsReferentiels } from '../src/referentiels';

const ref = { points: referentielPoints, metres: referentielMetres };
const projet = () => projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);

describe('métrés du projet démo (non-régression)', () => {
  const m = metresProjet(projet(), ref);

  it('surfaces par local, niveau, zone et projet', () => {
    expect(m.locaux['l_chaufferie']!.surface).toBe(30);
    expect(m.locaux['l_bureau']!.surface).toBe(6 * 13 - 2 * 4);
    expect(m.locaux['l_chaufferie']!.volume).toBeCloseTo(30 * 3.2, 6);
    // RDC : 30 + 40 + 56 + 56 + 70 = 252 ; R+1 : 30 + 70 + 80 + 80 = 260
    expect(m.niveaux['n_rdc']!.surface).toBe(252);
    expect(m.niveaux['n_r1']!.surface).toBe(260);
    expect(m.zones['z_principal']!.surface).toBe(512);
    expect(m.projet.surface).toBe(512);
    expect(m.projet.nombreLocaux).toBe(9);
  });

  it('nombre d’équipements par type, non placés comptés à la zone seulement', () => {
    expect(m.locaux['l_chaufferie']!.equipements).toBe(5);
    expect(m.locaux['l_chaufferie']!.equipementsParType.distribution).toBe(2);
    // La sonde extérieure est posée hors local : comptée au niveau RDC, pas dans un local.
    expect(m.niveaux['n_rdc']!.equipementsParType.capteur).toBe(1);
    expect(m.niveaux['n_rdc']!.equipements).toBe(12);
    expect(m.niveaux['n_r1']!.equipements).toBe(4);
    expect(m.zones['z_principal']!.equipements).toBe(18);
    expect(m.projet.equipementsParType.compteur).toBe(3);
    expect(m.aPlacer).toEqual(['e_ecl_couloir', 'e_compteur_eau']);
  });

  it('points câblés : 2 départs (20) + chaudière (10) + CTA double flux (40) = 70', () => {
    expect(m.points.total).toBe(70);
    expect(m.points.parEquipement['e_cta']!.points).toBe(40);
    expect(m.points.nonReferences).toContain('e_ecs');
    expect(m.locaux['l_chaufferie']!.points).toBe(30);
    expect(m.niveaux['n_r1']!.points).toBe(40);
  });

  it('liaisons : seuil 15 m et changement de niveau', () => {
    const par = Object.fromEntries(m.liaisons.map((l) => [l.equipementId, l]));
    expect(m.liaisons).toHaveLength(7);
    // Chaudière (3,2,0.5) → automate (1,1,1.5) au RDC (HSP 3,2) : (2+1) + 2,7 + 0 + 1,7 = 7,4 × 1,2 = 8,88
    expect(par['e_chaudiere']!.estimee).toBeCloseTo(8.88, 6);
    expect(par['e_chaudiere']!.sousCategorie).toBe('filaire');
    // Compteur gaz (19,12,1) → automate : (18+11) + 2,2 + 0 + 1,7 = 32,9 × 1,2 = 39,48 → radio
    expect(par['e_compteur_gaz']!.estimee).toBeCloseTo(39.48, 6);
    expect(par['e_compteur_gaz']!.sousCategorie).toBe('radio');
    // Boîtier CTA (R+1, 1,1,1.5) → automate (RDC, 1,1,1.5) : 0 + 1,3 + 3,5 + 1,7 = 6,5 × 1,2 = 7,8
    expect(par['e_boitier_cta']!.detail.deltaNiveaux).toBe(3.5);
    expect(par['e_boitier_cta']!.estimee).toBeCloseTo(7.8, 6);
    expect(par['e_boitier_cta']!.volOiseau).toBeCloseTo(3.5, 6);
    expect(m.liaisons.every((l) => l.calculable)).toBe(true);
  });

  it('déterministe : deux calculs identiques', () => {
    expect(JSON.stringify(metresProjet(projet(), ref))).toBe(JSON.stringify(m));
  });

  it('exports CSV et JSON', () => {
    const csv = metresEnCsv(projet(), m);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Local;Bâtiment principal;RDC / Chaufferie;30;22;96;5;30');
    expect(csv).toContain('Points;TOTAL;;;70');
    const json = JSON.parse(metresEnJson(projet(), m));
    expect(json.metres.points.total).toBe(70);
    expect(json.versionsReferentiels.points).toBe(referentielPoints.version);
  });
});
