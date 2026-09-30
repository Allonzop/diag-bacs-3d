import Dexie, { type EntityTable } from 'dexie';
import type { Fichier, Projet } from '../modele/types';

export interface Preference {
  cle: string;
  valeur: unknown;
}

/** Résumé d'un projet pour la liste d'accueil (évite de charger toutes les géométries). */
export interface ResumeProjet {
  id: string;
  reference: string;
  nom: string;
  dateModification: string;
  dernierExport: string | null;
}

export class BaseDiagBacs extends Dexie {
  projets!: EntityTable<Projet, 'id'>;
  fichiers!: EntityTable<Fichier, 'id'>;
  preferences!: EntityTable<Preference, 'cle'>;

  constructor() {
    super('diag-bacs-3d');
    this.version(1).stores({
      projets: 'id, reference, dateModification',
      fichiers: 'id, projetId',
      preferences: 'cle',
    });
  }
}

export const db = new BaseDiagBacs();

export async function demanderPersistance(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* Safari privé, etc. */
  }
  return false;
}

export async function listerProjets(): Promise<ResumeProjet[]> {
  const tous = await db.projets.orderBy('dateModification').reverse().toArray();
  return tous.map((p) => ({ id: p.id, reference: p.reference, nom: p.nom, dateModification: p.dateModification, dernierExport: p.dernierExport }));
}

export async function chargerProjet(id: string): Promise<Projet | undefined> {
  return db.projets.get(id);
}

export async function enregistrerProjet(p: Projet): Promise<void> {
  await db.projets.put(p);
}

export async function supprimerProjet(id: string): Promise<void> {
  await db.transaction('rw', db.projets, db.fichiers, async () => {
    await db.fichiers.where('projetId').equals(id).delete();
    await db.projets.delete(id);
  });
}

export async function enregistrerFichier(f: Fichier): Promise<void> {
  await db.fichiers.put(f);
}

export async function chargerFichier(id: string): Promise<Fichier | undefined> {
  return db.fichiers.get(id);
}

export async function fichiersDuProjet(projetId: string): Promise<Fichier[]> {
  return db.fichiers.where('projetId').equals(projetId).toArray();
}

export async function supprimerFichier(id: string): Promise<void> {
  await db.fichiers.delete(id);
}
