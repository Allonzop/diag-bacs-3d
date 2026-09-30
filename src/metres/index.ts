import type { Equipement, Id, Projet, TypeEquipement } from '../modele/types';
import { TYPES_EQUIPEMENT } from '../modele/types';
import type { ReferentielMetres, ReferentielPoints } from '../referentiels';
import { metrerLiaison, type LiaisonMetree } from './cables';
import { perimetrePolygone, surfacePolygone } from './geometrie';
import { pointsEquipement, type PointsEquipement } from './points';

export type CompteParType = Record<TypeEquipement, number>;

export interface MetresAgreges {
  surface: number;
  perimetre: number;
  volume: number;
  nombreLocaux: number;
  equipements: number;
  equipementsParType: CompteParType;
  points: number;
}

export interface MetresProjet {
  locaux: Record<Id, MetresAgreges>;
  niveaux: Record<Id, MetresAgreges>;
  zones: Record<Id, MetresAgreges>;
  projet: MetresAgreges;
  liaisons: LiaisonMetree[];
  points: { parEquipement: Record<Id, PointsEquipement>; total: number; nonReferences: Id[] };
  /** Équipements non placés (bac « À placer »). */
  aPlacer: Id[];
}

export interface Referentiels {
  points: ReferentielPoints;
  metres: ReferentielMetres;
}

function agregatVide(): MetresAgreges {
  const parType = Object.fromEntries(TYPES_EQUIPEMENT.map((t) => [t, 0])) as CompteParType;
  return { surface: 0, perimetre: 0, volume: 0, nombreLocaux: 0, equipements: 0, equipementsParType: parType, points: 0 };
}

function ajouter(cible: MetresAgreges, src: MetresAgreges): void {
  cible.surface += src.surface;
  cible.perimetre += src.perimetre;
  cible.volume += src.volume;
  cible.nombreLocaux += src.nombreLocaux;
  cible.equipements += src.equipements;
  cible.points += src.points;
  for (const t of TYPES_EQUIPEMENT) cible.equipementsParType[t] += src.equipementsParType[t];
}

function compterEquipement(cible: MetresAgreges, e: Equipement, points: number): void {
  cible.equipements += 1;
  cible.equipementsParType[e.type] += 1;
  cible.points += points;
}

/**
 * Métrés complets d'un projet. Fonction pure et déterministe : même projet + mêmes référentiels → même résultat.
 * Les équipements non placés comptent dans la zone et le projet (points, nombre par type) mais pas dans un niveau ni un local.
 */
export function metresProjet(projet: Projet, ref: Referentiels): MetresProjet {
  const locaux: Record<Id, MetresAgreges> = {};
  const niveaux: Record<Id, MetresAgreges> = {};
  const zones: Record<Id, MetresAgreges> = {};
  const total = agregatVide();

  for (const z of projet.zones) zones[z.id] = agregatVide();
  for (const n of projet.niveaux) niveaux[n.id] = agregatVide();

  for (const l of projet.locaux) {
    const niveau = projet.niveaux.find((n) => n.id === l.niveauId);
    const m = agregatVide();
    m.surface = surfacePolygone(l.polygone);
    m.perimetre = perimetrePolygone(l.polygone);
    m.volume = m.surface * (niveau?.hauteurSousPlafond ?? 0);
    m.nombreLocaux = 1;
    locaux[l.id] = m;
  }

  const parEquipement: Record<Id, PointsEquipement> = {};
  const nonReferences: Id[] = [];
  const aPlacer: Id[] = [];
  for (const e of projet.equipements) {
    const pe = pointsEquipement(e, ref.points);
    parEquipement[e.id] = pe;
    if (pe.regleId === null) nonReferences.push(e.id);
    if (!e.position) aPlacer.push(e.id);
    if (e.localId && locaux[e.localId]) compterEquipement(locaux[e.localId]!, e, pe.points);
  }

  // Locaux → niveaux, puis équipements posés hors local (comptés au niveau seulement).
  for (const l of projet.locaux) {
    const cible = niveaux[l.niveauId];
    if (cible) ajouter(cible, locaux[l.id]!);
  }
  for (const e of projet.equipements) {
    if (e.position && e.niveauId && !(e.localId && locaux[e.localId]) && niveaux[e.niveauId]) {
      compterEquipement(niveaux[e.niveauId]!, e, parEquipement[e.id]!.points);
    }
  }
  // Niveaux → zones, puis équipements non placés (comptés à la zone).
  for (const n of projet.niveaux) {
    const cible = zones[n.zoneId];
    if (cible) ajouter(cible, niveaux[n.id]!);
  }
  for (const e of projet.equipements) {
    if (!e.position && zones[e.zoneId]) compterEquipement(zones[e.zoneId]!, e, parEquipement[e.id]!.points);
  }
  for (const z of projet.zones) ajouter(total, zones[z.id]!);

  const liaisons: LiaisonMetree[] = [];
  for (const e of projet.equipements) {
    if (!e.lieA) continue;
    const cible = projet.equipements.find((c) => c.id === e.lieA);
    if (!cible) continue;
    liaisons.push(
      metrerLiaison(
        e,
        cible,
        projet.niveaux.find((n) => n.id === e.niveauId),
        projet.niveaux.find((n) => n.id === cible.niveauId),
        {
          coefficientCheminement: projet.parametres.coefficientCheminement,
          seuilFilaireRadioM: ref.metres.seuilFilaireRadioM,
        },
      ),
    );
  }

  const totalPoints = Object.values(parEquipement).reduce((s, p) => s + p.points, 0);

  return {
    locaux,
    niveaux,
    zones,
    projet: total,
    liaisons,
    points: { parEquipement, total: totalPoints, nonReferences },
    aPlacer,
  };
}

export { metrerLiaison } from './cables';
export type { LiaisonMetree } from './cables';
export { pointsEquipement } from './points';
export * from './geometrie';
