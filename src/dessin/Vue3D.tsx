import { Edges, Line, OrbitControls, Text } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
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
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={[1, 2]}
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

        {projet.equipements.map((e) => {
          if (!e.position || !e.niveauId || masques.includes(e.niveauId)) return null;
          const n = projet.niveaux.find((q) => q.id === e.niveauId);
          if (!n) return null;
          return <EquipementMesh key={e.id} equipement={e} niveau={n} selectionne={selection?.genre === 'equipement' && selection.id === e.id} />;
        })}

        {projet.equipements.map((e) => {
          if (!e.position || !e.lieA || !e.niveauId || masques.includes(e.niveauId)) return null;
          const cible = projet.equipements.find((q) => q.id === e.lieA);
          if (!cible?.position || !cible.niveauId || masques.includes(cible.niveauId)) return null;
          const na = projet.niveaux.find((q) => q.id === e.niveauId)!;
          const nb = projet.niveaux.find((q) => q.id === cible.niveauId)!;
          return (
            <Line
              key={`liaison-${e.id}`}
              points={[versThree(e.position.x, na.altitudePlancher + e.position.z, e.position.y), versThree(cible.position.x, nb.altitudePlancher + cible.position.z, cible.position.y)]}
              color="#2980B9"
              lineWidth={1.5}
              dashed
              dashSize={0.4}
              gapSize={0.25}
            />
          );
        })}

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
        </div>
      </div>
    </div>
  );
}

function NiveauMesh({ niveau, projet, teinte, selectionId }: { niveau: Niveau; projet: Projet; teinte: string; selectionId: string | null }) {
  const locaux = projet.locaux.filter((l) => l.niveauId === niveau.id && l.polygone.length >= 3);
  return (
    <group>
      {locaux.map((l) => (
        <LocalMesh key={l.id} local={l} niveau={niveau} teinte={teinte} selectionne={selectionId === l.id} />
      ))}
    </group>
  );
}

function LocalMesh({ local, niveau, teinte, selectionne }: { local: Local; niveau: Niveau; teinte: string; selectionne: boolean }) {
  const selectionner = useApp((s) => s.selectionner);
  const geometrie = useMemo(() => {
    const forme = new THREE.Shape(local.polygone.map((p) => new THREE.Vector2(p.x, p.y)));
    const g = new THREE.ExtrudeGeometry(forme, { depth: niveau.hauteurSousPlafond, bevelEnabled: false });
    // La forme est dans le plan XY ; on la couche sur XZ, l'extrusion (z) devient la hauteur (y).
    g.rotateX(Math.PI / 2);
    g.translate(0, niveau.altitudePlancher + niveau.hauteurSousPlafond, 0);
    return g;
  }, [local.polygone, niveau.hauteurSousPlafond, niveau.altitudePlancher]);
  const c = centroidePolygone(local.polygone);
  const surClic = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectionner({ genre: 'local', id: local.id });
  };
  return (
    <group>
      <mesh geometry={geometrie} onClick={surClic}>
        <meshStandardMaterial color={selectionne ? JAUNE : teinte} transparent opacity={selectionne ? 0.55 : 0.3} depthWrite={false} side={THREE.DoubleSide} />
        <Edges color={BLEU_FONCE} threshold={15} />
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

function EquipementMesh({ equipement: e, niveau, selectionne }: { equipement: Equipement; niveau: Niveau; selectionne: boolean }) {
  const selectionner = useApp((s) => s.selectionner);
  const pos = e.position!;
  const style = STYLE_TYPES[e.type];
  const p = versThree(pos.x, niveau.altitudePlancher + pos.z, pos.y);
  return (
    <group position={p}>
      <mesh
        onClick={(ev) => {
          ev.stopPropagation();
          selectionner({ genre: 'equipement', id: e.id });
        }}
      >
        {e.type === 'boitier' || e.type === 'gtb' || e.type === 'tableau' ? <boxGeometry args={[0.5, 0.5, 0.5]} /> : <sphereGeometry args={[0.3, 20, 16]} />}
        <meshStandardMaterial color={style.couleur} emissive={selectionne ? JAUNE : '#000000'} emissiveIntensity={selectionne ? 0.6 : 0} />
      </mesh>
      {/* Cible tactile élargie, invisible. */}
      <mesh
        onClick={(ev) => {
          ev.stopPropagation();
          selectionner({ genre: 'equipement', id: e.id });
        }}
      >
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selectionne && (
        <Text position={[0, 0.7, 0]} fontSize={0.45} color={BLEU_FONCE} font={policeOpenSans} anchorX="center" anchorY="bottom" outlineWidth={0.03} outlineColor="#ffffff">
          {e.nom}
        </Text>
      )}
    </group>
  );
}
