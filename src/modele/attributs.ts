import type { TypeEquipement, ValeurAttribut } from './types';

/** Descripteur d'un attribut saisissable, par type d'équipement (PRD §7.1.1). */
export interface DescripteurAttribut {
  cle: string;
  libelle: string;
  genre: 'texte' | 'nombre' | 'booleen' | 'choix';
  unite?: string;
  choix?: { valeur: string; libelle: string }[];
}

const oui_non: DescripteurAttribut['genre'] = 'booleen';

const communs: DescripteurAttribut[] = [
  { cle: 'fabricantReference', libelle: 'Fabricant / référence', genre: 'texte' },
  { cle: 'commentaire', libelle: 'Commentaire', genre: 'texte' },
];

export const ATTRIBUTS_PAR_TYPE: Record<TypeEquipement, DescripteurAttribut[]> = {
  generation: [
    { cle: 'energie', libelle: 'Énergie', genre: 'texte' },
    {
      cle: 'type',
      libelle: 'Type',
      genre: 'choix',
      choix: [
        { valeur: 'chaudiere', libelle: 'Chaudière' },
        { valeur: 'pac', libelle: 'Pompe à chaleur' },
        { valeur: 'groupe_froid', libelle: 'Groupe froid' },
        { valeur: 'sous_station', libelle: 'Sous-station réseau' },
        { valeur: 'autre', libelle: 'Autre' },
      ],
    },
    { cle: 'puissanceChaudKw', libelle: 'Puissance chaud', genre: 'nombre', unite: 'kW' },
    { cle: 'puissanceFroidKw', libelle: 'Puissance froid', genre: 'nombre', unite: 'kW' },
    { cle: 'quantite', libelle: 'Quantité', genre: 'nombre' },
    { cle: 'annee', libelle: 'Année', genre: 'nombre' },
    { cle: 'regulationTemperature', libelle: 'Régulation de température', genre: 'texte' },
    { cle: 'intermittence', libelle: 'Intermittence', genre: 'texte' },
    { cle: 'boitierRegulation', libelle: 'Boîtier de régulation', genre: 'texte' },
    ...communs,
  ],
  distribution: [
    { cle: 'generationMere', libelle: 'Génération mère', genre: 'texte' },
    { cle: 'destination', libelle: 'Destination', genre: 'texte' },
    { cle: 'loiEau', libelle: "Loi d'eau", genre: 'texte', unite: '°C' },
    { cle: 'pompeType', libelle: 'Pompe : type', genre: 'texte' },
    { cle: 'pompeVariation', libelle: 'Pompe : variation', genre: oui_non },
    { cle: 'vanne3Voies', libelle: 'Vanne 3 voies', genre: oui_non },
    { cle: 'boitier', libelle: 'Boîtier', genre: 'texte' },
    { cle: 'intermittence', libelle: 'Intermittence', genre: 'texte' },
    { cle: 'tConfort', libelle: 'T° confort', genre: 'nombre', unite: '°C' },
    { cle: 'tReduit', libelle: 'T° réduit', genre: 'nombre', unite: '°C' },
    { cle: 'tHorsGel', libelle: 'T° hors gel', genre: 'nombre', unite: '°C' },
    ...communs,
  ],
  emetteur: [
    { cle: 'sourceChaud', libelle: 'Source chaud', genre: 'texte' },
    { cle: 'sourceFroid', libelle: 'Source froid', genre: 'texte' },
    { cle: 'communicationPossible', libelle: 'Communication possible', genre: oui_non },
    { cle: 'intermittence', libelle: 'Intermittence', genre: 'texte' },
    { cle: 'regulationTemperature', libelle: 'Régulation de température', genre: 'texte' },
    { cle: 'regulateur', libelle: 'Régulateur', genre: 'texte' },
    { cle: 'actionOccupant', libelle: "Action de l'occupant", genre: 'texte' },
    { cle: 'quantite', libelle: 'Quantité', genre: 'nombre' },
    ...communs,
  ],
  ecs: [
    { cle: 'energie', libelle: 'Énergie', genre: 'texte' },
    { cle: 'puissanceKw', libelle: 'Puissance', genre: 'nombre', unite: 'kW' },
    { cle: 'volumeBallonL', libelle: 'Volume ballon', genre: 'nombre', unite: 'L' },
    { cle: 'pompeBouclage', libelle: 'Pompe de bouclage', genre: oui_non },
    { cle: 'boitier', libelle: 'Boîtier', genre: 'texte' },
    ...communs,
  ],
  cta: [
    { cle: 'puissanceThermiqueMaxKw', libelle: 'Puissance thermique max', genre: 'nombre', unite: 'kW' },
    { cle: 'batterieChaude', libelle: 'Batterie chaude', genre: oui_non },
    { cle: 'batterieFroide', libelle: 'Batterie froide', genre: oui_non },
    { cle: 'regulationSoufflage', libelle: 'Régulation température de soufflage', genre: 'texte' },
    { cle: 'intermittence', libelle: 'Intermittence', genre: 'texte' },
    {
      cle: 'flux',
      libelle: 'Simple / double flux',
      genre: 'choix',
      choix: [
        { valeur: 'simple', libelle: 'Simple flux' },
        { valeur: 'double', libelle: 'Double flux' },
      ],
    },
    ...communs,
  ],
  eclairage: [
    { cle: 'zoneDesservie', libelle: 'Zone desservie', genre: 'texte' },
    { cle: 'type', libelle: 'Type', genre: 'texte' },
    { cle: 'commande', libelle: 'Commande', genre: 'texte' },
    { cle: 'regulationLuminosite', libelle: 'Régulation de luminosité', genre: 'texte' },
    { cle: 'automate', libelle: 'Automate', genre: 'texte' },
    ...communs,
  ],
  compteur: [
    { cle: 'energie', libelle: 'Énergie', genre: 'texte' },
    { cle: 'numeroPdl', libelle: 'N° PDL', genre: 'texte' },
    { cle: 'communicant', libelle: 'Communicant', genre: oui_non },
    { cle: 'protocole', libelle: 'Protocole', genre: 'texte' },
    ...communs,
  ],
  tableau: [{ cle: 'designation', libelle: 'Désignation', genre: 'texte' }, ...communs],
  boitier: [
    { cle: 'fabricant', libelle: 'Fabricant', genre: 'texte' },
    { cle: 'modele', libelle: 'Modèle', genre: 'texte' },
    { cle: 'protocoles', libelle: 'Protocoles', genre: 'texte' },
    { cle: 'capaciteES', libelle: 'Capacité E/S', genre: 'texte' },
    { cle: 'commentaire', libelle: 'Commentaire', genre: 'texte' },
  ],
  capteur: [
    { cle: 'grandeur', libelle: 'Grandeur mesurée', genre: 'texte' },
    ...communs,
  ],
  gtb: [
    { cle: 'fabricant', libelle: 'Fabricant', genre: 'texte' },
    { cle: 'modele', libelle: 'Modèle', genre: 'texte' },
    { cle: 'protocoles', libelle: 'Protocoles', genre: 'texte' },
    { cle: 'commentaire', libelle: 'Commentaire', genre: 'texte' },
  ],
  cuisine: [{ cle: 'designation', libelle: 'Désignation', genre: 'texte' }, ...communs],
  autre: [{ cle: 'designation', libelle: 'Désignation', genre: 'texte' }, ...communs],
};

export const LIBELLES_TYPES: Record<TypeEquipement, string> = {
  generation: 'Génération',
  distribution: 'Distribution hydraulique',
  emetteur: 'Émetteur',
  ecs: 'ECS',
  cta: 'CTA / Ventilation',
  eclairage: "Système d'éclairage",
  compteur: 'Compteur / PDL',
  tableau: 'Tableau électrique',
  boitier: 'Boîtier / Automate',
  capteur: 'Capteur (mesure)',
  gtb: 'GTB-GTC',
  cuisine: 'Cuisine',
  autre: 'Autre équipement',
};

/** Couleur et pictogramme (lettre) par type, pour la 2D et la 3D. Couleurs hors charte volontairement : elles codent la donnée, pas l'interface. */
export const STYLE_TYPES: Record<TypeEquipement, { couleur: string; picto: string }> = {
  generation: { couleur: '#C0392B', picto: 'G' },
  distribution: { couleur: '#E67E22', picto: 'D' },
  emetteur: { couleur: '#D35400', picto: 'E' },
  ecs: { couleur: '#8E44AD', picto: 'S' },
  cta: { couleur: '#16A085', picto: 'V' },
  eclairage: { couleur: '#B7950B', picto: 'L' },
  compteur: { couleur: '#2C3E50', picto: 'C' },
  tableau: { couleur: '#34495E', picto: 'T' },
  boitier: { couleur: '#2980B9', picto: 'A' },
  capteur: { couleur: '#27AE60', picto: 'M' },
  gtb: { couleur: '#1F618D', picto: 'B' },
  cuisine: { couleur: '#7B7D7D', picto: 'K' },
  autre: { couleur: '#95A5A6', picto: '?' },
};

/** Les types qui peuvent recevoir une liaison `lieA`. */
export const TYPES_RACCORDEMENT: TypeEquipement[] = ['boitier', 'gtb'];

export function valeurAttributTexte(v: ValeurAttribut | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
}
