import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '../etat/store';
import { departementDe } from '../modele/projet';
import { zoneClimatiqueDuDepartement } from '../referentiels';

export function Accueil() {
  const projets = useApp((s) => s.projets);
  const rafraichir = useApp((s) => s.rafraichirListe);
  const ouvrir = useApp((s) => s.ouvrirProjet);
  const supprimer = useApp((s) => s.supprimer);
  const chargerDemo = useApp((s) => s.chargerDemo);
  const importer = useApp((s) => s.importerDepuisZip);
  const nouveau = useApp((s) => s.nouveauProjet);
  const chargement = useApp((s) => s.chargement);
  const enLigne = useApp((s) => s.enLigne);
  const [formulaire, setFormulaire] = useState(false);
  const [f, setF] = useState({ reference: '', nom: '', adresse: '', codePostal: '' });

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const zone = zoneClimatiqueDuDepartement(departementDe(f.codePostal));

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (!f.reference.trim() || !f.nom.trim()) return;
    void nouveau({ ...f, reference: f.reference.trim(), nom: f.nom.trim() });
  };

  return (
    <div className="page">
      <div className="contenu">
        <div className="accueil-entete">
          <img src="icones/logo-seul.png" alt="" />
          <div>
            <h1>Diag BACS 3D</h1>
            <div className="discret-texte">
              Maquette, métrés et rapport — Alter Watt {enLigne ? '' : '· hors ligne'}
            </div>
          </div>
        </div>

        <div className="carte">
          <div className="actions">
            <button className="principal" onClick={() => setFormulaire((v) => !v)}>
              + Nouveau projet
            </button>
            <button onClick={() => void chargerDemo()} disabled={chargement}>
              Charger le projet démo
            </button>
            <label className="bouton-fichier">
              <button type="button" onClick={(e) => (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.click()}>
                Importer un .zip
              </button>
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => {
                  const fichier = e.target.files?.[0];
                  if (fichier) void importer(fichier);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {formulaire && (
            <form onSubmit={soumettre} style={{ maxWidth: 520, marginTop: 12 }}>
              <label className="champ">
                <span>Référence dossier *</span>
                <input type="text" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} required autoFocus />
              </label>
              <label className="champ">
                <span>Nom du projet *</span>
                <input type="text" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} required />
              </label>
              <label className="champ">
                <span>Adresse</span>
                <input type="text" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} />
              </label>
              <label className="champ">
                <span>Code postal {zone ? `— zone climatique ${zone}` : ''}</span>
                <input type="text" inputMode="numeric" value={f.codePostal} onChange={(e) => setF({ ...f, codePostal: e.target.value })} />
              </label>
              <div className="actions">
                <button className="principal" type="submit">
                  Créer le projet
                </button>
                <button type="button" onClick={() => setFormulaire(false)}>
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>

        <h2>Projets sur cet appareil</h2>
        {projets.length === 0 && <p className="discret-texte">Aucun projet. Créez-en un, chargez la démo ou importez une sauvegarde .zip.</p>}
        <div className="grille-cartes">
          {projets.map((p) => (
            <div className="carte" key={p.id}>
              <h3>{p.nom}</h3>
              <div className="discret-texte">
                {p.reference}
                <br />
                Modifié le {new Date(p.dateModification).toLocaleString('fr-FR')}
                <br />
                {p.dernierExport ? `Sauvegardé le ${new Date(p.dernierExport).toLocaleDateString('fr-FR')}` : 'Jamais exporté en .zip'}
              </div>
              <div className="actions">
                <button className="principal" onClick={() => void ouvrir(p.id)}>
                  Ouvrir
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (window.confirm(`Supprimer « ${p.nom} » de cet appareil ? Pensez à exporter un .zip avant.`)) void supprimer(p.id);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="discret-texte" style={{ marginTop: 24 }}>
          Les projets sont stockés dans ce navigateur. Exportez un .zip régulièrement : c'est la seule sauvegarde.
        </p>
      </div>
    </div>
  );
}
