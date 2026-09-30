import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { useApp, viderSauvegarde } from '../src/etat/store';
import { projetDemo } from '../src/modele/demo';
import { referentielMetres, versionsReferentiels } from '../src/referentiels';
import { chargerProjet, enregistrerProjet } from '../src/stockage/db';

describe('annuler / rétablir et sauvegarde automatique', () => {
  beforeEach(async () => {
    const p = projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);
    await enregistrerProjet(p);
    await useApp.getState().ouvrirProjet(p.id);
  });

  it('modifier empile un point d’annulation ; annuler et rétablir le parcourent', async () => {
    const s = useApp.getState;
    expect(s().historique).toEqual({ passe: 0, futur: 0 });
    s().modifier((p) => void (p.nom = 'Un'));
    s().modifier((p) => void (p.nom = 'Deux'));
    expect(s().projet?.nom).toBe('Deux');
    expect(s().historique.passe).toBe(2);
    s().annuler();
    expect(s().projet?.nom).toBe('Un');
    expect(s().historique).toEqual({ passe: 1, futur: 1 });
    s().annuler();
    expect(s().projet?.nom).toBe('École des Tilleuls (démo)');
    s().annuler(); // rien à annuler : sans effet
    expect(s().projet?.nom).toBe('École des Tilleuls (démo)');
    s().retablir();
    s().retablir();
    expect(s().projet?.nom).toBe('Deux');
    expect(s().historique.futur).toBe(0);
    // une nouvelle modification efface le futur
    s().annuler();
    s().modifier((p) => void (p.nom = 'Trois'));
    expect(s().historique.futur).toBe(0);
    await viderSauvegarde();
    expect((await chargerProjet('p_demo'))?.nom).toBe('Trois');
  });

  it('un glisser (historique: aucun) ne crée qu’un point d’annulation, marqué au début du geste', () => {
    const s = useApp.getState;
    s().marquerHistorique();
    for (let i = 1; i <= 10; i++) s().modifier((p) => void (p.equipements[0]!.position!.x = i), { historique: 'aucun' });
    expect(s().projet?.equipements[0]?.position?.x).toBe(10);
    expect(s().historique.passe).toBe(1);
    s().annuler();
    expect(s().projet?.equipements[0]?.position?.x).toBe(1);
  });
});
