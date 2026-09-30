import { SCHEMA_VERSION, type Projet } from './types';

/**
 * Migrations de schéma : une fonction par passage n → n+1.
 * Une donnée d'un schéma plus ancien est migrée en chaîne jusqu'à SCHEMA_VERSION.
 */
type Migration = (donnees: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  // 0 → 1 : premier schéma officiel. Les projets sans schemaVersion (prototypes) reçoivent les champs manquants.
  0: (d) => ({
    ...d,
    schemaVersion: 1,
    parametres: d.parametres ?? { coefficientCheminement: 1.2 },
    versionsReferentiels: d.versionsReferentiels ?? {},
    donneesEnergie: d.donneesEnergie ?? {},
    scenarios: d.scenarios ?? [],
    lignesChiffrage: d.lignesChiffrage ?? [],
    dernierExport: d.dernierExport ?? null,
    zoneClimatique: d.zoneClimatique ?? null,
  }),
};

export class ErreurSchema extends Error {}

/** Migre un objet brut (JSON) vers le schéma courant. Lève ErreurSchema si la version est inconnue ou future. */
export function migrerProjet(brut: unknown): Projet {
  if (typeof brut !== 'object' || brut === null) throw new ErreurSchema('Projet illisible : ce n’est pas un objet JSON.');
  let d = { ...(brut as Record<string, unknown>) };
  let version = typeof d.schemaVersion === 'number' ? d.schemaVersion : 0;
  if (version > SCHEMA_VERSION) {
    throw new ErreurSchema(
      `Ce projet a été créé avec un schéma plus récent (v${version}) que cette version de l’app (v${SCHEMA_VERSION}). Mettez l’app à jour.`,
    );
  }
  while (version < SCHEMA_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) throw new ErreurSchema(`Aucune migration depuis le schéma v${version}.`);
    d = migration(d);
    version = d.schemaVersion as number;
  }
  verifierStructure(d);
  return d as unknown as Projet;
}

function verifierStructure(d: Record<string, unknown>): void {
  for (const cle of ['id', 'reference', 'nom'] as const) {
    if (typeof d[cle] !== 'string') throw new ErreurSchema(`Champ « ${cle} » manquant ou invalide.`);
  }
  for (const cle of ['zones', 'niveaux', 'locaux', 'equipements'] as const) {
    if (!Array.isArray(d[cle])) throw new ErreurSchema(`Liste « ${cle} » manquante.`);
  }
}
