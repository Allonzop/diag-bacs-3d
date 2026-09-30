import { useMemo } from 'react';
import { preparerFondDePlan, preparerPhoto } from '../dessin/fondDePlan';
import { useApp } from '../etat/store';
import { metresProjet, arrondir } from '../metres';
import { ATTRIBUTS_PAR_TYPE, LIBELLES_TYPES, STYLE_TYPES, TYPES_RACCORDEMENT, valeurAttributTexte } from '../modele/attributs';
import { nouvelId } from '../modele/ids';
import { creerEquipement, equipementDe, localDe, niveauDe, niveauxTries, zoneDe } from '../modele/projet';
import { TYPES_EQUIPEMENT, type Equipement, type Local, type Niveau, type Photo, type TypeEquipement, type Zone } from '../modele/types';
import { referentielMetres, referentielPoints } from '../referentiels';
import { supprimerFichier } from '../stockage/db';
import { useFichierUrl } from './hooks';

export function Panneau() {
  const projet = useApp((s) => s.projet)!;
  const ouvert = useApp((s) => s.panneauOuvert);
  const setOuvert = useApp((s) => s.setPanneauOuvert);
  const selection = useApp((s) => s.selection);

  return (
    <aside className={`panneau ${ouvert ? 'ouvert' : ''}`} aria-label="Panneau du projet">
      <button className="fermer-panneau icone discret" onClick={() => setOuvert(false)} aria-label="Fermer le panneau">
        ✕
      </button>
      {selection && (
        <section>
          <h3>
            Sélection
            <button className="discret" onClick={() => useApp.getState().selectionner(null)}>
              Fermer
            </button>
          </h3>
          {selection.genre === 'niveau' && niveauDe(projet, selection.id) && <FicheNiveau niveau={niveauDe(projet, selection.id)!} />}
          {selection.genre === 'zone' && zoneDe(projet, selection.id) && <FicheZone zone={zoneDe(projet, selection.id)!} />}
          {selection.genre === 'local' && localDe(projet, selection.id) && <FicheLocal local={localDe(projet, selection.id)!} />}
          {selection.genre === 'equipement' && equipementDe(projet, selection.id) && <FicheEquipement equipement={equipementDe(projet, selection.id)!} />}
        </section>
      )}
      <Structure />
      <APlacer />
    </aside>
  );
}

function Structure() {
  const projet = useApp((s) => s.projet)!;
  const niveauCourantId = useApp((s) => s.niveauCourantId);
  const setNiveauCourant = useApp((s) => s.setNiveauCourant);
  const selectionner = useApp((s) => s.selectionner);
  const modifier = useApp((s) => s.modifier);
  const selection = useApp((s) => s.selection);

  const ajouterZone = () => {
    const id = nouvelId('z');
    modifier((p) => {
      p.zones.push({ id, nom: `Bâtiment ${p.zones.length + 1}`, alterId: null });
    });
    selectionner({ genre: 'zone', id });
  };
  const ajouterNiveau = (zone: Zone) => {
    const id = nouvelId('n');
    modifier((p) => {
      const existants = p.niveaux.filter((n) => n.zoneId === zone.id).sort((a, b) => a.ordre - b.ordre);
      const dernier = existants[existants.length - 1];
      const altitude = dernier ? dernier.altitudePlancher + dernier.hauteurSousPlafond + 0.3 : 0;
      p.niveaux.push({
        id,
        zoneId: zone.id,
        nom: dernier ? `R+${existants.length}` : 'RDC',
        altitudePlancher: arrondir(altitude, 2),
        hauteurSousPlafond: dernier?.hauteurSousPlafond ?? 3,
        ordre: existants.length,
        fondDePlan: null,
        alterId: null,
      });
    });
    setNiveauCourant(id);
    selectionner({ genre: 'niveau', id });
  };

  return (
    <section>
      <h3>
        Zones et niveaux
        <button className="discret" onClick={ajouterZone}>
          + Zone
        </button>
      </h3>
      {projet.zones.map((z) => (
        <div key={z.id} style={{ marginBottom: 8 }}>
          <ul className="liste">
            <li className={selection?.genre === 'zone' && selection.id === z.id ? 'actif' : ''} onClick={() => selectionner({ genre: 'zone', id: z.id })}>
              <strong className="etire">{z.nom}</strong>
              <button
                className="discret"
                onClick={(e) => {
                  e.stopPropagation();
                  ajouterNiveau(z);
                }}
              >
                + Niveau
              </button>
            </li>
            {niveauxTries(projet)
              .filter((n) => n.zoneId === z.id)
              .map((n) => (
                <li
                  key={n.id}
                  className={n.id === niveauCourantId ? 'actif' : ''}
                  style={{ paddingLeft: 18 }}
                  onClick={() => {
                    setNiveauCourant(n.id);
                    selectionner({ genre: 'niveau', id: n.id });
                  }}
                >
                  <span className="etire">{n.nom}</span>
                  <span className="discret-texte">
                    {projet.locaux.filter((l) => l.niveauId === n.id).length} loc. · {projet.equipements.filter((e) => e.niveauId === n.id && e.position).length} éq.
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function APlacer() {
  const projet = useApp((s) => s.projet)!;
  const commencer = useApp((s) => s.commencerPlacement);
  const selectionner = useApp((s) => s.selectionner);
  const modifier = useApp((s) => s.modifier);
  const selection = useApp((s) => s.selection);
  const aPlacer = projet.equipements.filter((e) => !e.position);

  const ajouter = (type: TypeEquipement) => {
    const zoneId = projet.zones[0]?.id;
    if (!zoneId) return;
    const id = nouvelId('e');
    modifier((p) => {
      p.equipements.push(creerEquipement(zoneId, type, `${LIBELLES_TYPES[type]} ${p.equipements.filter((e) => e.type === type).length + 1}`, {}, id));
    });
    selectionner({ genre: 'equipement', id });
  };

  return (
    <section>
      <h3>À placer ({aPlacer.length})</h3>
      <label className="champ">
        <span>Ajouter un équipement dans le bac</span>
        <select value="" onChange={(e) => e.target.value && ajouter(e.target.value as TypeEquipement)}>
          <option value="">Choisir un type…</option>
          {TYPES_EQUIPEMENT.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TYPES[t]}
            </option>
          ))}
        </select>
      </label>
      {aPlacer.length === 0 && <p className="discret-texte">Tous les équipements sont placés. L'import ALTER (jalon 2) remplira ce bac.</p>}
      <ul className="liste">
        {aPlacer.map((e) => (
          <li
            key={e.id}
            className={selection?.genre === 'equipement' && selection.id === e.id ? 'actif' : ''}
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData('text/equipement-id', e.id);
              ev.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => selectionner({ genre: 'equipement', id: e.id })}
          >
            <PuceType type={e.type} />
            <span className="etire">{e.nom}</span>
            <button
              className="accent"
              onClick={(ev) => {
                ev.stopPropagation();
                commencer(e.id);
              }}
            >
              Placer
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PuceType({ type }: { type: TypeEquipement }) {
  const s = STYLE_TYPES[type];
  return (
    <span className="puce-type" style={{ background: s.couleur }} title={LIBELLES_TYPES[type]}>
      {s.picto}
    </span>
  );
}

function FicheZone({ zone }: { zone: Zone }) {
  const projet = useApp((s) => s.projet)!;
  const modifier = useApp((s) => s.modifier);
  const selectionner = useApp((s) => s.selectionner);
  const vide = !projet.niveaux.some((n) => n.zoneId === zone.id) && !projet.equipements.some((e) => e.zoneId === zone.id);
  return (
    <div>
      <label className="champ">
        <span>Nom de la zone (bâtiment)</span>
        <input type="text" value={zone.nom} onChange={(e) => modifier((p) => void (p.zones.find((z) => z.id === zone.id)!.nom = e.target.value))} />
      </label>
      <button
        className="danger"
        disabled={!vide || projet.zones.length <= 1}
        title={vide ? '' : 'La zone doit être vide pour être supprimée'}
        onClick={() => {
          modifier((p) => void (p.zones = p.zones.filter((z) => z.id !== zone.id)));
          selectionner(null);
        }}
      >
        Supprimer la zone
      </button>
    </div>
  );
}

function FicheNiveau({ niveau }: { niveau: Niveau }) {
  const projet = useApp((s) => s.projet)!;
  const modifier = useApp((s) => s.modifier);
  const ajouterFichier = useApp((s) => s.ajouterFichier);
  const afficher = useApp((s) => s.afficher);
  const setOutil = useApp((s) => s.setOutil);
  const setVue = useApp((s) => s.setVue);
  const setNiveauCourant = useApp((s) => s.setNiveauCourant);
  const selectionner = useApp((s) => s.selectionner);
  const setOuvert = useApp((s) => s.setPanneauOuvert);
  const maj = (fn: (n: Niveau) => void) => modifier((p) => fn(p.niveaux.find((n) => n.id === niveau.id)!));
  const nbLocaux = projet.locaux.filter((l) => l.niveauId === niveau.id).length;
  const nbEq = projet.equipements.filter((e) => e.niveauId === niveau.id).length;

  const importerFond = async (fichier: File) => {
    try {
      const prep = await preparerFondDePlan(fichier);
      const fichierId = nouvelId('f');
      await ajouterFichier({ id: fichierId, nom: fichier.name, typeMime: prep.blob.type || 'image/png', taille: prep.blob.size, blob: prep.blob });
      const ancien = niveau.fondDePlan?.fichierId;
      maj((n) => {
        // Échelle par défaut : le plan occupe 30 m de large, en attendant le calage.
        const echelle = n.fondDePlan?.cale ? n.fondDePlan.echelle : 30 / prep.largeurPx;
        n.fondDePlan = { fichierId, largeurPx: prep.largeurPx, hauteurPx: prep.hauteurPx, echelle, decalage: n.fondDePlan?.decalage ?? { x: 0, y: 0 }, opacite: n.fondDePlan?.opacite ?? 0.6, cale: n.fondDePlan?.cale ?? false };
      });
      if (ancien) await supprimerFichier(ancien);
      afficher('Fond de plan importé. Calez l’échelle avec l’outil « Caler ».', 'succes');
    } catch (e) {
      afficher(e instanceof Error ? e.message : 'Import du fond impossible.', 'erreur');
    }
  };

  const dupliquer = () => {
    const id = nouvelId('n');
    modifier((p) => {
      const src = p.niveaux.find((n) => n.id === niveau.id)!;
      const ordre = Math.max(...p.niveaux.filter((n) => n.zoneId === src.zoneId).map((n) => n.ordre)) + 1;
      p.niveaux.push({
        ...structuredClone(src),
        id,
        nom: `${src.nom} (copie)`,
        altitudePlancher: arrondir(src.altitudePlancher + src.hauteurSousPlafond + 0.3, 2),
        ordre,
        alterId: null,
      });
      for (const l of p.locaux.filter((q) => q.niveauId === niveau.id)) {
        p.locaux.push({ ...structuredClone(l), id: nouvelId('l'), niveauId: id, alterId: null });
      }
    });
    setNiveauCourant(id);
    selectionner({ genre: 'niveau', id });
    afficher('Niveau dupliqué avec ses locaux (sans les équipements).', 'succes');
  };

  return (
    <div>
      <label className="champ">
        <span>Nom du niveau</span>
        <input type="text" value={niveau.nom} onChange={(e) => maj((n) => void (n.nom = e.target.value))} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label className="champ">
          <span>Altitude plancher (m)</span>
          <input type="number" step="0.1" value={niveau.altitudePlancher} onChange={(e) => maj((n) => void (n.altitudePlancher = Number(e.target.value) || 0))} />
        </label>
        <label className="champ">
          <span>Hauteur sous plafond (m)</span>
          <input type="number" step="0.1" min="0.5" value={niveau.hauteurSousPlafond} onChange={(e) => maj((n) => void (n.hauteurSousPlafond = Math.max(0.5, Number(e.target.value) || 0)))} />
        </label>
      </div>
      <label className="champ">
        <span>Ordre d'affichage</span>
        <input type="number" step="1" value={niveau.ordre} onChange={(e) => maj((n) => void (n.ordre = Number(e.target.value) || 0))} />
      </label>

      <h4>Fond de plan</h4>
      <div className="actions">
        <label className="bouton-fichier">
          <button type="button" onClick={(e) => (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.click()}>
            {niveau.fondDePlan ? 'Remplacer' : 'Importer'} (PNG, JPG, PDF)
          </button>
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf,.pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importerFond(f);
              e.target.value = '';
            }}
          />
        </label>
        {niveau.fondDePlan && (
          <>
            <button
              onClick={() => {
                setVue('2d');
                setOutil('calage');
                setOuvert(false);
              }}
            >
              Caler l'échelle
            </button>
            <button
              className="danger"
              onClick={() => {
                const id = niveau.fondDePlan!.fichierId;
                maj((n) => void (n.fondDePlan = null));
                void supprimerFichier(id);
              }}
            >
              Retirer
            </button>
          </>
        )}
      </div>
      {niveau.fondDePlan && (
        <>
          <p className="discret-texte">
            {niveau.fondDePlan.largeurPx} × {niveau.fondDePlan.hauteurPx} px — {niveau.fondDePlan.cale ? `calé : ${(1 / niveau.fondDePlan.echelle).toFixed(1)} px/m` : 'échelle non calée'}
          </p>
          <label className="champ">
            <span>Opacité : {Math.round(niveau.fondDePlan.opacite * 100)} %</span>
            <input type="range" min="0" max="1" step="0.05" value={niveau.fondDePlan.opacite} onChange={(e) => maj((n) => void (n.fondDePlan!.opacite = Number(e.target.value)))} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label className="champ">
              <span>Décalage X (m)</span>
              <input type="number" step="0.5" value={niveau.fondDePlan.decalage.x} onChange={(e) => maj((n) => void (n.fondDePlan!.decalage.x = Number(e.target.value) || 0))} />
            </label>
            <label className="champ">
              <span>Décalage Y (m)</span>
              <input type="number" step="0.5" value={niveau.fondDePlan.decalage.y} onChange={(e) => maj((n) => void (n.fondDePlan!.decalage.y = Number(e.target.value) || 0))} />
            </label>
          </div>
        </>
      )}

      <div className="actions">
        <button onClick={dupliquer}>Dupliquer le niveau</button>
        <button
          className="danger"
          disabled={projet.niveaux.length <= 1}
          onClick={() => {
            if (nbLocaux + nbEq > 0 && !window.confirm(`Supprimer « ${niveau.nom} » avec ${nbLocaux} local(aux) ? Ses ${nbEq} équipement(s) retournent dans « À placer ».`)) return;
            const fichier = niveau.fondDePlan?.fichierId;
            modifier((p) => {
              p.niveaux = p.niveaux.filter((n) => n.id !== niveau.id);
              p.locaux = p.locaux.filter((l) => l.niveauId !== niveau.id);
              for (const e of p.equipements) {
                if (e.niveauId === niveau.id) {
                  e.niveauId = null;
                  e.localId = null;
                  e.position = null;
                }
              }
            });
            if (fichier) void supprimerFichier(fichier);
            const restant = useApp.getState().projet?.niveaux[0]?.id ?? null;
            setNiveauCourant(restant);
            selectionner(null);
          }}
        >
          Supprimer le niveau
        </button>
      </div>
    </div>
  );
}

function FicheLocal({ local }: { local: Local }) {
  const projet = useApp((s) => s.projet)!;
  const modifier = useApp((s) => s.modifier);
  const selectionner = useApp((s) => s.selectionner);
  const m = useMemo(() => metresProjet(projet, { points: referentielPoints, metres: referentielMetres }), [projet]);
  const a = m.locaux[local.id];
  const contenu = projet.equipements.filter((e) => e.localId === local.id);
  const maj = (fn: (l: Local) => void) => modifier((p) => fn(p.locaux.find((l) => l.id === local.id)!));
  return (
    <div>
      <label className="champ">
        <span>Nom du local</span>
        <input type="text" value={local.nom} onChange={(e) => maj((l) => void (l.nom = e.target.value))} />
      </label>
      <label className="champ">
        <span>Type d'usage</span>
        <input type="text" value={local.type} list="types-locaux" onChange={(e) => maj((l) => void (l.type = e.target.value))} />
        <datalist id="types-locaux">
          {['technique', 'bureau', 'enseignement', 'circulation', 'sanitaires', 'restauration', 'salle', 'stockage', 'extérieur'].map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      {a && (
        <p className="discret-texte">
          {niveauDe(projet, local.niveauId)?.nom} — {arrondir(a.surface)} m² · périmètre {arrondir(a.perimetre)} m · {arrondir(a.volume)} m³ · {local.polygone.length} sommets
        </p>
      )}
      {local.polygone.length < 3 && <p className="bandeau">Local « à dessiner » : sans géométrie.</p>}
      <h4>Équipements du local ({contenu.length})</h4>
      <ul className="liste">
        {contenu.map((e) => (
          <li key={e.id} onClick={() => selectionner({ genre: 'equipement', id: e.id })}>
            <PuceType type={e.type} />
            <span className="etire">{e.nom}</span>
          </li>
        ))}
      </ul>
      <button
        className="danger"
        onClick={() => {
          modifier((p) => {
            p.locaux = p.locaux.filter((l) => l.id !== local.id);
            for (const e of p.equipements) if (e.localId === local.id) e.localId = null;
          });
          selectionner(null);
        }}
      >
        Supprimer le local
      </button>
    </div>
  );
}

function FicheEquipement({ equipement: e }: { equipement: Equipement }) {
  const projet = useApp((s) => s.projet)!;
  const modifier = useApp((s) => s.modifier);
  const selectionner = useApp((s) => s.selectionner);
  const commencer = useApp((s) => s.commencerPlacement);
  const ajouterFichier = useApp((s) => s.ajouterFichier);
  const afficher = useApp((s) => s.afficher);
  const setNiveauCourant = useApp((s) => s.setNiveauCourant);
  const setVue = useApp((s) => s.setVue);
  const maj = (fn: (q: Equipement) => void) => modifier((p) => fn(p.equipements.find((q) => q.id === e.id)!));
  const cibles = projet.equipements.filter((q) => TYPES_RACCORDEMENT.includes(q.type) && q.id !== e.id);
  const niveau = niveauDe(projet, e.niveauId);
  const local = localDe(projet, e.localId);
  const m = useMemo(() => metresProjet(projet, { points: referentielPoints, metres: referentielMetres }), [projet]);
  const liaison = m.liaisons.find((l) => l.equipementId === e.id);
  const points = m.points.parEquipement[e.id];

  const ajouterPhoto = async (fichier: File) => {
    try {
      const blob = await preparerPhoto(fichier);
      const fichierId = nouvelId('f');
      await ajouterFichier({ id: fichierId, nom: fichier.name, typeMime: 'image/jpeg', taille: blob.size, blob });
      maj((q) => q.photos.push({ id: nouvelId('ph'), fichierId, legende: '', date: new Date().toISOString() }));
    } catch (err) {
      afficher(err instanceof Error ? err.message : 'Photo impossible.', 'erreur');
    }
  };

  return (
    <div>
      <label className="champ">
        <span>Nom</span>
        <input type="text" value={e.nom} onChange={(ev) => maj((q) => void (q.nom = ev.target.value))} />
      </label>
      <label className="champ">
        <span>Type</span>
        <select value={e.type} onChange={(ev) => maj((q) => void (q.type = ev.target.value as TypeEquipement))}>
          {TYPES_EQUIPEMENT.map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TYPES[t]}
            </option>
          ))}
        </select>
      </label>
      {projet.zones.length > 1 && (
        <label className="champ">
          <span>Zone</span>
          <select value={e.zoneId} onChange={(ev) => maj((q) => void (q.zoneId = ev.target.value))} disabled={!!e.position}>
            {projet.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nom}
              </option>
            ))}
          </select>
        </label>
      )}

      {e.position ? (
        <>
          <p className="discret-texte">
            {niveau?.nom ?? 'niveau ?'} {local ? `— ${local.nom}` : '— hors local'} · x {e.position.x.toFixed(1)} m, y {e.position.y.toFixed(1)} m
            {points && points.points > 0 ? ` · ${points.points} points` : ''}
          </p>
          <label className="champ">
            <span>Hauteur de pose (m au-dessus du plancher)</span>
            <input type="number" step="0.1" min="0" value={e.position.z} onChange={(ev) => maj((q) => void (q.position!.z = Math.max(0, Number(ev.target.value) || 0)))} />
          </label>
          <div className="actions">
            <button
              onClick={() => {
                if (e.niveauId) setNiveauCourant(e.niveauId);
                setVue('2d');
                selectionner({ genre: 'equipement', id: e.id });
              }}
            >
              Voir sur le plan
            </button>
            <button
              onClick={() =>
                maj((q) => {
                  q.position = null;
                  q.niveauId = null;
                  q.localId = null;
                })
              }
            >
              Retirer du plan
            </button>
          </div>
        </>
      ) : (
        <div className="actions">
          <span className="discret-texte">Non placé.</span>
          <button className="accent" onClick={() => commencer(e.id)}>
            Placer sur le plan
          </button>
        </div>
      )}

      <label className="champ">
        <span>Raccordé à (boîtier / automate)</span>
        <select value={e.lieA ?? ''} onChange={(ev) => maj((q) => void (q.lieA = ev.target.value || null))}>
          <option value="">— aucun —</option>
          {cibles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>
      {liaison && (
        <p className="discret-texte">
          {liaison.calculable ? `Câble : ${arrondir(liaison.estimee)} m estimés (${arrondir(liaison.volOiseau)} m à vol d'oiseau) → ${liaison.sousCategorie}` : 'Câble non calculable : placez les deux équipements.'}
        </p>
      )}

      <h4>Attributs</h4>
      {ATTRIBUTS_PAR_TYPE[e.type].map((d) => (
        <label className={d.genre === 'booleen' ? 'ligne' : 'champ'} key={d.cle}>
          {d.genre === 'booleen' ? (
            <>
              <input type="checkbox" checked={e.attributs[d.cle] === true} onChange={(ev) => maj((q) => void (q.attributs[d.cle] = ev.target.checked))} />
              <span>{d.libelle}</span>
            </>
          ) : (
            <>
              <span>
                {d.libelle}
                {d.unite ? ` (${d.unite})` : ''}
              </span>
              {d.genre === 'choix' ? (
                <select value={valeurAttributTexte(e.attributs[d.cle])} onChange={(ev) => maj((q) => void (q.attributs[d.cle] = ev.target.value || null))}>
                  <option value="">—</option>
                  {d.choix!.map((c) => (
                    <option key={c.valeur} value={c.valeur}>
                      {c.libelle}
                    </option>
                  ))}
                </select>
              ) : d.genre === 'nombre' ? (
                <input
                  type="number"
                  step="any"
                  value={valeurAttributTexte(e.attributs[d.cle])}
                  onChange={(ev) => maj((q) => void (q.attributs[d.cle] = ev.target.value === '' ? null : Number(ev.target.value)))}
                />
              ) : (
                <input type="text" value={valeurAttributTexte(e.attributs[d.cle])} onChange={(ev) => maj((q) => void (q.attributs[d.cle] = ev.target.value))} />
              )}
            </>
          )}
        </label>
      ))}

      <h4>Photos ({e.photos.length})</h4>
      <div className="photos">
        {e.photos.map((ph) => (
          <PhotoVignette
            key={ph.id}
            photo={ph}
            supprimer={() => {
              maj((q) => void (q.photos = q.photos.filter((x) => x.id !== ph.id)));
              void supprimerFichier(ph.fichierId);
            }}
          />
        ))}
      </div>
      <label className="bouton-fichier" style={{ display: 'inline-block', marginTop: 8 }}>
        <button type="button" onClick={(ev) => (ev.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.click()}>
          + Photo
        </button>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) void ajouterPhoto(f);
            ev.target.value = '';
          }}
        />
      </label>

      <div className="actions" style={{ marginTop: 16 }}>
        <button
          className="danger"
          onClick={() => {
            modifier((p) => {
              p.equipements = p.equipements.filter((q) => q.id !== e.id);
              for (const q of p.equipements) if (q.lieA === e.id) q.lieA = null;
            });
            for (const ph of e.photos) void supprimerFichier(ph.fichierId);
            selectionner(null);
          }}
        >
          Supprimer l'équipement
        </button>
      </div>
    </div>
  );
}

function PhotoVignette({ photo, supprimer }: { photo: Photo; supprimer: () => void }) {
  const url = useFichierUrl(photo.fichierId);
  return (
    <figure>
      {url ? <img src={url} alt={photo.legende || 'Photo'} /> : <div style={{ width: 96, height: 96, background: 'var(--bleu-clair)', borderRadius: 8 }} />}
      <button className="danger" onClick={supprimer} aria-label="Supprimer la photo">
        ✕
      </button>
    </figure>
  );
}
