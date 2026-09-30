import pointsJson from '../../referentiels/points.json';
import metresJson from '../../referentiels/metres.json';
import zonesClimatiquesJson from '../../referentiels/zones_climatiques.json';
import type { TypeEquipement } from '../modele/types';

export interface EnTeteReferentiel {
  version: string;
  date: string;
  source: string;
}

export interface ReglePoints {
  id: string;
  libelle: string;
  type: TypeEquipement;
  condition: { attribut: string; valeur: string | number | boolean } | null;
  points: number;
}

export interface ReferentielPoints extends EnTeteReferentiel {
  regles: ReglePoints[];
}

export interface ReferentielMetres extends EnTeteReferentiel {
  seuilFilaireRadioM: number;
  coefficientCheminementDefaut: number;
  grilleAimantationM: number;
  hauteurPoseDefautM: number;
}

export interface ReferentielZonesClimatiques extends EnTeteReferentiel {
  zones: Record<string, string>;
}

export const referentielPoints = pointsJson as ReferentielPoints;
export const referentielMetres = metresJson as ReferentielMetres;
export const referentielZonesClimatiques = zonesClimatiquesJson as ReferentielZonesClimatiques;

/** Versions courantes, enregistrées dans chaque projet. */
export function versionsReferentiels(): Record<string, string> {
  return {
    points: referentielPoints.version,
    metres: referentielMetres.version,
    zones_climatiques: referentielZonesClimatiques.version,
  };
}

export function zoneClimatiqueDuDepartement(departement: string | null): string | null {
  if (!departement) return null;
  return referentielZonesClimatiques.zones[departement] ?? null;
}
