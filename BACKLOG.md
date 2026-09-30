# BACKLOG — Diag BACS 3D

Un jalon à la fois, dans l'ordre. Une case ne se coche que quand `npm run verifier` est vert et que le critère d'acceptation du PRD (§11) est vérifié.

## J1 — Maquette et métrés (échéance 18/10)

Critère : projet démo dessiné, 3D navigable au toucher, métrés et seuil 15 m testés, export/import `.zip`, fonctionne en mode avion.

- [x] Socle Vite + React + TS strict, PWA, polices embarquées, charte
- [x] Modèle de données, schéma versionné, migrations, projet démo synthétique
- [x] Persistance IndexedDB, sauvegarde automatique, `navigator.storage.persist()`, rappel à 7 jours
- [x] Export / import `.zip` (JSON + fichiers)
- [x] Éditeur 2D : fond de plan (image, PDF), calage à l'échelle, opacité, grille 0,5 m, aimantation, rectangle, polygone, sommets, duplication de niveau
- [x] Équipements : bac « À placer », glisser-déposer, création au toucher, hauteur de pose, pictogramme et couleur par type, liaisons `lieA`, photos
- [x] Vue 3D : extrusion des locaux, orbite / zoom / pano au toucher et à la souris, niveaux masquables, sélection → fiche
- [x] Captures PNG du plan de chaque niveau et de la vue 3D
- [x] Métrés : surfaces, périmètres, volumes, comptages, câbles (vol d'oiseau, estimée), seuil 15 m, points, export CSV/JSON, tests unitaires
- [x] Référentiels `metres.json`, `points.json` (partiel), `zones_climatiques.json`
- [x] Déploiement Netlify + CI GitHub Actions
- [x] Annuler / rétablir (Ctrl+Z, Ctrl+Maj+Z, boutons), sauvegarde forcée en arrière-plan, confirmation avant d'écraser un projet à l'import
- [x] Tests de bout en bout Playwright sur le build (critères J1, téléphone, charge 10 niveaux / 150 locaux / 500 équipements)
- [x] 3D : équipements instanciés, arêtes fusionnées par niveau, liaisons en une géométrie
- [ ] Validation par Allonzo sur téléphone et iPad (gestes, lisibilité, cadence 3D ≥ 30 i/s sur le projet de charge)
- [ ] Compléter `points.json` depuis l'onglet « Comptage de point » (voir QUESTIONS.md Q8)
- [ ] Vérifier `zones_climatiques.json` contre l'onglet « Listes_importrange » (Q9)

## En attente d'Allonzo — ne pas prendre

Les jalons ci-dessous ne démarrent qu'après validation explicite du jalon précédent par Allonzo.

### J2 — Import ALTER (échéance 01/11)

Critère : export ALTER de Challans importé (mode 1), équipements placés, réimport sans doublon.

- [ ] SheetJS : lecture d'un `.xlsx` / `.csv` exporté du Sheet ALTER, filtre `Id projet` = référence dossier
- [ ] Correspondance des tables (Zones, Locaux, Mesures, Compteurs, Tableaux électriques, Système ECL, Autres équipements, Générations, distributions, émetteurs, ECS, CTA, GTB, boîtiers, cuisines) vers le modèle
- [ ] Réimport idempotent par `alterId` : mise à jour sans doublon, position conservée
- [ ] Locaux ALTER créés sans géométrie et signalés « à dessiner »
- [ ] Équipements importés dans « À placer »
- [ ] Mode 2 OAuth Google (`spreadsheets.readonly`) — seulement si Q2 tranchée favorablement
- [ ] Rejeu sur l'export de Challans (dans `local-data/`, jamais committé)

### J3 — Moteur (échéance 22/11)

Critère : assujettissement, classes, conformité décret BACS, précos et chiffrage de Challans calculés ; écarts avec le rapport livré listés.

- [ ] Formulaires données hors ALTER (SHON, secteur CEE, TVA, consommations, décret tertiaire, dates, rédacteur / relecteur)
- [ ] Référentiels `arbre.json`, `norme_52120.json`, `regles_classes.json`, `precos.json`, `decret_bacs.json`
- [ ] Assujettissement par zone (Σ puissances, seuils 290 / 70 kW, échéances, phrase explicative)
- [ ] Classes ISO 52120-1 semi-automatiques par fonction et par zone, correction avec justification
- [ ] Conformité décret BACS : 10 critères
- [ ] Exclusions (< 5 % conso, TRI > 10 ans) — transcrire `exclusions.md` avant codage
- [ ] Précos et scénarios (Mini-BACS obligatoire, jusqu'à 4)
- [ ] Chiffrage par l'entonnoir de l'Arbre, quantités depuis les métrés, précos non couvertes signalées
- [ ] Alerte « projet chiffré avec un Arbre plus ancien »
- [ ] Tests de non-régression du moteur sur le projet démo ; écarts Challans listés

### J4 — Rapport (échéance 06/12)

Critère : `.docx` complet de Challans généré, à la charte, ouvert sans erreur dans Word et Google Docs.

- [ ] Bilan économique (méthode transcrite des onglets Bilan éco / CEE — Q6)
- [ ] Essai d'une journée : `docx` vs docxtemplater + module image libre ; décision
- [ ] Textes fixes du template V3.1 dans `rapport/sections/*.md`
- [ ] Génération : données, tableaux, photos, captures 3D, encadrés pré-rédigés et réécrivables
- [ ] Charte : Fraunces 28 / 16, Open Sans 11 justifié, couleurs, page de garde, historique, contacts, table des matières
- [ ] Génération dans le navigateur, hors ligne, < 30 s

### J5 — Rejeu et marge (07/12 → 18/12)

- [ ] Comparaison ligne à ligne avec le rapport livré de Challans
- [ ] Temps post-VT mesuré contre la baseline
- [ ] Corrections
