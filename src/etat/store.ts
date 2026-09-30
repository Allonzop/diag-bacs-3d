import { create } from 'zustand';
import { projetDemo } from '../modele/demo';
import { nouvelId } from '../modele/ids';
import { creerProjet, departementDe } from '../modele/projet';
import type { Fichier, Id, Projet, TypeEquipement } from '../modele/types';
import { referentielMetres, versionsReferentiels, zoneClimatiqueDuDepartement } from '../referentiels';
import {
  chargerProjet,
  enregistrerFichier,
  enregistrerProjet,
  fichiersDuProjet,
  listerProjets,
  supprimerProjet,
  type ResumeProjet,
} from '../stockage/db';
import { exporterZip, importerZip, nomFichierExport } from '../stockage/zip';

export type Vue = '2d' | '3d' | 'metres' | 'projet';
export type Outil = 'selection' | 'rectangle' | 'polygone' | 'equipement' | 'placer' | 'lier' | 'calage';

export interface Selection {
  genre: 'local' | 'equipement' | 'niveau' | 'zone';
  id: Id;
}

export interface Message {
  texte: string;
  genre: 'info' | 'erreur' | 'succes';
}

export interface EtatApp {
  projet: Projet | null;
  projets: ResumeProjet[];
  chargement: boolean;
  vue: Vue;
  niveauCourantId: Id | null;
  selection: Selection | null;
  outil: Outil;
  typeEquipementOutil: TypeEquipement;
  /** Équipement du bac « À placer » en cours de placement (outil `placer`). */
  equipementAPlacerId: Id | null;
  niveauxMasques3D: Id[];
  panneauOuvert: boolean;
  message: Message | null;
  enLigne: boolean;

  rafraichirListe: () => Promise<void>;
  ouvrirProjet: (id: Id) => Promise<void>;
  fermerProjet: () => void;
  nouveauProjet: (o: { reference: string; nom: string; adresse: string; codePostal: string }) => Promise<void>;
  chargerDemo: () => Promise<void>;
  supprimer: (id: Id) => Promise<void>;
  importerDepuisZip: (fichier: Blob) => Promise<void>;
  exporterVersZip: () => Promise<void>;
  /** Modification immuable du projet courant, avec sauvegarde automatique. */
  modifier: (fn: (p: Projet) => void) => void;
  ajouterFichier: (f: Omit<Fichier, 'projetId'>) => Promise<void>;

  setVue: (v: Vue) => void;
  setNiveauCourant: (id: Id | null) => void;
  selectionner: (s: Selection | null) => void;
  setOutil: (o: Outil) => void;
  setTypeEquipementOutil: (t: TypeEquipement) => void;
  commencerPlacement: (equipementId: Id) => void;
  basculerNiveau3D: (id: Id) => void;
  setPanneauOuvert: (ouvert: boolean) => void;
  afficher: (texte: string, genre?: Message['genre']) => void;
  setEnLigne: (v: boolean) => void;
}

let minuterieSauvegarde: ReturnType<typeof setTimeout> | null = null;
let projetEnAttente: Projet | null = null;

function planifierSauvegarde(p: Projet): void {
  projetEnAttente = p;
  if (minuterieSauvegarde) clearTimeout(minuterieSauvegarde);
  minuterieSauvegarde = setTimeout(() => {
    minuterieSauvegarde = null;
    const aSauver = projetEnAttente;
    projetEnAttente = null;
    if (aSauver) void enregistrerProjet(aSauver);
  }, 300);
}

/** Force l'écriture immédiate (fermeture, export). */
export async function viderSauvegarde(): Promise<void> {
  if (minuterieSauvegarde) {
    clearTimeout(minuterieSauvegarde);
    minuterieSauvegarde = null;
  }
  const aSauver = projetEnAttente;
  projetEnAttente = null;
  if (aSauver) await enregistrerProjet(aSauver);
}

function telecharger(blob: Blob, nom: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

let minuterieMessage: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<EtatApp>()((set, get) => ({
  projet: null,
  projets: [],
  chargement: false,
  vue: '2d',
  niveauCourantId: null,
  selection: null,
  outil: 'selection',
  typeEquipementOutil: 'emetteur',
  equipementAPlacerId: null,
  niveauxMasques3D: [],
  panneauOuvert: false,
  message: null,
  enLigne: typeof navigator === 'undefined' ? true : navigator.onLine,

  rafraichirListe: async () => {
    set({ projets: await listerProjets() });
  },

  ouvrirProjet: async (id) => {
    set({ chargement: true });
    const p = await chargerProjet(id);
    if (!p) {
      set({ chargement: false });
      get().afficher('Projet introuvable.', 'erreur');
      return;
    }
    const premierNiveau = [...p.niveaux].sort((a, b) => a.ordre - b.ordre)[0];
    set({
      projet: p,
      chargement: false,
      vue: '2d',
      niveauCourantId: premierNiveau?.id ?? null,
      selection: null,
      outil: 'selection',
      equipementAPlacerId: null,
      niveauxMasques3D: [],
      panneauOuvert: false,
    });
  },

  fermerProjet: () => {
    void viderSauvegarde().then(() => get().rafraichirListe());
    set({ projet: null, selection: null, niveauCourantId: null });
  },

  nouveauProjet: async (o) => {
    const p = creerProjet({
      ...o,
      zoneClimatique: zoneClimatiqueDuDepartement(departementDe(o.codePostal)),
      coefficientCheminement: referentielMetres.coefficientCheminementDefaut,
      versionsReferentiels: versionsReferentiels(),
    });
    const zoneId = nouvelId('z');
    p.zones.push({ id: zoneId, nom: 'Bâtiment principal', alterId: null });
    const niveauId = nouvelId('n');
    p.niveaux.push({ id: niveauId, zoneId, nom: 'RDC', altitudePlancher: 0, hauteurSousPlafond: 3, ordre: 0, fondDePlan: null, alterId: null });
    await enregistrerProjet(p);
    await get().ouvrirProjet(p.id);
  },

  chargerDemo: async () => {
    const p = projetDemo(versionsReferentiels(), referentielMetres.coefficientCheminementDefaut);
    // La démo est rechargeable : elle écrase sa propre copie, jamais un autre projet.
    p.dateModification = new Date().toISOString();
    await enregistrerProjet(p);
    await get().ouvrirProjet(p.id);
    get().afficher('Projet démo chargé.', 'succes');
  },

  supprimer: async (id) => {
    await supprimerProjet(id);
    await get().rafraichirListe();
  },

  importerDepuisZip: async (fichier) => {
    set({ chargement: true });
    try {
      const lu = await importerZip(fichier);
      await enregistrerProjet(lu.projet);
      for (const f of lu.fichiers) await enregistrerFichier(f);
      await get().ouvrirProjet(lu.projet.id);
      get().afficher(`Projet « ${lu.projet.nom} » importé.`, 'succes');
    } catch (e) {
      set({ chargement: false });
      get().afficher(e instanceof Error ? e.message : 'Import impossible.', 'erreur');
    }
  },

  exporterVersZip: async () => {
    const p = get().projet;
    if (!p) return;
    await viderSauvegarde();
    const fichiers = await fichiersDuProjet(p.id);
    const date = new Date().toISOString();
    const blob = await exporterZip(p, fichiers, date);
    telecharger(blob, nomFichierExport(p));
    get().modifier((q) => {
      q.dernierExport = date;
    });
    get().afficher('Sauvegarde .zip téléchargée.', 'succes');
  },

  modifier: (fn) => {
    const courant = get().projet;
    if (!courant) return;
    const copie = structuredClone(courant);
    fn(copie);
    copie.dateModification = new Date().toISOString();
    set({ projet: copie });
    planifierSauvegarde(copie);
  },

  ajouterFichier: async (f) => {
    const p = get().projet;
    if (!p) return;
    await enregistrerFichier({ ...f, projetId: p.id });
  },

  setVue: (vue) => set({ vue, outil: 'selection', equipementAPlacerId: null }),
  setNiveauCourant: (niveauCourantId) => set({ niveauCourantId, selection: null }),
  selectionner: (selection) => set({ selection, panneauOuvert: selection !== null ? true : get().panneauOuvert }),
  setOutil: (outil) => set({ outil, equipementAPlacerId: outil === 'placer' ? get().equipementAPlacerId : null }),
  setTypeEquipementOutil: (typeEquipementOutil) => set({ typeEquipementOutil, outil: 'equipement' }),
  commencerPlacement: (equipementId) => set({ outil: 'placer', equipementAPlacerId: equipementId, vue: '2d', panneauOuvert: false }),
  basculerNiveau3D: (id) =>
    set((s) => ({
      niveauxMasques3D: s.niveauxMasques3D.includes(id) ? s.niveauxMasques3D.filter((n) => n !== id) : [...s.niveauxMasques3D, id],
    })),
  setPanneauOuvert: (panneauOuvert) => set({ panneauOuvert }),
  afficher: (texte, genre = 'info') => {
    set({ message: { texte, genre } });
    if (minuterieMessage) clearTimeout(minuterieMessage);
    minuterieMessage = setTimeout(() => set({ message: null }), 4000);
  },
  setEnLigne: (enLigne) => set({ enLigne }),
}));
