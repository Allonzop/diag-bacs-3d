import { LIBELLES_TYPES } from '../modele/attributs';
import type { Projet } from '../modele/types';
import { TYPES_EQUIPEMENT } from '../modele/types';
import { arrondir } from './geometrie';
import type { MetresProjet } from './index';

function ligneCsv(cellules: (string | number)[]): string {
  return cellules
    .map((c) => {
      const s = typeof c === 'number' ? String(arrondir(c, 3)).replace('.', ',') : c;
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(';');
}

/** Export CSV (séparateur « ; », décimale « , », UTF-8 avec BOM pour Excel). */
export function metresEnCsv(projet: Projet, m: MetresProjet): string {
  const lignes: string[] = [];
  const nomEq = (id: string) => projet.equipements.find((e) => e.id === id)?.nom ?? id;

  lignes.push(ligneCsv(['Niveau', 'Zone', 'Nom', 'Surface m2', 'Perimetre m', 'Volume m3', 'Equipements', 'Points', ...TYPES_EQUIPEMENT.map((t) => LIBELLES_TYPES[t])]));
  const zoneNom = (id: string) => projet.zones.find((z) => z.id === id)?.nom ?? id;
  const niveauNom = (id: string) => projet.niveaux.find((n) => n.id === id)?.nom ?? id;
  for (const l of projet.locaux) {
    const a = m.locaux[l.id]!;
    lignes.push(ligneCsv(['Local', zoneNom(l.zoneId), `${niveauNom(l.niveauId)} / ${l.nom}`, a.surface, a.perimetre, a.volume, a.equipements, a.points, ...TYPES_EQUIPEMENT.map((t) => a.equipementsParType[t])]));
  }
  for (const n of projet.niveaux) {
    const a = m.niveaux[n.id]!;
    lignes.push(ligneCsv(['Niveau', zoneNom(n.zoneId), n.nom, a.surface, a.perimetre, a.volume, a.equipements, a.points, ...TYPES_EQUIPEMENT.map((t) => a.equipementsParType[t])]));
  }
  for (const z of projet.zones) {
    const a = m.zones[z.id]!;
    lignes.push(ligneCsv(['Zone', z.nom, z.nom, a.surface, a.perimetre, a.volume, a.equipements, a.points, ...TYPES_EQUIPEMENT.map((t) => a.equipementsParType[t])]));
  }
  const p = m.projet;
  lignes.push(ligneCsv(['Projet', '', projet.nom, p.surface, p.perimetre, p.volume, p.equipements, p.points, ...TYPES_EQUIPEMENT.map((t) => p.equipementsParType[t])]));

  lignes.push('');
  lignes.push(ligneCsv(['Liaison', 'Depuis', 'Vers', 'Calculable', 'Vol d oiseau m', 'Estimee m', 'Sous-categorie', 'Manhattan', 'Montee', 'Delta niveaux', 'Descente', 'Coefficient']));
  for (const l of m.liaisons) {
    lignes.push(ligneCsv(['Liaison', nomEq(l.equipementId), nomEq(l.cibleId), l.calculable ? 'oui' : 'non', l.volOiseau, l.estimee, l.sousCategorie, l.detail.manhattan, l.detail.montee, l.detail.deltaNiveaux, l.detail.descente, l.detail.coefficient]));
  }

  lignes.push('');
  lignes.push(ligneCsv(['Points', 'Equipement', 'Type', 'Regle', 'Points']));
  for (const e of projet.equipements) {
    const pe = m.points.parEquipement[e.id]!;
    lignes.push(ligneCsv(['Points', e.nom, LIBELLES_TYPES[e.type], pe.regleId ?? 'non référencé', pe.points]));
  }
  lignes.push(ligneCsv(['Points', 'TOTAL', '', '', m.points.total]));

  return '﻿' + lignes.join('\r\n');
}

export function metresEnJson(projet: Projet, m: MetresProjet): string {
  return JSON.stringify(
    { projetId: projet.id, reference: projet.reference, versionsReferentiels: projet.versionsReferentiels, metres: m },
    null,
    2,
  );
}
