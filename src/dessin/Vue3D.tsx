import { OrbitControls, Text } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import policeOpenSans from '@fontsource/open-sans/files/open-sans-latin-600-normal.woff?url';
import { useApp } from '../etat/store';
import { centroidePolygone, surfacePolygone } from '../metres/geometrie';
import { STYLE_TYPES } from '../modele/attributs';
import { niveauxTries } from '../modele/projet';
import type { Equipement, Local, Niveau, Projet } from '../modele/types';
import { canvasEnPng, telechargerBlob } from './capture';

const BLEU_FONCE = '#07072D';
const BLEU_CLAIR = '#EAF0F9';
const JAUNE = '#FFC40B';
/** Teintes de niveaux, dérivées du bleu charte (transparence), pour distinguer les étages. */
const TEINTES_NIVEAUX = ['#3a4a8a', '#5c6fb0', '#8395c9', '#a9b6dc', '#2e3b73', '#4d5c9c'];
const TYPES_BOITE = new Set<Equipement['type']>(['boitier', 'gtb', 'tableau']);

/** Repère : x = x plan, y = altitude, z = y plan. */
function versThree(x: number, altitude: number, y: number): [number, number, number] {
  return [x, altitude, y];
}

export function Vue3D() {
  const projet = useApp((s) => s.projet)!;
  const masques = useApp((s) => s.niveauxMasques3D);
  const basculer = useApp((s) => s.basculerNiveau3D);
  const selection = useApp((s) => s.selection);
  const selectionner = useApp((s) => s.selectionner);
  const afficher = useApp((s) => s.afficher);
  const conteneur = useRef<HTMLDivElement>(null);

  const niveaux = niveauxTries(projet);
  const visibles = niveaux.filter((n) => !masques.includes(n.id));
  const niveauxParId = useMemo(() => new Map(projet.niveaux.map((n) => [n.id, n])), [projet.niveaux]);

  const centre = useMemo(() => {
    const pts = projet.locaux.flatMap((l) => l.polygone);
    if (pts.length === 0) return { x: 10, y: 7, rayon: 20 };
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxY = Math.max(...pts.map((p) => p.y));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, rayon: Math.max(maxX - minX, maxY - minY, 10) };
  }, [projet.locaux]);
  const altitudeMax = Math.max(...niveaux.map((n) => n.altitudePlancher + n.hauteurSousPlafond), 3);

  const equipementsVisibles = useMemo(
    () => projet.equipements.filter((e) => e.position && e.niveauId && !masques.includes(e.niveauId) && niveauxParId.has(e.niveauId)),
    [projet.equipements, masques, niveauxParId],
  );

  const exporterPng = async () => {
    const canvas = conteneur.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      telechargerBlob(await canvasEnPng(canvas), `maquette3d_${projet.reference}.png`);
    } catch (e) {
      afficher(e instanceof Error ? e.message : 'Export impossible.', 'erreur');
    }
  };

  return (
    <div ref={conteneur} className="vue3d" style={{ position: 'relative' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ position: [centre.x + centre.rayon * 0.9, altitudeMax + centre.rayon * 0.8, centre.y + centre.rayon * 1.1], fov: 45, near: 0.1, far: 2000 }}
        onPointerMissed={() => selectionner(null)}
      >
        <color attach="background" args={[BLEU_CLAIR]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[30, 60, 20]} intensity={1.2} />
        <directionalLight position={[-20, 30, -30]} intensity={0.4} />
        <gridHelper args={[Math.ceil(centre.rayon * 4), Math.ceil(centre.rayon * 4), '#c5cfe6', '#dde4f3']} position={[centre.x, -0.01, centre.y]} />

        {visibles.map((n, i) => (
          <NiveauMesh key={n.id} niveau={n} projet={projet} teinte={TEINTES_NIVEAUX[i % TEINTES_NIVEAUX.length]!} selectionId={selection?.genre === 'local' ? selection.id : null} />
        ))}

        <Equipements equipements={equipementsVisibles} niveaux={niveauxParId} selectionId={selection?.genre === 'equipement' ? selection.id : null} />
        <Liaisons projet={projet} equipements={equipementsVisibles} niveaux={niveauxParId} masques={masques} />

        <OrbitControls
          makeDefault
          target={[centre.x, altitudeMax / 2, centre.y]}
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={2}
          maxDistance={500}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>

      <div className="barre-haut">
        <div className="legende3d">
          <strong>Niveaux</strong>
          {niveaux.map((n, i) => (
            <label key={n.id}>
              <input type="checkbox" checked={!masques.includes(n.id)} onChange={() => basculer(n.id)} />
              <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: TEINTES_NIVEAUX[i % TEINTES_NIVEAUX.length] }} />
              {n.nom}
            </label>
          ))}
        </div>
      </div>
      <div className="barre-outils">
        <div className="groupe">
          <span className="discret-texte" style={{ alignSelf: 'center', padding: '0 6px' }}>
            Un doigt : orbite · deux doigts : zoom et déplacement · toucher un objet : fiche
          </span>
          <button onClick={() => void exporterPng()}>⤓ PNG</button>
          <button className="mobile-seulement" onClick={() => useApp.getState().setPanneauOuvert(true)} title="Panneau">
            ☷ Panneau
          </button>
        </div>
      </div>
    </div>
  );
}

function geometrieLocal(local: Local, niveau: Niveau): THREE.ExtrudeGeometry {
  const forme = new THREE.Shape(local.polygone.map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ExtrudeGeometry(forme, { depth: niveau.hauteurSousPlafond, bevelEnabled: false });
  // La forme est dans le plan XY ; on la couche sur XZ, l'extrusion (z) devient la hauteur (y).
  g.rotateX(Math.PI / 2);
  g.translate(0, niveau.altitudePlancher + niveau.hauteurSousPlafond, 0);
  return g;
}

/** Un niveau : un maillage par local (sélection au toucher) et une seule géométrie d'arêtes pour tout le niveau. */
function NiveauMesh({ niveau, projet, teinte, selectionId }: { niveau: Niveau; projet: Projet; teinte: string; selectionId: string | null }) {
  const locaux = useMemo(() => projet.locaux.filter((l) => l.niveauId === niveau.id && l.polygone.length >= 3), [projet.locaux, niveau.id]);
  const geometries = useMemo(() => new Map(locaux.map((l) => [l.id, geometrieLocal(l, niveau)])), [locaux, niveau]);
  const aretes = useMemo(() => {
    const parties = [...geometries.values()].map((g) => new THREE.EdgesGeometry(g, 15));
    const fusion = parties.length ? mergeGeometries(parties) : null;
    parties.forEach((p) => p.dispose());
    return fusion;
  }, [geometries]);
  useEffect(() => () => {
    geometries.forEach((g) => g.dispose());
    aretes?.dispose();
  }, [geometries, aretes]);

  return (
    <group>
      {locaux.map((l) => (
        <LocalMesh key={l.id} local={l} niveau={niveau} geometrie={geometries.get(l.id)!} teinte={teinte} selectionne={selectionId === l.id} />
      ))}
      {aretes && (
        <lineSegments geometry={aretes}>
          <lineBasicMaterial color={BLEU_FONCE} />
        </lineSegments>
      )}
    </group>
  );
}

function LocalMesh({ local, niveau, geometrie, teinte, selectionne }: { local: Local; niveau: Niveau; geometrie: THREE.BufferGeometry; teinte: string; selectionne: boolean }) {
  const selectionner = useApp((s) => s.selectionner);
  const c = centroidePolygone(local.polygone);
  const surClic = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectionner({ genre: 'local', id: local.id });
  };
  return (
    <group>
      <mesh geometry={geometrie} onClick={surClic}>
        <meshStandardMaterial color={selectionne ? JAUNE : teinte} transparent opacity={selectionne ? 0.55 : 0.3} depthWrite={false} />
      </mesh>
      <Text
        position={[c.x, niveau.altitudePlancher + 0.05, c.y]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(0.9, Math.max(0.35, Math.sqrt(surfacePolygone(local.polygone)) * 0.12))}
        color={BLEU_FONCE}
        font={policeOpenSans}
        anchorX="center"
        anchorY="middle"
      >
        {local.nom}
      </Text>
    </group>
  );
}

/**
 * Tous les équipements en deux maillages instanciés (sphères et boîtes) : un appel de dessin chacun,
 * quel que soit le nombre d'équipements. Une sphère invisible plus large sert de cible tactile.
 */
function Equipements({ equipements, niveaux, selectionId }: { equipements: Equipement[]; niveaux: Map<string, Niveau>; selectionId: string | null }) {
  const selectionner = useApp((s) => s.selectionner);
  const spheres = useMemo(() => equipements.filter((e) => !TYPES_BOITE.has(e.type)), [equipements]);
  const boites = useMemo(() => equipements.filter((e) => TYPES_BOITE.has(e.type)), [equipements]);
  const selectionne = selectionId ? equipements.find((e) => e.id === selectionId) : undefined;
  const nivSel = selectionne?.niveauId ? niveaux.get(selectionne.niveauId) : undefined;

  return (
    <group>
      <Instances liste={spheres} niveaux={niveaux} forme="sphere" rayon={0.3} onSelection={(id) => selectionner({ genre: 'equipement', id })} />
      <Instances liste={boites} niveaux={niveaux} forme="boite" rayon={0.5} onSelection={(id) => selectionner({ genre: 'equipement', id })} />
      <Instances liste={equipements} niveaux={niveaux} forme="cible" rayon={0.7} onSelection={(id) => selectionner({ genre: 'equipement', id })} />
      {selectionne?.position && nivSel && (
        <group position={versThree(selectionne.position.x, nivSel.altitudePlancher + selectionne.position.z, selectionne.position.y)}>
          <mesh>
            <sphereGeometry args={[TYPES_BOITE.has(selectionne.type) ? 0.5 : 0.42, 20, 16]} />
            <meshBasicMaterial color={JAUNE} transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <Text position={[0, 0.7, 0]} fontSize={0.45} color={BLEU_FONCE} font={policeOpenSans} anchorX="center" anchorY="bottom" outlineWidth={0.03} outlineColor="#ffffff">
            {selectionne.nom}
          </Text>
        </group>
      )}
    </group>
  );
}

function Instances({
  liste,
  niveaux,
  forme,
  rayon,
  onSelection,
}: {
  liste: Equipement[];
  niveaux: Map<string, Niveau>;
  forme: 'sphere' | 'boite' | 'cible';
  rayon: number;
  onSelection: (id: string) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const matrice = new THREE.Matrix4();
    const couleur = new THREE.Color();
    liste.forEach((e, i) => {
      const n = niveaux.get(e.niveauId!)!;
      matrice.makeTranslation(e.position!.x, n.altitudePlancher + e.position!.z, e.position!.y);
      m.setMatrixAt(i, matrice);
      if (forme !== 'cible') m.setColorAt(i, couleur.set(STYLE_TYPES[e.type].couleur));
    });
    m.count = liste.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [liste, niveaux, forme]);
  if (liste.length === 0) return null;
  return (
    <instancedMesh
      key={liste.length}
      ref={ref}
      args={[undefined, undefined, liste.length]}
      frustumCulled={false}
      onClick={(ev) => {
        ev.stopPropagation();
        const e = ev.instanceId !== undefined ? liste[ev.instanceId] : undefined;
        if (e) onSelection(e.id);
      }}
    >
      {forme === 'boite' ? <boxGeometry args={[rayon, rayon, rayon]} /> : <sphereGeometry args={[rayon, forme === 'cible' ? 8 : 20, forme === 'cible' ? 8 : 16]} />}
      {forme === 'cible' ? <meshBasicMaterial transparent opacity={0} depthWrite={false} /> : <meshStandardMaterial />}
    </instancedMesh>
  );
}

/** Toutes les liaisons visibles dans une seule géométrie de segments pointillés. */
function Liaisons({ projet, equipements, niveaux, masques }: { projet: Projet; equipements: Equipement[]; niveaux: Map<string, Niveau>; masques: string[] }) {
  const geometrie = useMemo(() => {
    const parId = new Map(projet.equipements.map((e) => [e.id, e]));
    const points: number[] = [];
    for (const e of equipements) {
      if (!e.lieA) continue;
      const cible = parId.get(e.lieA);
      if (!cible?.position || !cible.niveauId || masques.includes(cible.niveauId)) continue;
      const na = niveaux.get(e.niveauId!);
      const nb = niveaux.get(cible.niveauId);
      if (!na || !nb) continue;
      points.push(e.position!.x, na.altitudePlancher + e.position!.z, e.position!.y, cible.position.x, nb.altitudePlancher + cible.position.z, cible.position.y);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [projet.equipements, equipements, niveaux, masques]);
  const ref = useRef<THREE.LineSegments>(null);
  useEffect(() => {
    ref.current?.computeLineDistances();
    return () => geometrie.dispose();
  }, [geometrie]);
  if (geometrie.getAttribute('position').count === 0) return null;
  return (
    <lineSegments ref={ref} geometry={geometrie}>
      <lineDashedMaterial color="#2980B9" dashSize={0.4} gapSize={0.25} />
    </lineSegments>
  );
}
