import { describe, expect, it } from 'vitest';
import { projetDemo } from '../src/modele/demo';
import { SCHEMA_VERSION, type Fichier } from '../src/modele/types';
import { referentielMetres, versionsReferentiels } from '../src/referentiels';
import { ErreurImportZip, exporterZip, importerZip, nomFichierExport, sauvegardeEnRetard } from '../src/stockage/zip';

const demo = () => projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);

describe('export / import .zip', () => {
  it('aller-retour complet avec un fichier binaire', async () => {
    const projet = demo();
    const octets = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
    const fichier: Fichier = { id: 'f_plan', projetId: projet.id, nom: 'plan.png', typeMime: 'image/png', taille: octets.length, blob: new Blob([octets], { type: 'image/png' }) };
    const zip = await exporterZip(projet, [fichier], '2026-10-01T10:00:00.000Z');
    expect(zip.size).toBeGreaterThan(100);

    const lu = await importerZip(await zip.arrayBuffer());
    expect(lu.manifeste.format).toBe('diag-bacs-3d');
    expect(lu.manifeste.schemaVersion).toBe(SCHEMA_VERSION);
    expect(lu.projet).toEqual({ ...projet, dernierExport: '2026-10-01T10:00:00.000Z' });
    expect(lu.fichiers).toHaveLength(1);
    expect(lu.fichiers[0]!.typeMime).toBe('image/png');
    expect(new Uint8Array(await lu.fichiers[0]!.blob.arrayBuffer())).toEqual(octets);
  });

  it('refuse un fichier qui n’est pas une archive de l’app', async () => {
    await expect(importerZip(new Uint8Array([1, 2, 3]))).rejects.toBeInstanceOf(ErreurImportZip);
  });

  it('nom de fichier et rappel de sauvegarde à 7 jours', () => {
    const projet = demo();
    expect(nomFichierExport(projet, new Date('2026-10-01T10:00:00Z'))).toBe('diag-bacs_DEMO-0001_2026-10-01.zip');
    expect(sauvegardeEnRetard(projet, 7, new Date('2026-10-05T00:00:00Z'))).toBe(false);
    expect(sauvegardeEnRetard(projet, 7, new Date('2026-10-08T09:00:00Z'))).toBe(true);
    projet.dernierExport = '2026-10-07T00:00:00Z';
    expect(sauvegardeEnRetard(projet, 7, new Date('2026-10-08T09:00:00Z'))).toBe(false);
  });
});
