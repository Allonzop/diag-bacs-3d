import { useMemo } from 'react';
import { telechargerBlob } from '../dessin/capture';
import { useApp } from '../etat/store';
import { arrondir, metresProjet } from '../metres';
import { metresEnCsv, metresEnJson } from '../metres/export';
import { LIBELLES_TYPES } from '../modele/attributs';
import { niveauxTries } from '../modele/projet';
import { TYPES_EQUIPEMENT } from '../modele/types';
import { referentielMetres, referentielPoints } from '../referentiels';

export function Metres() {
  const projet = useApp((s) => s.projet)!;
  const selectionner = useApp((s) => s.selectionner);
  const setVue = useApp((s) => s.setVue);
  const setNiveauCourant = useApp((s) => s.setNiveauCourant);
  const m = useMemo(() => metresProjet(projet, { points: referentielPoints, metres: referentielMetres }), [projet]);
  const nomEq = (id: string) => projet.equipements.find((e) => e.id === id)?.nom ?? id;
  const typesPresents = TYPES_EQUIPEMENT.filter((t) => m.projet.equipementsParType[t] > 0);

  const voir = (genre: 'local' | 'equipement', id: string, niveauId: string | null) => {
    if (niveauId) setNiveauCourant(niveauId);
    setVue('2d');
    selectionner({ genre, id });
  };

  return (
    <div className="page">
      <div className="contenu">
        <h1>Métrés</h1>
        <div className="actions">
          <button className="principal" onClick={() => telechargerBlob(new Blob([metresEnCsv(projet, m)], { type: 'text/csv;charset=utf-8' }), `metres_${projet.reference}.csv`)}>
            ⤓ CSV
          </button>
          <button onClick={() => telechargerBlob(new Blob([metresEnJson(projet, m)], { type: 'application/json' }), `metres_${projet.reference}.json`)}>
            ⤓ JSON
          </button>
        </div>

        <div className="carte">
          <h2>Surfaces et équipements</h2>
          <div className="defile">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Niveau / local</th>
                  <th className="nombre">Surface m²</th>
                  <th className="nombre">Périmètre m</th>
                  <th className="nombre">Volume m³</th>
                  <th className="nombre">Équip.</th>
                  <th className="nombre">Points</th>
                  {typesPresents.map((t) => (
                    <th key={t} className="nombre" title={LIBELLES_TYPES[t]}>
                      {LIBELLES_TYPES[t].split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projet.zones.map((z) => (
                  <ZoneLignes key={z.id} zoneId={z.id} nom={z.nom} m={m} projet={projet} types={typesPresents} voir={voir} />
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td>Projet</td>
                  <td className="nombre">{arrondir(m.projet.surface)}</td>
                  <td className="nombre">{arrondir(m.projet.perimetre)}</td>
                  <td className="nombre">{arrondir(m.projet.volume)}</td>
                  <td className="nombre">{m.projet.equipements}</td>
                  <td className="nombre">{m.points.total}</td>
                  {typesPresents.map((t) => (
                    <td key={t} className="nombre">
                      {m.projet.equipementsParType[t]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {m.aPlacer.length > 0 && (
            <p className="discret-texte">
              {m.aPlacer.length} équipement(s) non placé(s), comptés dans la zone et le projet seulement : {m.aPlacer.map(nomEq).join(', ')}.
            </p>
          )}
        </div>

        <div className="carte">
          <h2>Liaisons (câbles)</h2>
          <p className="discret-texte">
            Estimée = (|dx| + |dy| + montée au plafond + |Δz niveaux| + descente) × {projet.parametres.coefficientCheminement}. Seuil filaire / radio :{' '}
            {referentielMetres.seuilFilaireRadioM} m.
          </p>
          <div className="defile">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Depuis</th>
                  <th>Vers</th>
                  <th className="nombre">Vol d'oiseau m</th>
                  <th className="nombre">Estimée m</th>
                  <th>Sous-catégorie</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody>
                {m.liaisons.length === 0 && (
                  <tr>
                    <td colSpan={6} className="discret-texte">
                      Aucune liaison. Reliez un équipement à son boîtier avec l'outil « Lier ».
                    </td>
                  </tr>
                )}
                {m.liaisons.map((l) => {
                  const e = projet.equipements.find((q) => q.id === l.equipementId);
                  return (
                    <tr key={l.equipementId} onClick={() => voir('equipement', l.equipementId, e?.niveauId ?? null)} style={{ cursor: 'pointer' }}>
                      <td>{nomEq(l.equipementId)}</td>
                      <td>{nomEq(l.cibleId)}</td>
                      <td className="nombre">{l.calculable ? arrondir(l.volOiseau) : '—'}</td>
                      <td className="nombre">{l.calculable ? arrondir(l.estimee) : '—'}</td>
                      <td>{l.calculable ? l.sousCategorie : 'non placé'}</td>
                      <td className="discret-texte">
                        {l.calculable
                          ? `${arrondir(l.detail.manhattan)} + ${arrondir(l.detail.montee)} + ${arrondir(l.detail.deltaNiveaux)} + ${arrondir(l.detail.descente)}`
                          : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="carte">
          <h2>Points câblés</h2>
          <p className="discret-texte">
            D'après points.json v{referentielPoints.version}. Total : <strong>{m.points.total}</strong> points.
            {m.points.nonReferences.length > 0 && ` ${m.points.nonReferences.length} équipement(s) sans règle de comptage (0 point).`}
          </p>
          <div className="defile">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Équipement</th>
                  <th>Type</th>
                  <th>Règle</th>
                  <th className="nombre">Points</th>
                </tr>
              </thead>
              <tbody>
                {projet.equipements.map((e) => {
                  const pe = m.points.parEquipement[e.id]!;
                  return (
                    <tr key={e.id} onClick={() => voir('equipement', e.id, e.niveauId)} style={{ cursor: 'pointer' }}>
                      <td>{e.nom}</td>
                      <td>{LIBELLES_TYPES[e.type]}</td>
                      <td className={pe.regleId ? '' : 'discret-texte'}>{pe.regleId ?? 'non référencé'}</td>
                      <td className="nombre">{pe.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneLignes({
  zoneId,
  nom,
  m,
  projet,
  types,
  voir,
}: {
  zoneId: string;
  nom: string;
  m: ReturnType<typeof metresProjet>;
  projet: NonNullable<ReturnType<typeof useApp.getState>['projet']>;
  types: readonly (typeof TYPES_EQUIPEMENT)[number][];
  voir: (genre: 'local' | 'equipement', id: string, niveauId: string | null) => void;
}) {
  const z = m.zones[zoneId]!;
  const cellules = (a: typeof z) => (
    <>
      <td className="nombre">{arrondir(a.surface)}</td>
      <td className="nombre">{arrondir(a.perimetre)}</td>
      <td className="nombre">{arrondir(a.volume)}</td>
      <td className="nombre">{a.equipements}</td>
      <td className="nombre">{a.points}</td>
      {types.map((t) => (
        <td key={t} className="nombre">
          {a.equipementsParType[t]}
        </td>
      ))}
    </>
  );
  return (
    <>
      <tr style={{ fontWeight: 600, background: 'var(--bleu-clair)' }}>
        <td>Zone : {nom}</td>
        {cellules(z)}
      </tr>
      {niveauxTries(projet)
        .filter((n) => n.zoneId === zoneId)
        .map((n) => (
          <NiveauLignes key={n.id} niveau={n} m={m} projet={projet} cellules={cellules} voir={voir} />
        ))}
    </>
  );
}

function NiveauLignes({
  niveau,
  m,
  projet,
  cellules,
  voir,
}: {
  niveau: NonNullable<ReturnType<typeof useApp.getState>['projet']>['niveaux'][number];
  m: ReturnType<typeof metresProjet>;
  projet: NonNullable<ReturnType<typeof useApp.getState>['projet']>;
  cellules: (a: ReturnType<typeof metresProjet>['projet']) => React.ReactNode;
  voir: (genre: 'local' | 'equipement', id: string, niveauId: string | null) => void;
}) {
  return (
    <>
      <tr style={{ fontWeight: 600 }}>
        <td>&nbsp;&nbsp;{niveau.nom}</td>
        {cellules(m.niveaux[niveau.id]!)}
      </tr>
      {projet.locaux
        .filter((l) => l.niveauId === niveau.id)
        .map((l) => (
          <tr key={l.id} onClick={() => voir('local', l.id, l.niveauId)} style={{ cursor: 'pointer' }}>
            <td>&nbsp;&nbsp;&nbsp;&nbsp;{l.nom}</td>
            {cellules(m.locaux[l.id]!)}
          </tr>
        ))}
    </>
  );
}
