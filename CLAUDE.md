# CLAUDE.md — Diag BACS 3D

Lire dans l'ordre, au début de chaque session : `PRD.md`, puis ce fichier, puis `BACKLOG.md`.
Les questions ouvertes et leurs réponses sont dans `QUESTIONS.md`.

## Règles de travail (PRD §13)

- **Un jalon à la fois**, dans l'ordre J1 → J5. Ne jamais commencer un jalon dont le précédent n'a pas passé ses critères d'acceptation.
- `BACKLOG.md` ne contient que des cases `- [ ]`. Tout ce qui est sous « En attente d'Allonzo — ne pas prendre » ne se prend pas.
- Toute décision non couverte par le PRD va dans `QUESTIONS.md`, section « En attente ». Allonzo répond sous « Réponse : ». Ne pas trancher à sa place.
- **Aucun prix, aucune règle métier en dur dans le code** : tout passe par `referentiels/*.json` (avec `version`, `date`, `source`).
- **Aucune donnée client committée.** Les fichiers de Challans vivent dans `local-data/` (ignoré par git). Les tests utilisent le projet démo synthétique `src/modele/demo.ts`.
- Commits logiques, `npm run verifier` vert avant chaque commit. En fin de session : ce qui est fait, ce qui reste, ce qui est imparfait.
- Interface, code, commentaires et commits **en français**.

## Commandes

```bash
npm install          # dépendances (aucune ressource CDN au runtime)
npm run dev          # serveur de développement Vite
npm run verifier     # tsc strict + vitest  ← à passer avant tout commit
npm run test:watch   # tests en continu
npm run build        # build de production + service worker (dist/)
npm run preview      # sert dist/ pour tester le mode hors ligne
npm run test:e2e     # Playwright sur dist/ (après npm run build) : critères J1, téléphone, charge
```

Bout en bout : `npx playwright install chromium` une fois (ou `CHROMIUM_PATH=/chemin/vers/chromium`). Les tests vivent dans `tests/e2e/*.spec.ts` et tournent sur `vite preview` (port 4173).

## Architecture (PRD §10)

Vite + React 19 + TypeScript strict. three.js via @react-three/fiber et drei. zustand pour l'état, Dexie pour IndexedDB, vite-plugin-pwa pour le service worker, pdf.js embarqué (chargé à la demande), JSZip pour la sauvegarde.

```
referentiels/        Données métier en JSON (version, date, source). Jamais de code.
src/
  modele/            Types (types.ts), schéma et migrations (schema.ts), constructeurs (projet.ts),
                     descripteurs d'attributs par type d'équipement (attributs.ts), projet démo (demo.ts).
  metres/            Fonctions pures : géométrie, câbles (cables.ts), points (points.ts), agrégation (index.ts), export CSV/JSON.
  dessin/            Éditeur 2D SVG (Editeur2D.tsx), vue 3D (Vue3D.tsx), fond de plan (fondDePlan.ts), captures PNG (capture.ts).
  stockage/          IndexedDB (db.ts) et .zip (zip.ts).
  etat/              Store zustand (store.ts) : projet courant, sélection, outil, sauvegarde automatique.
  referentiels/      Chargeur typé des JSON de referentiels/.
  ui/                Écrans et panneaux React. styles.css porte la charte.
  moteur/ rapport/ import-alter/   Vides jusqu'aux jalons J2–J4.
tests/               vitest (node) : moteur, métrés, schéma, stockage, historique. Pas de test de rendu React unitaire.
tests/e2e/           Playwright sur le build : parcours J1, téléphone (Pixel 7), test de charge.
local-data/          Données client, ignoré par git.
```

### Modèle de données

Le projet est un seul document JSON stocké à plat : `zones[]`, `niveaux[]`, `locaux[]`, `equipements[]` reliés par clés étrangères (`zoneId`, `niveauId`, `localId`, `lieA`). Les blobs (fonds de plan, photos) sont dans la table `fichiers` d'IndexedDB et référencés par `fichierId`.

- Coordonnées en **mètres**, repère du site partagé par tous les niveaux. `position.z` = hauteur de pose au-dessus du plancher du niveau.
- `position === null` ⇔ équipement dans le bac « À placer ».
- Un local sans géométrie (`polygone: []`) est « à dessiner » (import ALTER, J2).
- `schemaVersion` + migrations chaînées dans `modele/schema.ts`. Toute évolution de structure = nouvelle version + migration + test.
- `versionsReferentiels` mémorise les versions de référentiels utilisées ; l'écran Projet signale un référentiel plus récent.

### Conventions

- Le store expose `modifier(fn)` : clone structurel du projet, mutation dans `fn`, sauvegarde automatique différée (300 ms, forcée sur `pagehide` / onglet masqué). Ne jamais muter `projet` directement.
- Historique : chaque `modifier` empile un point d'annulation. Pour un geste continu (glisser), appeler `marquerHistorique()` au début puis `modifier(fn, { historique: 'aucun' })` à chaque mouvement.
- 3D : les équipements sont des `InstancedMesh` (sphères, boîtes, cibles tactiles invisibles), les arêtes d'un niveau une seule `EdgesGeometry` fusionnée, les liaisons un seul `LineSegments` pointillé. Garder ce principe : un appel de dessin par famille, pas par objet.
- Les fonctions de `metres/` et (plus tard) `moteur/` sont **pures et déterministes** : même projet + mêmes référentiels → même résultat. Test de non-régression sur le projet démo (`tests/metres-demo.test.ts`).
- Cibles tactiles ≥ 44 px (`--cible`). Les gestes de l'éditeur 2D passent par les Pointer Events (souris, stylet, doigt) ; deux doigts = pincement.
- Charte : Fraunces (titres), Open Sans (texte), `#07072D`, `#EAF0F9`, `#FFC40B` en accent seulement. Les couleurs par type d'équipement (`STYLE_TYPES`) codent la donnée et ne font pas partie de la charte.
- PNG de capture : le plan 2D (SVG rasterisé, sans les éléments `data-capture="non"`) et la vue 3D (`preserveDrawingBuffer`).

### Métrés (J1)

- Longueur estimée d'une liaison `lieA` = (|dx| + |dy| + montée au plafond + |Δz entre planchers| + descente) × coefficient de cheminement (projet, défaut `metres.json`).
- Sous-catégorie filaire / radio : estimée ≤ `seuilFilaireRadioM` (15 m, `metres.json`) → filaire.
- Points câblés : première règle de `points.json` dont le type (et la condition d'attribut éventuelle) correspond ; sinon 0 et « non référencé ».

## Déploiement

- `netlify.toml` : `npm ci && npm run build`, publication de `dist/`. Site Netlify : https://diag-bacs-3d.netlify.app
- `.github/workflows/ci.yml` : typecheck + tests à chaque push. Le job GitHub Pages ne tourne que sur `main`.
- Le service worker pré-cache tout (`globPatterns` dans `vite.config.ts`) : après un premier chargement, l'app tourne en mode avion.
