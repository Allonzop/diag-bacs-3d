import { useApp } from '../etat/store';
import { departementDe } from '../modele/projet';
import { referentielMetres, referentielPoints, referentielZonesClimatiques, versionsReferentiels, zoneClimatiqueDuDepartement } from '../referentiels';

export function FicheProjet() {
  const projet = useApp((s) => s.projet)!;
  const modifier = useApp((s) => s.modifier);
  const courantes = versionsReferentiels();
  const perimes = Object.entries(courantes).filter(([k, v]) => projet.versionsReferentiels[k] && projet.versionsReferentiels[k] !== v);

  return (
    <div className="page">
      <div className="contenu" style={{ maxWidth: 720 }}>
        <h1>Projet</h1>
        <div className="carte">
          <label className="champ">
            <span>Référence dossier</span>
            <input type="text" value={projet.reference} onChange={(e) => modifier((p) => void (p.reference = e.target.value))} />
          </label>
          <label className="champ">
            <span>Nom</span>
            <input type="text" value={projet.nom} onChange={(e) => modifier((p) => void (p.nom = e.target.value))} />
          </label>
          <label className="champ">
            <span>Adresse</span>
            <input type="text" value={projet.adresse} onChange={(e) => modifier((p) => void (p.adresse = e.target.value))} />
          </label>
          <label className="champ">
            <span>Code postal — zone climatique : {projet.zoneClimatique ?? 'inconnue'}</span>
            <input
              type="text"
              inputMode="numeric"
              value={projet.codePostal}
              onChange={(e) =>
                modifier((p) => {
                  p.codePostal = e.target.value;
                  p.zoneClimatique = zoneClimatiqueDuDepartement(departementDe(e.target.value));
                })
              }
            />
          </label>
          <label className="champ">
            <span>Coefficient de cheminement des câbles (défaut {referentielMetres.coefficientCheminementDefaut})</span>
            <input
              type="number"
              step="0.05"
              min="1"
              value={projet.parametres.coefficientCheminement}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 0) modifier((p) => void (p.parametres.coefficientCheminement = v));
              }}
            />
          </label>
        </div>

        <h2>Référentiels</h2>
        <div className="carte">
          {perimes.length > 0 && (
            <div className="bandeau" style={{ marginBottom: 12 }}>
              Ce projet a été calculé avec des référentiels plus anciens : {perimes.map(([k]) => k).join(', ')}.
              <button
                onClick={() =>
                  modifier((p) => {
                    p.versionsReferentiels = { ...courantes };
                  })
                }
              >
                Passer aux versions actuelles
              </button>
            </div>
          )}
          <table className="tableau">
            <thead>
              <tr>
                <th>Référentiel</th>
                <th>Version du projet</th>
                <th>Version de l'app</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['metres', referentielMetres],
                ['points', referentielPoints],
                ['zones_climatiques', referentielZonesClimatiques],
              ].map(([k, r]) => {
                const cle = k as string;
                const ref = r as { version: string; date: string };
                return (
                  <tr key={cle}>
                    <td>{cle}</td>
                    <td>{projet.versionsReferentiels[cle] ?? '—'}</td>
                    <td>{ref.version}</td>
                    <td>{ref.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="discret-texte">
            Schéma de données v{projet.schemaVersion}. Créé le {new Date(projet.dateCreation).toLocaleDateString('fr-FR')}, modifié le{' '}
            {new Date(projet.dateModification).toLocaleString('fr-FR')}.
          </p>
        </div>
      </div>
    </div>
  );
}
