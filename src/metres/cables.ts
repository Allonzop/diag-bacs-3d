import type { Equipement, Niveau } from '../modele/types';

export type SousCategorieLiaison = 'filaire' | 'radio';

export interface LiaisonMetree {
  equipementId: string;
  cibleId: string;
  /** Faux si l'un des deux équipements n'est pas placé ou n'a pas de niveau. */
  calculable: boolean;
  /** Distance 3D directe, en m. */
  volOiseau: number;
  /** Longueur estimée pour le chiffrage, en m (coefficient de cheminement inclus). */
  estimee: number;
  /** Détail du calcul, pour l'affichage et les tests. */
  detail: {
    manhattan: number;
    montee: number;
    deltaNiveaux: number;
    descente: number;
    coefficient: number;
  };
  sousCategorie: SousCategorieLiaison;
}

export interface ParametresCables {
  coefficientCheminement: number;
  seuilFilaireRadioM: number;
}

/**
 * Longueurs de câble d'une liaison `lieA` (PRD §7.3).
 * estimée = ((|dx| + |dy|) + montée au plafond + |Δz entre niveaux| + descente) × coefficient de cheminement
 *  - montée  = hauteur sous plafond du niveau de départ − hauteur de pose du départ ;
 *  - Δz      = différence d'altitude des planchers des deux niveaux ;
 *  - descente = hauteur sous plafond du niveau d'arrivée − hauteur de pose de l'arrivée.
 * Sous-catégorie : estimée ≤ seuil → filaire, sinon radio.
 */
export function metrerLiaison(
  depart: Equipement,
  cible: Equipement,
  niveauDepart: Niveau | undefined,
  niveauCible: Niveau | undefined,
  p: ParametresCables,
): LiaisonMetree {
  const base = { equipementId: depart.id, cibleId: cible.id };
  if (!depart.position || !cible.position || !niveauDepart || !niveauCible) {
    return {
      ...base,
      calculable: false,
      volOiseau: 0,
      estimee: 0,
      detail: { manhattan: 0, montee: 0, deltaNiveaux: 0, descente: 0, coefficient: p.coefficientCheminement },
      sousCategorie: 'filaire',
    };
  }
  const a = depart.position;
  const b = cible.position;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const zA = niveauDepart.altitudePlancher + a.z;
  const zB = niveauCible.altitudePlancher + b.z;
  const volOiseau = Math.hypot(dx, dy, zB - zA);

  const manhattan = dx + dy;
  const montee = Math.max(0, niveauDepart.hauteurSousPlafond - a.z);
  const deltaNiveaux = Math.abs(niveauCible.altitudePlancher - niveauDepart.altitudePlancher);
  const descente = Math.max(0, niveauCible.hauteurSousPlafond - b.z);
  const estimee = (manhattan + montee + deltaNiveaux + descente) * p.coefficientCheminement;

  return {
    ...base,
    calculable: true,
    volOiseau,
    estimee,
    detail: { manhattan, montee, deltaNiveaux, descente, coefficient: p.coefficientCheminement },
    sousCategorie: estimee <= p.seuilFilaireRadioM ? 'filaire' : 'radio',
  };
}
