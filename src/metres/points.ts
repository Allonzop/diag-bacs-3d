import type { Equipement } from '../modele/types';
import type { ReferentielPoints, ReglePoints } from '../referentiels';

export interface PointsEquipement {
  equipementId: string;
  points: number;
  regleId: string | null;
}

function normaliser(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

function regleCorrespond(r: ReglePoints, e: Equipement): boolean {
  if (r.type !== e.type) return false;
  if (!r.condition) return true;
  return normaliser(e.attributs[r.condition.attribut]) === normaliser(r.condition.valeur);
}

/** Points câblés d'un équipement d'après `points.json`. Première règle qui correspond ; sinon 0 et `regleId: null`. */
export function pointsEquipement(e: Equipement, ref: ReferentielPoints): PointsEquipement {
  const regle = ref.regles.find((r) => regleCorrespond(r, e));
  return { equipementId: e.id, points: regle?.points ?? 0, regleId: regle?.id ?? null };
}
