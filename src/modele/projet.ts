import { nouvelId } from './ids';
import {
  SCHEMA_VERSION,
  type Equipement,
  type Id,
  type Local,
  type Niveau,
  type Point2,
  type Projet,
  type TypeEquipement,
  type Zone,
} from './types';

export interface OptionsProjet {
  reference: string;
  nom: string;
  adresse?: string;
  codePostal?: string;
  zoneClimatique?: string | null;
  coefficientCheminement: number;
  versionsReferentiels: Record<string, string>;
  date?: string;
  id?: Id;
}

export function creerProjet(o: OptionsProjet): Projet {
  const date = o.date ?? new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: o.id ?? nouvelId('p'),
    reference: o.reference,
    nom: o.nom,
    adresse: o.adresse ?? '',
    codePostal: o.codePostal ?? '',
    zoneClimatique: o.zoneClimatique ?? null,
    dateCreation: date,
    dateModification: date,
    dernierExport: null,
    parametres: { coefficientCheminement: o.coefficientCheminement },
    versionsReferentiels: { ...o.versionsReferentiels },
    zones: [],
    niveaux: [],
    locaux: [],
    equipements: [],
    donneesEnergie: {},
    scenarios: [],
    lignesChiffrage: [],
  };
}

export function creerZone(nom: string, id?: Id): Zone {
  return { id: id ?? nouvelId('z'), nom, alterId: null };
}

export function creerNiveau(
  zoneId: Id,
  nom: string,
  altitudePlancher: number,
  hauteurSousPlafond: number,
  ordre: number,
  id?: Id,
): Niveau {
  return {
    id: id ?? nouvelId('n'),
    zoneId,
    nom,
    altitudePlancher,
    hauteurSousPlafond,
    ordre,
    fondDePlan: null,
    alterId: null,
  };
}

export function creerLocal(zoneId: Id, niveauId: Id, nom: string, polygone: Point2[], type = '', id?: Id): Local {
  return { id: id ?? nouvelId('l'), zoneId, niveauId, nom, type, polygone, alterId: null };
}

export function creerEquipement(
  zoneId: Id,
  type: TypeEquipement,
  nom: string,
  attributs: Equipement['attributs'] = {},
  id?: Id,
): Equipement {
  return {
    id: id ?? nouvelId('e'),
    type,
    nom,
    zoneId,
    niveauId: null,
    localId: null,
    position: null,
    lieA: null,
    alterId: null,
    photos: [],
    attributs,
  };
}

/** Un local rectangulaire à partir du coin haut-gauche et des dimensions. */
export function rectangle(x: number, y: number, largeur: number, hauteur: number): Point2[] {
  return [
    { x, y },
    { x: x + largeur, y },
    { x: x + largeur, y: y + hauteur },
    { x, y: y + hauteur },
  ];
}

export function niveauDe(projet: Projet, id: Id | null): Niveau | undefined {
  return id ? projet.niveaux.find((n) => n.id === id) : undefined;
}
export function localDe(projet: Projet, id: Id | null): Local | undefined {
  return id ? projet.locaux.find((l) => l.id === id) : undefined;
}
export function equipementDe(projet: Projet, id: Id | null): Equipement | undefined {
  return id ? projet.equipements.find((e) => e.id === id) : undefined;
}
export function zoneDe(projet: Projet, id: Id | null): Zone | undefined {
  return id ? projet.zones.find((z) => z.id === id) : undefined;
}

export function niveauxTries(projet: Projet): Niveau[] {
  return [...projet.niveaux].sort((a, b) => a.ordre - b.ordre || a.altitudePlancher - b.altitudePlancher);
}

/** Département (2 ou 3 caractères) déduit d'un code postal français. */
export function departementDe(codePostal: string): string | null {
  const cp = codePostal.trim();
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.slice(0, 3);
  if (cp.startsWith('20')) return Number(cp) < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
}
