import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { projetDemo } from '../src/modele/demo';
import { referentielMetres, versionsReferentiels } from '../src/referentiels';
import { chargerProjet, db, enregistrerFichier, enregistrerProjet, fichiersDuProjet, listerProjets, supprimerProjet } from '../src/stockage/db';

describe('persistance IndexedDB (Dexie)', () => {
  it('enregistre, liste, charge et supprime un projet avec ses fichiers', async () => {
    const p = projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);
    await enregistrerProjet(p);
    await enregistrerFichier({ id: 'f1', projetId: p.id, nom: 'a.png', typeMime: 'image/png', taille: 3, blob: new Blob([new Uint8Array([1, 2, 3])]) });
    expect((await listerProjets()).map((r) => r.id)).toEqual([p.id]);
    expect((await chargerProjet(p.id))?.equipements).toHaveLength(18);
    expect(await fichiersDuProjet(p.id)).toHaveLength(1);
    await supprimerProjet(p.id);
    expect(await listerProjets()).toEqual([]);
    expect(await db.fichiers.count()).toBe(0);
  });
});
