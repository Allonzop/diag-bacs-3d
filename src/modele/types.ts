/**
 * Modèle de données du projet Diag BACS 3D.
 * Structure alignée sur l'onglet E-CRVT de l'outil Diag (PRD §7.1) pour que l'import ALTER (J2) soit direct.
 * Le projet est stocké à plat (zones, niveaux, locaux, équipements) avec des clés étrangères :
 * l'arbre Projet → Zone → Niveau → Local → Équipement se reconstruit par ces clés.
 */

export type Id = string;

export const SCHEMA_VERSION = 1;

export const TYPES_EQUIPEMENT = [
  'generation',
  'distribution',
  'emetteur',
  'ecs',
  'cta',
  'eclairage',
  'compteur',
  'tableau',
  'boitier',
  'capteur',
  'gtb',
  'cuisine',
  'autre',
] as const;

export type TypeEquipement = (typeof TYPES_EQUIPEMENT)[number];

export interface Point2 {
  x: number;
  y: number;
}

/** Position en m. x, y dans le plan du niveau (repère du site), z = hauteur de pose au-dessus du plancher du niveau. */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export type ValeurAttribut = string | number | boolean | null;

export interface Photo {
  id: Id;
  /** Référence vers la table `fichiers` d'IndexedDB (blob). */
  fichierId: Id;
  legende: string;
  date: string;
}

export interface Equipement {
  id: Id;
  type: TypeEquipement;
  nom: string;
  zoneId: Id;
  /** Niveau de pose. `null` tant que l'équipement est dans le bac « À placer ». */
  niveauId: Id | null;
  /** Local de pose. `null` si non placé ou posé hors d'un local dessiné. */
  localId: Id | null;
  /** `null` = non placé. */
  position: Point3 | null;
  /** Boîtier ou automate de raccordement. */
  lieA: Id | null;
  /** Identifiant ALTER d'origine, pour un réimport idempotent (J2). */
  alterId: string | null;
  photos: Photo[];
  attributs: Record<string, ValeurAttribut>;
}

export interface Local {
  id: Id;
  zoneId: Id;
  niveauId: Id;
  nom: string;
  type: string;
  /** Polygone fermé en m, repère du site, sens quelconque. Vide si le local est « à dessiner ». */
  polygone: Point2[];
  alterId: string | null;
}

export interface FondDePlan {
  fichierId: Id;
  largeurPx: number;
  hauteurPx: number;
  /** Mètres par pixel. */
  echelle: number;
  /** Position en m du coin haut-gauche de l'image dans le repère du site. */
  decalage: Point2;
  /** 0 → 1 */
  opacite: number;
  /** Vrai une fois l'échelle calée par deux points et une distance réelle. */
  cale: boolean;
}

export interface Niveau {
  id: Id;
  zoneId: Id;
  nom: string;
  /** Altitude du plancher en m par rapport au 0 du projet. */
  altitudePlancher: number;
  /** Hauteur sous plafond en m. */
  hauteurSousPlafond: number;
  ordre: number;
  fondDePlan: FondDePlan | null;
  alterId: string | null;
}

/** Zone = bâtiment au sens du décret BACS. */
export interface Zone {
  id: Id;
  nom: string;
  alterId: string | null;
}

export interface ParametresProjet {
  /** Coefficient de cheminement appliqué aux longueurs de câble estimées (défaut : referentiels/metres.json). */
  coefficientCheminement: number;
}

/** Données hors ALTER (PRD §7.5). Remplies à partir du jalon J3 ; présentes dès J1 pour figer le schéma. */
export interface DonneesEnergie {
  [cle: string]: ValeurAttribut;
}

export interface Projet {
  schemaVersion: number;
  id: Id;
  reference: string;
  nom: string;
  adresse: string;
  codePostal: string;
  /** Déduite du département via referentiels/zones_climatiques.json. */
  zoneClimatique: string | null;
  dateCreation: string;
  dateModification: string;
  /** Date du dernier export .zip, pour le rappel de sauvegarde à 7 jours. */
  dernierExport: string | null;
  parametres: ParametresProjet;
  /** Version de chaque référentiel utilisée par le projet (PRD §8). */
  versionsReferentiels: Record<string, string>;
  zones: Zone[];
  niveaux: Niveau[];
  locaux: Local[];
  equipements: Equipement[];
  donneesEnergie: DonneesEnergie;
  scenarios: unknown[];
  lignesChiffrage: unknown[];
}

/** Métadonnées d'un fichier binaire (photo, fond de plan) stocké dans IndexedDB ou dans le .zip. */
export interface FichierMeta {
  id: Id;
  projetId: Id;
  nom: string;
  typeMime: string;
  taille: number;
}

export interface Fichier extends FichierMeta {
  blob: Blob;
}
