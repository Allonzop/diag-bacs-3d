import { useEffect } from 'react';
import { Editeur2D } from '../dessin/Editeur2D';
import { Vue3D } from '../dessin/Vue3D';
import { useApp, type Vue } from '../etat/store';
import { sauvegardeEnRetard } from '../stockage/zip';
import { FicheProjet } from './FicheProjet';
import { Metres } from './Metres';
import { Panneau } from './Panneau';

const VUES: { id: Vue; libelle: string; picto: string }[] = [
  { id: '2d', libelle: 'Plan', picto: '▦' },
  { id: '3d', libelle: '3D', picto: '⬡' },
  { id: 'metres', libelle: 'Métrés', picto: '≣' },
  { id: 'projet', libelle: 'Projet', picto: '☰' },
];

export function EcranProjet() {
  const projet = useApp((s) => s.projet)!;
  const vue = useApp((s) => s.vue);
  const setVue = useApp((s) => s.setVue);
  const fermer = useApp((s) => s.fermerProjet);
  const exporter = useApp((s) => s.exporterVersZip);
  const enLigne = useApp((s) => s.enLigne);
  const panneauOuvert = useApp((s) => s.panneauOuvert);
  const setPanneauOuvert = useApp((s) => s.setPanneauOuvert);

  const avecPanneau = vue === '2d' || vue === '3d';

  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => {
      if (sauvegardeEnRetard(projet)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [projet]);

  return (
    <div className={`app ${avecPanneau ? 'avec-panneau' : ''}`}>
      <header className="entete">
        <button className="icone discret" onClick={fermer} aria-label="Retour à l'accueil" title="Accueil">
          ‹
        </button>
        <img className="logo" src="icones/logo-alter-watt-blanc.png" alt="Alter Watt" />
        <div className="titre" title={`${projet.reference} — ${projet.nom}`}>
          {projet.nom}
        </div>
        {!enLigne && <span className="pastille horsligne">Hors ligne</span>}
        <nav aria-label="Vues">
          {VUES.map((v) => (
            <button key={v.id} className={vue === v.id ? 'actif' : ''} onClick={() => setVue(v.id)} title={v.libelle}>
              <span aria-hidden>{v.picto}</span>
              <span className="libelle">{v.libelle}</span>
            </button>
          ))}
        </nav>
        <button className="bureau-seulement" onClick={() => void exporter()} title="Exporter une sauvegarde .zip">
          ⤓ <span className="libelle">.zip</span>
        </button>
        {avecPanneau && (
          <button className="icone bureau-seulement" onClick={() => setPanneauOuvert(!panneauOuvert)} aria-label="Panneau" title="Panneau">
            ☷
          </button>
        )}
      </header>

      {avecPanneau && <Panneau />}

      <main className="principal">
        {sauvegardeEnRetard(projet) && (
          <div className="bandeau" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
            <span>Dernière sauvegarde .zip il y a plus de 7 jours. Le navigateur peut purger les données d'une app inutilisée.</span>
            <button className="principal" onClick={() => void exporter()}>
              Exporter maintenant
            </button>
          </div>
        )}
        {vue === '2d' && <Editeur2D />}
        {vue === '3d' && <Vue3D />}
        {vue === 'metres' && <Metres />}
        {vue === 'projet' && <FicheProjet />}
      </main>
    </div>
  );
}
