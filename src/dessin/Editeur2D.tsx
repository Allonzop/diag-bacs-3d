import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { useApp, type Outil } from '../etat/store';
import { centroidePolygone } from '../metres/geometrie';
import { LIBELLES_TYPES, STYLE_TYPES, TYPES_RACCORDEMENT } from '../modele/attributs';
import { nouvelId } from '../modele/ids';
import { creerEquipement, creerLocal, niveauDe, niveauxTries } from '../modele/projet';
import { TYPES_EQUIPEMENT, type Equipement, type Id, type Local, type Point2 } from '../modele/types';
import { referentielMetres } from '../referentiels';
import { useFichierUrl, useTailleElement } from '../ui/hooks';
import { svgEnPng, telechargerBlob } from './capture';
import { aimanter, arrondirGrille, cadrer, ecranVersMonde, localContenant, type Viewport } from './geometrieEditeur';

const SEUIL_GLISSER_PX = 6;
const PAS_GRILLE = referentielMetres.grilleAimantationM;

type Geste =
  | { genre: 'attente'; depart: Point2; cible: Cible | null; pointeurId: number }
  | { genre: 'panoramique'; departEcran: Point2; vueDepart: Viewport }
  | { genre: 'pincement'; distanceDepart: number; centreDepart: Point2; vueDepart: Viewport }
  | { genre: 'rectangle'; depart: Point2; courant: Point2 }
  | { genre: 'equipement'; id: Id; decalage: Point2 }
  | { genre: 'sommet'; localId: Id; index: number }
  | { genre: 'local'; localId: Id; depart: Point2; polygoneDepart: Point2[] };

type Cible = { genre: 'equipement'; id: Id } | { genre: 'sommet'; localId: Id; index: number } | { genre: 'local'; id: Id };

const OUTILS: { id: Outil; libelle: string; touche: string; aide: string }[] = [
  { id: 'selection', libelle: 'Sélection', touche: 'V', aide: 'Touchez un élément pour l’ouvrir. Glissez un équipement ou un sommet pour le déplacer. Glissez le fond pour vous déplacer.' },
  { id: 'rectangle', libelle: 'Rectangle', touche: 'R', aide: 'Glissez pour tracer un local rectangulaire (aimanté sur la grille de 0,5 m).' },
  { id: 'polygone', libelle: 'Polygone', touche: 'P', aide: 'Touchez chaque sommet, puis touchez le premier sommet ou « Terminer ».' },
  { id: 'equipement', libelle: 'Équipement', touche: 'E', aide: 'Touchez le plan pour créer un équipement du type choisi.' },
  { id: 'lier', libelle: 'Lier', touche: 'L', aide: 'Touchez un équipement, puis le boîtier ou l’automate auquel il est raccordé.' },
  { id: 'calage', libelle: 'Caler', touche: 'C', aide: 'Touchez deux points du fond de plan dont vous connaissez la distance réelle.' },
];

export function Editeur2D() {
  const projet = useApp((s) => s.projet)!;
  const niveauId = useApp((s) => s.niveauCourantId);
  const outil = useApp((s) => s.outil);
  const selection = useApp((s) => s.selection);
  const typeOutil = useApp((s) => s.typeEquipementOutil);
  const equipementAPlacerId = useApp((s) => s.equipementAPlacerId);
  const modifier = useApp((s) => s.modifier);
  const selectionner = useApp((s) => s.selectionner);
  const setOutil = useApp((s) => s.setOutil);
  const setTypeOutil = useApp((s) => s.setTypeEquipementOutil);
  const setNiveauCourant = useApp((s) => s.setNiveauCourant);
  const afficher = useApp((s) => s.afficher);

  const niveau = niveauDe(projet, niveauId);
  const [conteneurRef, taille] = useTailleElement<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [vue, setVue] = useState<Viewport>({ cx: 10, cy: 7, ppm: 30 });
  const vueRef = useRef(vue);
  vueRef.current = vue;
  const pointeurs = useRef(new Map<number, Point2>());
  const gesteRef = useRef<Geste | null>(null);
  const [apercuRectangle, setApercuRectangle] = useState<{ a: Point2; b: Point2 } | null>(null);
  const [polygoneEnCours, setPolygoneEnCours] = useState<Point2[]>([]);
  const [pointsCalage, setPointsCalage] = useState<Point2[]>([]);
  const [lierDepuis, setLierDepuis] = useState<Id | null>(null);
  const [curseur, setCurseur] = useState<Point2 | null>(null);

  const locauxNiveau = useMemo(() => projet.locaux.filter((l) => l.niveauId === niveauId), [projet.locaux, niveauId]);
  const equipementsNiveau = useMemo(() => projet.equipements.filter((e) => e.niveauId === niveauId && e.position), [projet.equipements, niveauId]);
  const fond = niveau?.fondDePlan ?? null;
  const fondUrl = useFichierUrl(fond?.fichierId ?? null);
  const largeur = taille.largeur;
  const hauteur = taille.hauteur;

  const recadrer = useCallback(() => {
    const points: Point2[] = [];
    for (const l of locauxNiveau) points.push(...l.polygone);
    for (const e of equipementsNiveau) if (e.position) points.push(e.position);
    if (fond) {
      points.push(fond.decalage, { x: fond.decalage.x + fond.largeurPx * fond.echelle, y: fond.decalage.y + fond.hauteurPx * fond.echelle });
    }
    setVue(cadrer(points, largeur, hauteur));
  }, [locauxNiveau, equipementsNiveau, fond, largeur, hauteur]);

  // Recadrage au changement de niveau et à la première mesure du conteneur.
  const dernierCadrage = useRef<string>('');
  useEffect(() => {
    const cle = `${niveauId}|${largeur > 0 && hauteur > 0}`;
    if (largeur > 0 && hauteur > 0 && dernierCadrage.current !== cle) {
      dernierCadrage.current = cle;
      recadrer();
    }
  }, [niveauId, largeur, hauteur, recadrer]);

  // Réinitialisation des états transitoires quand l'outil change.
  useEffect(() => {
    setPolygoneEnCours([]);
    setPointsCalage([]);
    setLierDepuis(null);
    setApercuRectangle(null);
  }, [outil, niveauId]);

  const versMonde = useCallback(
    (e: { clientX: number; clientY: number }): Point2 => {
      const rect = svgRef.current?.getBoundingClientRect();
      const sx = e.clientX - (rect?.left ?? 0);
      const sy = e.clientY - (rect?.top ?? 0);
      return ecranVersMonde(vueRef.current, largeur, hauteur, sx, sy);
    },
    [largeur, hauteur],
  );
  const versEcran = useCallback((e: { clientX: number; clientY: number }): Point2 => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }, []);

  const porteeSommet = 12 / vue.ppm;
  const aimanterIci = useCallback(
    (p: Point2, exclure?: { localId: string; index: number }) => aimanter(p, locauxNiveau, PAS_GRILLE, 12 / vueRef.current.ppm, exclure),
    [locauxNiveau],
  );

  // ----- Actions sur le modèle -----
  const creerLocalIci = (polygone: Point2[]) => {
    if (!niveau) return;
    const id = nouvelId('l');
    modifier((p) => {
      p.locaux.push(creerLocal(niveau.zoneId, niveau.id, `Local ${p.locaux.filter((l) => l.niveauId === niveau.id).length + 1}`, polygone, '', id));
      // Les équipements posés dans le nouveau local y sont rattachés.
      for (const e of p.equipements) {
        if (e.niveauId === niveau.id && e.position && !e.localId && localContenant(e.position, [p.locaux[p.locaux.length - 1]!])) e.localId = id;
      }
    });
    selectionner({ genre: 'local', id });
  };

  const poserEquipement = (id: Id, point: Point2) => {
    if (!niveau) return;
    modifier((p) => {
      const e = p.equipements.find((q) => q.id === id);
      if (!e) return;
      const local = localContenant(point, p.locaux.filter((l) => l.niveauId === niveau.id));
      e.niveauId = niveau.id;
      e.localId = local?.id ?? null;
      e.zoneId = niveau.zoneId;
      e.position = { x: arrondirGrille(point.x, 0.1), y: arrondirGrille(point.y, 0.1), z: e.position?.z ?? referentielMetres.hauteurPoseDefautM };
    });
  };

  const creerEquipementIci = (point: Point2) => {
    if (!niveau) return;
    const id = nouvelId('e');
    const nom = `${LIBELLES_TYPES[typeOutil]} ${projet.equipements.filter((e) => e.type === typeOutil).length + 1}`;
    modifier((p) => {
      p.equipements.push(creerEquipement(niveau.zoneId, typeOutil, nom, {}, id));
    });
    poserEquipement(id, point);
    selectionner({ genre: 'equipement', id });
  };

  const lier = (depuis: Id, vers: Id) => {
    const cible = projet.equipements.find((e) => e.id === vers);
    if (!cible || !TYPES_RACCORDEMENT.includes(cible.type)) {
      afficher('La cible doit être un boîtier / automate ou une GTB.', 'erreur');
      return;
    }
    if (depuis === vers) return;
    modifier((p) => {
      const e = p.equipements.find((q) => q.id === depuis);
      if (e) e.lieA = vers;
    });
    afficher(`Liaison enregistrée vers « ${cible.nom} ».`, 'succes');
  };

  const calerEchelle = (a: Point2, b: Point2) => {
    if (!niveau?.fondDePlan) return;
    const reponse = window.prompt('Distance réelle entre les deux points (en mètres) :', '10');
    if (reponse === null) return;
    const distance = Number(reponse.replace(',', '.'));
    if (!Number.isFinite(distance) || distance <= 0) {
      afficher('Distance invalide.', 'erreur');
      return;
    }
    const fdp = niveau.fondDePlan;
    const pxA = { x: (a.x - fdp.decalage.x) / fdp.echelle, y: (a.y - fdp.decalage.y) / fdp.echelle };
    const pxB = { x: (b.x - fdp.decalage.x) / fdp.echelle, y: (b.y - fdp.decalage.y) / fdp.echelle };
    const dpx = Math.hypot(pxB.x - pxA.x, pxB.y - pxA.y);
    if (dpx < 1) return;
    const echelle = distance / dpx;
    modifier((p) => {
      const n = p.niveaux.find((q) => q.id === niveau.id);
      if (!n?.fondDePlan) return;
      n.fondDePlan.echelle = echelle;
      // Le premier point reste en place dans le repère du site.
      n.fondDePlan.decalage = { x: a.x - pxA.x * echelle, y: a.y - pxA.y * echelle };
      n.fondDePlan.cale = true;
    });
    afficher(`Échelle calée : ${(1 / echelle).toFixed(1)} px/m.`, 'succes');
    setOutil('selection');
  };

  const supprimerSelection = useCallback(() => {
    if (!selection) return;
    if (selection.genre === 'local') {
      modifier((p) => {
        p.locaux = p.locaux.filter((l) => l.id !== selection.id);
        for (const e of p.equipements) if (e.localId === selection.id) e.localId = null;
      });
      selectionner(null);
    } else if (selection.genre === 'equipement') {
      modifier((p) => {
        p.equipements = p.equipements.filter((e) => e.id !== selection.id);
        for (const e of p.equipements) if (e.lieA === selection.id) e.lieA = null;
      });
      selectionner(null);
    }
  }, [selection, modifier, selectionner]);

  // ----- Clavier (PC) -----
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.tagName === 'SELECT' || cible.isContentEditable)) return;
      const t = e.key.toUpperCase();
      const o = OUTILS.find((x) => x.touche === t);
      if (o && !e.metaKey && !e.ctrlKey) {
        setOutil(o.id);
        return;
      }
      if (e.key === 'Escape') {
        if (polygoneEnCours.length || pointsCalage.length || lierDepuis) {
          setPolygoneEnCours([]);
          setPointsCalage([]);
          setLierDepuis(null);
        } else {
          setOutil('selection');
          selectionner(null);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault();
        supprimerSelection();
      }
      if (e.key === 'Enter' && outil === 'polygone' && polygoneEnCours.length >= 3) {
        creerLocalIci(polygoneEnCours);
        setPolygoneEnCours([]);
      }
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  });

  // ----- Pointeur -----
  const cibleDe = (el: EventTarget | null): Cible | null => {
    const e = (el as Element | null)?.closest?.('[data-genre]') as HTMLElement | null;
    if (!e) return null;
    const genre = e.dataset.genre;
    if (genre === 'equipement') return { genre, id: e.dataset.id! };
    if (genre === 'sommet') return { genre, localId: e.dataset.localId!, index: Number(e.dataset.index) };
    if (genre === 'local') return { genre, id: e.dataset.id! };
    return null;
  };

  const surPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* identifiant de pointeur inconnu (événement synthétique) */
    }
    const ecran = versEcran(e);
    pointeurs.current.set(e.pointerId, ecran);
    if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      gesteRef.current = {
        genre: 'pincement',
        distanceDepart: Math.hypot(b!.x - a!.x, b!.y - a!.y),
        centreDepart: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
        vueDepart: vueRef.current,
      };
      setApercuRectangle(null);
      return;
    }
    gesteRef.current = { genre: 'attente', depart: ecran, cible: cibleDe(e.target), pointeurId: e.pointerId };
  };

  const surPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const ecran = versEcran(e);
    if (pointeurs.current.has(e.pointerId)) pointeurs.current.set(e.pointerId, ecran);
    const monde = versMonde(e);
    if (outil === 'polygone' || outil === 'calage' || outil === 'equipement' || outil === 'placer') setCurseur(monde);
    const g = gesteRef.current;
    if (!g) return;

    if (g.genre === 'pincement') {
      if (pointeurs.current.size < 2) return;
      const [a, b] = [...pointeurs.current.values()];
      const distance = Math.hypot(b!.x - a!.x, b!.y - a!.y);
      const centre = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      const facteur = Math.max(0.05, distance / Math.max(g.distanceDepart, 1));
      const ppm = Math.min(400, Math.max(2, g.vueDepart.ppm * facteur));
      // Le point du monde sous le centre initial reste sous le centre courant.
      const mondeCentre = ecranVersMonde(g.vueDepart, largeur, hauteur, g.centreDepart.x, g.centreDepart.y);
      setVue({ ppm, cx: mondeCentre.x - (centre.x - largeur / 2) / ppm, cy: mondeCentre.y - (centre.y - hauteur / 2) / ppm });
      return;
    }

    if (g.genre === 'attente') {
      if (Math.hypot(ecran.x - g.depart.x, ecran.y - g.depart.y) < SEUIL_GLISSER_PX) return;
      const departMonde = ecranVersMonde(vueRef.current, largeur, hauteur, g.depart.x, g.depart.y);
      // Début d'un glisser : on décide du geste selon l'outil et la cible.
      if (outil === 'selection' && g.cible?.genre === 'equipement') {
        const idEq = g.cible.id;
        const eq = projet.equipements.find((q) => q.id === idEq);
        const pos = eq?.position ?? departMonde;
        gesteRef.current = { genre: 'equipement', id: idEq, decalage: { x: pos.x - departMonde.x, y: pos.y - departMonde.y } };
        selectionner({ genre: 'equipement', id: idEq });
      } else if (outil === 'selection' && g.cible?.genre === 'sommet') {
        gesteRef.current = { genre: 'sommet', localId: g.cible.localId, index: g.cible.index };
      } else if (outil === 'selection' && g.cible?.genre === 'local' && selection?.genre === 'local' && selection.id === g.cible.id) {
        const idLocal = g.cible.id;
        const l = projet.locaux.find((q) => q.id === idLocal);
        gesteRef.current = { genre: 'local', localId: idLocal, depart: departMonde, polygoneDepart: l?.polygone ?? [] };
      } else if (outil === 'rectangle' && !g.cible) {
        gesteRef.current = { genre: 'rectangle', depart: aimanterIci(departMonde), courant: aimanterIci(monde) };
      } else {
        gesteRef.current = { genre: 'panoramique', departEcran: g.depart, vueDepart: vueRef.current };
      }
      return;
    }

    if (g.genre === 'panoramique') {
      setVue({ ...g.vueDepart, cx: g.vueDepart.cx - (ecran.x - g.departEcran.x) / g.vueDepart.ppm, cy: g.vueDepart.cy - (ecran.y - g.departEcran.y) / g.vueDepart.ppm });
    } else if (g.genre === 'rectangle') {
      g.courant = aimanterIci(monde);
      setApercuRectangle({ a: g.depart, b: g.courant });
    } else if (g.genre === 'equipement') {
      const cible = { x: arrondirGrille(monde.x + g.decalage.x, 0.1), y: arrondirGrille(monde.y + g.decalage.y, 0.1) };
      modifier((p) => {
        const eq = p.equipements.find((q) => q.id === g.id);
        if (!eq?.position) return;
        eq.position = { ...eq.position, ...cible };
        eq.localId = localContenant(cible, p.locaux.filter((l) => l.niveauId === eq.niveauId))?.id ?? null;
      });
    } else if (g.genre === 'sommet') {
      const cible = aimanterIci(monde, { localId: g.localId, index: g.index });
      modifier((p) => {
        const l = p.locaux.find((q) => q.id === g.localId);
        if (l && l.polygone[g.index]) l.polygone[g.index] = cible;
      });
    } else if (g.genre === 'local') {
      const dx = arrondirGrille(monde.x - g.depart.x, PAS_GRILLE);
      const dy = arrondirGrille(monde.y - g.depart.y, PAS_GRILLE);
      modifier((p) => {
        const l = p.locaux.find((q) => q.id === g.localId);
        if (l) l.polygone = g.polygoneDepart.map((s) => ({ x: s.x + dx, y: s.y + dy }));
      });
    }
  };

  const surPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointeurs.current.delete(e.pointerId);
    const g = gesteRef.current;
    if (!g) return;
    if (g.genre === 'pincement') {
      if (pointeurs.current.size === 0) gesteRef.current = null;
      return;
    }
    gesteRef.current = null;
    const monde = versMonde(e);

    if (g.genre === 'rectangle') {
      setApercuRectangle(null);
      const a = g.depart;
      const b = g.courant;
      if (Math.abs(b.x - a.x) >= PAS_GRILLE && Math.abs(b.y - a.y) >= PAS_GRILLE) {
        creerLocalIci([
          { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
          { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
          { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
          { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
        ]);
      }
      return;
    }
    if (g.genre !== 'attente') return;

    // Touche simple (sans glisser).
    const cible = g.cible;
    switch (outil) {
      case 'selection':
        if (cible?.genre === 'equipement') selectionner({ genre: 'equipement', id: cible.id });
        else if (cible?.genre === 'local') selectionner({ genre: 'local', id: cible.id });
        else if (cible?.genre === 'sommet') selectionner({ genre: 'local', id: cible.localId });
        else selectionner(null);
        break;
      case 'rectangle':
        break;
      case 'polygone': {
        const p = aimanterIci(monde);
        const premier = polygoneEnCours[0];
        if (premier && polygoneEnCours.length >= 3 && Math.hypot(premier.x - p.x, premier.y - p.y) < porteeSommet * 1.5) {
          creerLocalIci(polygoneEnCours);
          setPolygoneEnCours([]);
        } else if (!polygoneEnCours.some((q) => q.x === p.x && q.y === p.y)) {
          setPolygoneEnCours([...polygoneEnCours, p]);
        }
        break;
      }
      case 'equipement':
        if (cible?.genre === 'equipement') selectionner({ genre: 'equipement', id: cible.id });
        else creerEquipementIci(monde);
        break;
      case 'placer':
        if (equipementAPlacerId) {
          poserEquipement(equipementAPlacerId, monde);
          selectionner({ genre: 'equipement', id: equipementAPlacerId });
          setOutil('selection');
        }
        break;
      case 'lier':
        if (cible?.genre === 'equipement') {
          if (!lierDepuis) {
            setLierDepuis(cible.id);
            selectionner({ genre: 'equipement', id: cible.id });
          } else {
            lier(lierDepuis, cible.id);
            setLierDepuis(null);
          }
        }
        break;
      case 'calage': {
        if (!fond) {
          afficher('Importez d’abord un fond de plan pour ce niveau (panneau → niveau).', 'erreur');
          break;
        }
        const pts = [...pointsCalage, monde];
        if (pts.length === 2) {
          setPointsCalage([]);
          calerEchelle(pts[0]!, pts[1]!);
        } else setPointsCalage(pts);
        break;
      }
    }
  };

  const surPointerCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointeurs.current.delete(e.pointerId);
    if (pointeurs.current.size === 0) {
      gesteRef.current = null;
      setApercuRectangle(null);
    }
  };

  const surMolette = (e: ReactWheelEvent<SVGSVGElement>) => {
    const ecran = versEcran(e);
    const v = vueRef.current;
    const facteur = Math.exp(-e.deltaY * 0.0015);
    const ppm = Math.min(400, Math.max(2, v.ppm * facteur));
    const monde = ecranVersMonde(v, largeur, hauteur, ecran.x, ecran.y);
    setVue({ ppm, cx: monde.x - (ecran.x - largeur / 2) / ppm, cy: monde.y - (ecran.y - hauteur / 2) / ppm });
  };

  const exporterPng = async () => {
    if (!svgRef.current || !niveau) return;
    try {
      const blob = await svgEnPng(svgRef.current, largeur, hauteur);
      telechargerBlob(blob, `plan_${projet.reference}_${niveau.nom.replace(/[^\w-]+/g, '_')}.png`);
    } catch (err) {
      afficher(err instanceof Error ? err.message : 'Export impossible.', 'erreur');
    }
  };

  // ----- Rendu -----
  const ppm = vue.ppm;
  const tailleTexte = 13 / ppm;
  const rayonEquip = 12 / ppm;
  const rayonCible = 22 / ppm;
  const visibleMin = ecranVersMonde(vue, largeur, hauteur, 0, 0);
  const visibleMax = ecranVersMonde(vue, largeur, hauteur, largeur, hauteur);
  const pasGrille = ppm >= 12 ? 1 : ppm >= 4 ? 5 : 10;
  const lignesGrille: { x1: number; y1: number; x2: number; y2: number; majeure: boolean }[] = [];
  if (largeur > 0) {
    for (let x = Math.floor(visibleMin.x / pasGrille) * pasGrille; x <= visibleMax.x; x += pasGrille) {
      lignesGrille.push({ x1: x, y1: visibleMin.y, x2: x, y2: visibleMax.y, majeure: Math.round(x) % (pasGrille * 5) === 0 });
    }
    for (let y = Math.floor(visibleMin.y / pasGrille) * pasGrille; y <= visibleMax.y; y += pasGrille) {
      lignesGrille.push({ x1: visibleMin.x, y1: y, x2: visibleMax.x, y2: y, majeure: Math.round(y) % (pasGrille * 5) === 0 });
    }
  }
  const equipementsParId = useMemo(() => new Map(projet.equipements.map((e) => [e.id, e])), [projet.equipements]);
  const localSelectionne = selection?.genre === 'local' ? locauxNiveau.find((l) => l.id === selection.id) : undefined;
  const aide = outil === 'placer' ? `Touchez le plan pour poser « ${equipementsParId.get(equipementAPlacerId ?? '')?.nom ?? ''} ».` : OUTILS.find((o) => o.id === outil)?.aide;

  return (
    <div ref={conteneurRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {niveau ? (
        <svg
          ref={svgRef}
          className="editeur2d"
          width={largeur}
          height={hauteur}
          onPointerDown={surPointerDown}
          onPointerMove={surPointerMove}
          onPointerUp={surPointerUp}
          onPointerCancel={surPointerCancel}
          onPointerLeave={() => setCurseur(null)}
          onWheel={surMolette}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('text/equipement-id')) e.preventDefault();
          }}
          onDrop={(e) => {
            const id = e.dataTransfer.getData('text/equipement-id');
            if (!id) return;
            e.preventDefault();
            poserEquipement(id, versMonde(e));
            selectionner({ genre: 'equipement', id });
          }}
          role="img"
          aria-label={`Plan du niveau ${niveau.nom}`}
        >
          <g transform={`translate(${largeur / 2 - vue.cx * ppm} ${hauteur / 2 - vue.cy * ppm}) scale(${ppm})`}>
            {fondUrl && fond && (
              <image
                href={fondUrl}
                x={fond.decalage.x}
                y={fond.decalage.y}
                width={fond.largeurPx * fond.echelle}
                height={fond.hauteurPx * fond.echelle}
                opacity={fond.opacite}
                preserveAspectRatio="none"
              />
            )}
            <g data-capture="non">
              {lignesGrille.map((l, i) => (
                <line key={i} className={`grille ${l.majeure ? 'majeure' : ''}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
              ))}
            </g>

            {locauxNiveau.map((l) => (
              <LocalSvg key={l.id} local={l} selectionne={selection?.genre === 'local' && selection.id === l.id} tailleTexte={tailleTexte} />
            ))}

            {equipementsNiveau.map((e) => {
              if (!e.lieA || !e.position) return null;
              const cible = equipementsParId.get(e.lieA);
              if (!cible?.position) return null;
              const memeNiveau = cible.niveauId === e.niveauId;
              return (
                <line
                  key={`liaison-${e.id}`}
                  className={`liaison ${memeNiveau ? '' : 'autre-niveau'}`}
                  x1={e.position.x}
                  y1={e.position.y}
                  x2={cible.position.x}
                  y2={cible.position.y}
                />
              );
            })}

            {equipementsNiveau.map((e) => (
              <EquipementSvg
                key={e.id}
                equipement={e}
                rayon={rayonEquip}
                rayonCible={rayonCible}
                tailleTexte={tailleTexte}
                selectionne={(selection?.genre === 'equipement' && selection.id === e.id) || lierDepuis === e.id}
                avecNom={ppm >= 28}
              />
            ))}

            {localSelectionne &&
              outil === 'selection' &&
              localSelectionne.polygone.map((s, i) => (
                <circle key={i} className="sommet" data-capture="non" data-genre="sommet" data-local-id={localSelectionne.id} data-index={i} cx={s.x} cy={s.y} r={rayonEquip * 0.8} style={{ cursor: 'move' }} />
              ))}

            {apercuRectangle && (
              <rect
                className="apercu"
                data-capture="non"
                x={Math.min(apercuRectangle.a.x, apercuRectangle.b.x)}
                y={Math.min(apercuRectangle.a.y, apercuRectangle.b.y)}
                width={Math.abs(apercuRectangle.b.x - apercuRectangle.a.x)}
                height={Math.abs(apercuRectangle.b.y - apercuRectangle.a.y)}
              />
            )}
            {apercuRectangle && (
              <text className="etiquette" data-capture="non" x={(apercuRectangle.a.x + apercuRectangle.b.x) / 2} y={(apercuRectangle.a.y + apercuRectangle.b.y) / 2} fontSize={tailleTexte}>
                {Math.abs(apercuRectangle.b.x - apercuRectangle.a.x).toFixed(1)} × {Math.abs(apercuRectangle.b.y - apercuRectangle.a.y).toFixed(1)} m
              </text>
            )}
            {polygoneEnCours.length > 0 && (
              <g data-capture="non">
                <polyline className="apercu" points={[...polygoneEnCours, ...(curseur ? [aimanterIci(curseur)] : [])].map((p) => `${p.x},${p.y}`).join(' ')} fill="none" />
                {polygoneEnCours.map((p, i) => (
                  <circle key={i} className="sommet" cx={p.x} cy={p.y} r={i === 0 ? rayonEquip : rayonEquip * 0.6} />
                ))}
              </g>
            )}
            {(outil === 'polygone' || outil === 'rectangle') && curseur && !apercuRectangle && (
              <circle data-capture="non" cx={aimanterIci(curseur).x} cy={aimanterIci(curseur).y} r={rayonEquip * 0.5} fill="#FFC40B" />
            )}
            {pointsCalage.map((p, i) => (
              <g key={i} data-capture="non">
                <circle cx={p.x} cy={p.y} r={rayonEquip} fill="none" stroke="#FFC40B" strokeWidth={3 / ppm} />
                <line x1={p.x - rayonEquip * 1.5} x2={p.x + rayonEquip * 1.5} y1={p.y} y2={p.y} stroke="#07072D" strokeWidth={1 / ppm} />
                <line y1={p.y - rayonEquip * 1.5} y2={p.y + rayonEquip * 1.5} x1={p.x} x2={p.x} stroke="#07072D" strokeWidth={1 / ppm} />
              </g>
            ))}
          </g>
          <text x={10} y={hauteur - 10} fontSize={12} fill="#07072D" fontFamily="Open Sans, sans-serif">
            {projet.nom} — {niveau.nom} — échelle 1 m = {ppm.toFixed(0)} px
          </text>
        </svg>
      ) : (
        <div className="page">
          <p>Aucun niveau. Créez-en un depuis le panneau.</p>
        </div>
      )}

      <div className="barre-haut">
        <select value={niveauId ?? ''} onChange={(e) => setNiveauCourant(e.target.value || null)} aria-label="Niveau affiché">
          {niveauxTries(projet).map((n) => (
            <option key={n.id} value={n.id}>
              {projet.zones.length > 1 ? `${projet.zones.find((z) => z.id === n.zoneId)?.nom} — ` : ''}
              {n.nom}
            </option>
          ))}
        </select>
        {outil === 'polygone' && polygoneEnCours.length >= 3 && (
          <button
            className="accent"
            onClick={() => {
              creerLocalIci(polygoneEnCours);
              setPolygoneEnCours([]);
            }}
          >
            Terminer le local
          </button>
        )}
        {(polygoneEnCours.length > 0 || pointsCalage.length > 0 || lierDepuis) && (
          <button
            onClick={() => {
              setPolygoneEnCours([]);
              setPointsCalage([]);
              setLierDepuis(null);
            }}
          >
            Annuler
          </button>
        )}
        {aide && <div className="aide-outil">{aide}</div>}
      </div>

      <div className="barre-outils">
        <div className="groupe" role="toolbar" aria-label="Outils de dessin">
          {OUTILS.map((o) => (
            <button key={o.id} className={outil === o.id ? 'actif' : ''} onClick={() => setOutil(o.id)} title={`${o.libelle} (${o.touche})`} disabled={o.id === 'calage' && !fond}>
              {o.libelle}
            </button>
          ))}
          {outil === 'equipement' && (
            <select value={typeOutil} onChange={(e) => setTypeOutil(e.target.value as Equipement['type'])} aria-label="Type d'équipement" style={{ width: 'auto' }}>
              {TYPES_EQUIPEMENT.map((t) => (
                <option key={t} value={t}>
                  {LIBELLES_TYPES[t]}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="groupe">
          {selection && (selection.genre === 'local' || selection.genre === 'equipement') && (
            <button className="danger" onClick={supprimerSelection} title="Supprimer la sélection (Suppr)">
              Supprimer
            </button>
          )}
          <button className="icone" onClick={() => setVue((v) => ({ ...v, ppm: Math.min(400, v.ppm * 1.25) }))} aria-label="Zoom avant">
            +
          </button>
          <button className="icone" onClick={() => setVue((v) => ({ ...v, ppm: Math.max(2, v.ppm / 1.25) }))} aria-label="Zoom arrière">
            −
          </button>
          <button onClick={recadrer} title="Cadrer le niveau">
            Cadrer
          </button>
          <button onClick={() => void exporterPng()} title="Exporter le plan en PNG">
            ⤓ PNG
          </button>
        </div>
      </div>
    </div>
  );
}

function LocalSvg({ local, selectionne, tailleTexte }: { local: Local; selectionne: boolean; tailleTexte: number }) {
  if (local.polygone.length < 3) return null;
  const c = centroidePolygone(local.polygone);
  return (
    <g>
      <polygon className={`local-forme ${selectionne ? 'selectionne' : ''}`} data-genre="local" data-id={local.id} points={local.polygone.map((p) => `${p.x},${p.y}`).join(' ')} />
      <text className="etiquette" x={c.x} y={c.y} fontSize={tailleTexte}>
        {local.nom}
      </text>
    </g>
  );
}

function EquipementSvg({
  equipement: e,
  rayon,
  rayonCible,
  tailleTexte,
  selectionne,
  avecNom,
}: {
  equipement: Equipement;
  rayon: number;
  rayonCible: number;
  tailleTexte: number;
  selectionne: boolean;
  avecNom: boolean;
}) {
  if (!e.position) return null;
  const style = STYLE_TYPES[e.type];
  return (
    <g transform={`translate(${e.position.x} ${e.position.y})`}>
      {selectionne && <circle className="equip-selection" r={rayon * 1.5} />}
      <circle r={rayon} fill={style.couleur} stroke="#fff" strokeWidth={rayon * 0.15} />
      <text className="equip-picto" fontSize={rayon * 1.2}>
        {style.picto}
      </text>
      {avecNom && (
        <text className="equip-nom" y={rayon * 2.2} fontSize={tailleTexte * 0.85} strokeWidth={rayon * 0.25}>
          {e.nom}
        </text>
      )}
      <circle className="equip-cible" data-genre="equipement" data-id={e.id} r={rayonCible} />
    </g>
  );
}
