import JSZip from 'jszip';
import { migrerProjet } from '../modele/schema';
import { SCHEMA_VERSION, type Fichier, type FichierMeta, type Projet } from '../modele/types';

export const FORMAT_ZIP = 'diag-bacs-3d';

export interface ManifesteZip {
  format: typeof FORMAT_ZIP;
  schemaVersion: number;
  dateExport: string;
  projetId: string;
  fichiers: FichierMeta[];
}

/** Sauvegarde complète : projet.json + fichiers/<id> (photos, fonds de plan) + manifeste. */
export async function exporterZip(projet: Projet, fichiers: Fichier[], dateExport = new Date().toISOString()): Promise<Blob> {
  const zip = new JSZip();
  const manifeste: ManifesteZip = {
    format: FORMAT_ZIP,
    schemaVersion: SCHEMA_VERSION,
    dateExport,
    projetId: projet.id,
    fichiers: fichiers.map(({ id, projetId, nom, typeMime, taille }) => ({ id, projetId, nom, typeMime, taille })),
  };
  zip.file('manifeste.json', JSON.stringify(manifeste, null, 2));
  zip.file('projet.json', JSON.stringify({ ...projet, dernierExport: dateExport }, null, 2));
  const dossier = zip.folder('fichiers')!;
  for (const f of fichiers) dossier.file(f.id, f.blob);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export class ErreurImportZip extends Error {}

export interface ImportZip {
  projet: Projet;
  fichiers: Fichier[];
  manifeste: ManifesteZip;
}

/** Lecture d'un .zip exporté par l'app. Migre le projet vers le schéma courant. */
export async function importerZip(donnees: Blob | ArrayBuffer | Uint8Array): Promise<ImportZip> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(donnees);
  } catch {
    throw new ErreurImportZip('Ce fichier n’est pas une archive .zip lisible.');
  }
  const m = zip.file('manifeste.json');
  const p = zip.file('projet.json');
  if (!m || !p) throw new ErreurImportZip('Archive incomplète : manifeste.json ou projet.json manquant.');
  const manifeste = JSON.parse(await m.async('string')) as ManifesteZip;
  if (manifeste.format !== FORMAT_ZIP) throw new ErreurImportZip('Cette archive ne vient pas de Diag BACS 3D.');
  const projet = migrerProjet(JSON.parse(await p.async('string')));

  const fichiers: Fichier[] = [];
  for (const meta of manifeste.fichiers ?? []) {
    const entree = zip.file(`fichiers/${meta.id}`);
    if (!entree) continue;
    const blob = await entree.async('blob');
    fichiers.push({ ...meta, projetId: projet.id, blob: blob.type ? blob : new Blob([blob], { type: meta.typeMime }) });
  }
  return { projet, fichiers, manifeste };
}

export function nomFichierExport(projet: Projet, date = new Date()): string {
  const j = date.toISOString().slice(0, 10);
  const ref = projet.reference.replace(/[^\w-]+/g, '_') || 'projet';
  return `diag-bacs_${ref}_${j}.zip`;
}

/** Vrai si le dernier export date de plus de `jours` jours (ou n'a jamais eu lieu et le projet a plus de `jours` jours). */
export function sauvegardeEnRetard(projet: Projet, jours = 7, maintenant = new Date()): boolean {
  const repere = projet.dernierExport ?? projet.dateCreation;
  const ecartMs = maintenant.getTime() - new Date(repere).getTime();
  return ecartMs > jours * 24 * 3600 * 1000;
}
