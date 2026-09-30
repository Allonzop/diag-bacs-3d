# PRD — Diag BACS 3D

| | |
|---|---|
| Porteur | Allonzo Pensabene, Pôle BACS, Alter Watt (réalisation d'apprentissage ingénieur) |
| Version | 0.1 — 30/09/2026 |
| Statut | Brouillon. Les points marqués **[À TRANCHER]** attendent une décision d'Allonzo. |
| Échéance V1 | Utilisable sur un vrai dossier avant le **18/12/2026** |
| Dossier de test | Notre-Dame Challans (affaire 2025034), rejoué et comparé au rapport livré |

---

## 1. Résumé

Application web installable (PWA), utilisable hors ligne sur téléphone, tablette et PC. L'ingénieur y redessine le bâtiment sous forme de **maquette 3D très simple** (niveaux extrudés, locaux, équipements placés). Il y importe les équipements relevés dans ALTER, et l'app en tire les **métrés du chiffrage**. Elle applique ensuite les règles du décret BACS et de la norme NF EN ISO 52120-1, construit les préconisations et le chiffrage, puis **génère le rapport Diag BACS complet au format Word, à la charte Alter Watt**.

## 2. Problème

La chaîne actuelle est la suivante : ALTER (relevés VT), puis une copie par affaire de l'outil Diag BACS (Google Sheets, 65 onglets), puis 78 balises, puis un Apps Script, puis le Google Doc. Elle automatise l'assemblage des tableaux et des photos. Le temps part ailleurs, dans les 33 tâches post-VT du process :

- attribution des classes ISO par fonction, à la main ;
- onglet décret BACS, TRI et exclusions ;
- scénarios et chiffrage ;
- synoptique et plan de masse annoté ;
- une vingtaine d'encadrés « État des lieux / Préconisations » rédigés à la main.

L'outil a aussi des défauts de structure :

- une copie de 65 onglets par affaire (≈ 189 Mo de XML) ;
- des prix de l'Arbre écrits en dur dans chaque copie, donc figés par affaire ;
- trois numéros de version dans le même fichier ;
- un template de rapport V3.1 hors charte (Marianne, Arial, DM Sans, aucun Open Sans).

## 3. Objectifs et mesure du succès

| Objectif | Mesure | Cible V1 |
|---|---|---|
| Réduire le temps post-VT | Heures entre fin de VT et rapport prêt à relire, sur Challans | Inférieur à la baseline historique (JH relevés dans B-Process / Grande_table) |
| Fidélité du diagnostic | Classes ISO, conformité décret BACS et précos identiques au rapport livré de Challans | 100 % des fonctions, écarts justifiés |
| Fidélité du chiffrage | Écart total chiffrage app / rapport livré, par scénario | Écart expliqué ligne à ligne |
| Qualité du rendu | Rapport conforme à la charte, sans retouche de mise en page | 0 retouche de mise en page |
| Homogénéité | Même donnée d'entrée → même rapport | Génération déterministe |

## 4. Utilisateurs et contextes

- **V1 : un seul utilisateur**, Allonzo, sur ses propres missions. Pas de comptes, pas de serveur, pas de multi-utilisateur.
- Trois moments, sur le même projet :
  1. **Avant la VT**, au bureau : fond de plan importé, niveaux et locaux dessinés.
  2. **Sur site**, téléphone ou tablette, **souvent sans réseau** (chaufferies, sous-sols) : compléter, placer, photographier.
  3. **Après la VT**, au bureau sur PC : import ALTER, placement, analyse, chiffrage, génération du rapport.
- ALTER **reste** l'outil de relevé terrain. L'app ne le remplace pas : elle importe ses données.

## 5. Périmètre

### Dans la V1

1. Projets locaux, modèle de données complet, sauvegarde et restauration.
2. Dessin 2D par niveau et maquette 3D.
3. Métrés.
4. Import des équipements ALTER dans un bac « À placer », puis placement dans la 3D.
5. Saisie des données hors ALTER nécessaires au rapport (consommations, prix de l'énergie, décret tertiaire…).
6. Moteur réglementaire : assujettissement, classes ISO 52120-1 par fonction, conformité décret BACS, exclusions.
7. Préconisations et scénarios (Mini-BACS obligatoire, jusqu'à 4 scénarios).
8. Chiffrage par l'entonnoir de l'Arbre, quantités alimentées par les métrés.
9. Bilan économique.
10. Génération du rapport Word complet à la charte.

### Hors V1

- Comptes, synchronisation serveur, travail à plusieurs.
- Clients externes, facturation, mode SaaS.
- Écriture vers ALTER ou vers les Google Sheets d'AW (lecture seule).
- Remplacement d'ALTER pour le relevé.
- Modélisation 3D détaillée (murs, ouvertures, gaines) : la maquette sert aux métrés, pas à l'architecture.

## 6. Parcours type

1. Créer le projet : référence dossier, nom, adresse, code postal. La zone climatique est déduite du département.
2. Créer les zones (= bâtiments au sens du décret BACS), puis leurs niveaux (altitude du plancher, hauteur sous plafond).
3. Importer un plan par niveau (PDF ou image), le caler à l'échelle, dessiner les locaux.
4. Sur site : placer ou corriger les équipements, les relier à leur automate, prendre des photos.
5. Au bureau : importer ALTER. Les équipements arrivent dans « À placer » ; les glisser dans leur local.
6. Compléter les attributs de régulation manquants. L'app propose les classes ISO par fonction, l'ingénieur valide ou corrige avec justification.
7. L'app déduit l'assujettissement, la conformité décret BACS et les précos. L'ingénieur compose les scénarios.
8. Chiffrage : pour chaque local, les opérations issues de l'Arbre, rattachées aux précos qu'elles couvrent. Quantités issues des métrés.
9. Bilan économique.
10. Générer le rapport `.docx`, le relire, l'ajuster dans Word ou Google Docs.

## 7. Exigences fonctionnelles

### 7.1 Modèle de données

Il reprend la structure de l'onglet E-CRVT de l'outil actuel pour que l'import ALTER soit direct.

```
Projet ─┬─ Zones (bâtiment décret BACS)
        │    └─ Niveaux
        │         └─ Locaux (polygone 2D en m, type, nom)
        │              └─ Équipements
        ├─ Données énergie (consommations, prix, décret tertiaire)
        ├─ Scénarios
        └─ Lignes de chiffrage
```

**Types d'équipements** (tables ALTER / E-CRVT) :
- Génération ;
- Distribution hydraulique ;
- Émetteur ;
- ECS ;
- CTA / Ventilation ;
- Système d'éclairage ;
- Compteur / PDL ;
- Tableau électrique ;
- Boîtier / Automate ;
- Capteur (Mesure) ;
- GTB-GTC ;
- Cuisine ;
- Autre équipement.

**Champs communs** d'un équipement :
- `id` ;
- `type` ;
- `nom` ;
- `zoneId`, `localId` (nullable) ;
- `position` {x, y, z} en m (nullable = non placé) ;
- `lieA` (id du boîtier ou automate de raccordement) ;
- `alterId` (id ALTER d'origine) ;
- `photos[]` ;
- `attributs` (dictionnaire typé par type d'équipement, voir 7.1.1).

**7.1.1 Attributs par type** : au minimum les colonnes des tableaux du rapport V3.1.

| Type | Attributs minimum |
|---|---|
| Génération | énergie, puissance chaud kW, puissance froid kW, quantité, année, type, régulation de température, intermittence, boîtier de régulation, fabricant/référence |
| Distribution | génération mère, destination, loi d'eau (°C), pompe (type, variation), vanne 3 voies, boîtier, intermittence, T° confort / réduit / hors gel |
| Émetteur | fabricant/référence, source chaud, source froid, communication possible, intermittence, régulation de température, régulateur, action de l'occupant |
| ECS | énergie, génération (constructeur/référence), puissance kW, volume ballon (L), pompe de bouclage, boîtier |
| CTA | puissance thermique max kW, référence, batterie chaude, batterie froide, régulation température de soufflage, intermittence, simple/double flux |
| Éclairage | zone desservie, type, commande, régulation de luminosité, automate |
| Compteur | énergie, n° PDL, communicant, protocole |
| Boîtier / Automate | fabricant, modèle, protocoles, capacité E/S |

Autres règles :
- Schéma versionné (`schemaVersion`) avec migrations.
- Export et import d'un projet complet en `.zip` (JSON + photos).

### 7.2 Dessin et maquette 3D

- **Fond de plan** par niveau : image (PNG/JPG) ou 1ʳᵉ page d'un PDF, avec pdf.js embarqué. Calage à l'échelle par deux points et une distance réelle. Opacité réglable.
- **Locaux** : rectangle ou polygone. Aimantation sur une grille de 0,5 m et sur les sommets existants. Édition des sommets, duplication d'un niveau.
- **Équipements** : glisser-déposer depuis « À placer », création directe au toucher, hauteur de pose réglable, pictogramme et couleur par type.
- **Liaisons** : relier un équipement à son boîtier ou automate (`lieA`), liaison visible en 3D.
- **Vue 3D** : extrusion des locaux par niveau ; orbite, zoom et panoramique au toucher et à la souris ; niveaux masquables ; sélection d'un objet → fiche.
- **Captures** : export PNG de la vue 3D d'ensemble et du plan de chaque niveau, réutilisées dans le rapport (plan de masse annoté).

### 7.3 Métrés

Recalculés en direct, testés unitairement :

- par local, niveau, zone et projet : surface, périmètre, volume, nombre d'équipements par type ;
- pour chaque liaison `lieA`, deux longueurs de câble :
  - à vol d'oiseau ;
  - estimée, qui sert au chiffrage = (|dx| + |dy|) + montée au plafond + |Δz| entre niveaux + descente, × coefficient de cheminement (défaut 1,2, réglable par projet) ;
- **seuil 15 m** sur chaque liaison, pour choisir la sous-catégorie filaire ou radio de l'Arbre (module TIC Linky, module d'impulsion gaz) ;
- **nombre de points** câblés par équipement et par total, d'après le référentiel `points.json` (onglet « Comptage de point » : p. ex. départ hydraulique 10, chaudière 10, CTA simple flux 20, CTA double flux 40). Ce total alimente le prix du superviseur et de l'automate ;
- export CSV et JSON.

### 7.4 Import ALTER

- Source : le Google Sheet d'ALTER du Workspace AW (id dans l'onglet A-Bienvenue de l'outil Diag, ligne « Id Altee »). Filtre sur `Id projet` = référence dossier.
- **Mode 1, obligatoire en V1** : import d'un fichier `.xlsx` ou `.csv` exporté de ce Sheet. Aucune authentification.
- **Mode 2, optionnel** : lecture directe par OAuth Google (Google Identity Services, scope `spreadsheets.readonly`) avec le compte AW. Dépend de l'autorisation du client OAuth par l'admin Workspace AW **[À TRANCHER]**.
- Correspondance des tables : Zones, Locaux, Mesures, Compteurs, Tableaux électriques, Système ECL, Autres équipements, Générations, et les tables suivantes d'E-CRVT (distributions, émetteurs, ECS, CTA, GTB, boîtiers, cuisines).
- Réimport idempotent : les objets déjà importés (même `alterId`) sont mis à jour, jamais dupliqués, et gardent leur position.
- Les équipements importés arrivent dans « À placer ». Les locaux ALTER sont créés sans géométrie et signalés « à dessiner ».
- Photos ALTER : **[À TRANCHER]** — dossier Drive par projet, règle de nommage inconnue. En V1 : photos prises dans l'app ou importées à la main.

### 7.5 Données hors ALTER

Formulaires pour :
- surfaces SHON par zone ;
- secteur d'activité CEE ;
- régime de TVA ;
- consommations annuelles par énergie (kWhef) et prix du kWh ;
- données décret tertiaire (méthode, année de référence, objectif 2030, graphe OPERAT importé en image) ;
- dates (RL, VT, réunions) ;
- rédacteur et relecteur.

Hypothèses par défaut, reprises de l'outil Diag :
- prix CEE 5,8 €/MWh cumac ;
- inflation énergie 5 %/an ;
- TVA énergie 20 %.

### 7.6 Moteur réglementaire

- **Assujettissement** par zone : Σ puissances chaud et Σ puissances froid des systèmes. La puissance retenue est la plus élevée des deux. Seuils : > 290 kW → échéance 01/2025, > 70 kW → échéance 01/2030. Phrase explicative générée (équivalent de la balise 116).
- **Classes NF EN ISO 52120-1** : lots 1 à 7 (chauffage, ECS, refroidissement, ventilation/climatisation, éclairage, stores, gestion technique), classes A à D, par fonction et par zone.
  - V1 = **semi-automatique**. L'app propose une classe par fonction à partir des attributs de régulation relevés. L'ingénieur valide ou corrige, et une correction exige une justification courte, reprise dans le rapport.
  - Les règles de proposition vivent dans `regles_classes.json` (voir 8). **[À TRANCHER]** : qui rédige et valide ces règles.
  - Classe de la zone et tableau « changement de classe » (passage C, B, A) par zone.
- **Conformité décret BACS** : les 10 critères du rapport V3.1 (suivi horaire par zone avec conservation 5 ans, interopérabilité, situer l'efficacité, ajustement, arrêt manuel, détection des pertes d'efficacité, inspection, paramétrage et formation, maintenance, exigences minimales ISO). Respect oui/non, état des lieux, action.
- **Exclusions** : système < 5 % de la consommation totale, ou TRI de raccordement > 10 ans. Notes de calcul (pompes, éclairage, unités extérieures) selon les formules de l'onglet « Exclusions » de l'outil Diag, à transcrire dans `exclusions.md` avant codage.

### 7.7 Préconisations et scénarios

- Référentiel des précos fonctionnelles par système et par classe cible (onglets « output », « Syst_Précos », « Liste précos fonctionnelle » de l'outil Diag). Chaque préco a un texte type, sa fonction ISO et la classe visée.
- Génération automatique des précos nécessaires pour atteindre la classe minimale BACS (C) par fonction. Classes B et A en option.
- Scénarios : 1 à 4. Le scénario **Mini-BACS** (conformité minimale, tous lots y compris ventilation) est obligatoire. Chaque préco est cochée par scénario.
- Tableau « systèmes techniques : assujetti / à raccorder / présence dans les scénarios ».

### 7.8 Chiffrage

- **Entonnoir à 3 niveaux**, sans exception :
  1. Catégorie : Automatisme, Comptage, Hydraulique, Aéraulique, Autres.
  2. Intervention, filtrée par la catégorie.
  3. Sous-catégorie : une seule, pour certaines interventions, 2 ou 3 choix au maximum.
- Ligne = prix unitaire × coefficient d'ajustement (défaut 1) × quantité.
- **Tous les prix viennent de `arbre.json`.** Aucun prix, aucune formule ni aucun cas particulier écrit en dur dans le code. La variation passe par la quantité.
- Saisie **par local** : l'ingénieur ajoute des opérations, puis les rattache aux précos qu'elles couvrent. Une préco peut dépendre de plusieurs opérations. L'app signale toute préco non couverte.
- Quantités proposées par les métrés : nombre d'émetteurs du local, nombre de départs, nombre de compteurs, sous-catégorie fixée par le seuil 15 m, points totaux pour le superviseur et l'automate.
- Prix du superviseur et de l'automate à peu près proportionnels au nombre total de points, pas au nombre de zones.
- Chaque ligne affiche le descriptif de l'opération (colonne « Descriptif » de l'Arbre) et le détail fourniture / main d'œuvre.
- Totaux par local, par zone et par scénario, en € HT (et TTC selon le régime).

### 7.9 Bilan économique

- Situation actuelle : consommation annuelle (kWhef) × prix du kWh = coût annuel, par énergie et au total.
- Par scénario : investissement (chiffrage), CEE (fiche BAT-TH-116), reste à charge, économies, TRI.
  - Méthode de calcul des économies et des CEE à transcrire depuis les onglets « Bilan éco », « CEE » et « Datain_CEE_DB » de l'outil Diag **avant** codage.
  - **[À TRANCHER]** si l'extraction n'est pas prête au jalon 4.

### 7.10 Génération du rapport Word

- Sortie `.docx`, ouvrable dans Word et importable dans Google Docs sans perte de mise en page.
- Plan identique au template V3.1 :
  - Glossaire ;
  - 1. Contexte (décret tertiaire, décret BACS, norme) ;
  - 2. État des lieux (site, exploitation, analyse énergétique, architecture énergétique, synoptique, systèmes par famille, plan de comptage) ;
  - 3. Analyse (décret BACS, classes, tableau simplifié) ;
  - 4. Préconisations (par scénario, bilan économique) ;
  - 5. Conclusion ;
  - 6. Annexes.
- **Texte fixe** : repris du template V3.1, stocké dans `rapport/sections/*.md`.
- **Généré** :
  - toutes les données (équivalent des 78 balises) ;
  - tous les tableaux (en-têtes = ceux du V3.1) ;
  - les tableaux de photos ;
  - les captures 3D ;
  - les encadrés « État des lieux » et « Préconisations » de chaque famille, pré-rédigés à partir des attributs et des précos. L'ingénieur peut les réécrire dans l'app avant génération, et sa version prime.
- Synoptique CVC : **[À TRANCHER]** — généré à partir du graphe génération → distribution → émission, ou emplacement réservé en V1.
- **Charte Alter Watt** :
  - titres en Fraunces (28 puis 16) ;
  - texte en Open Sans 11, **justifié** ;
  - bleu foncé #07072D, bleu clair #EAF0F9, jaune #FFC40B en accent seulement (≤ 10 %) ;
  - aucune autre police, aucune autre couleur de thème.
- Page de garde : Diag BACS, nom du projet, n° de dossier, adresse, photo ou logo du client. Historique des versions, contacts, table des matières (champ à mettre à jour à l'ouverture).
- Génération entièrement **dans le navigateur, hors ligne**.
- Librairie : décision au jalon 4 après un essai d'une journée entre `docx` (génération programmatique) et docxtemplater avec un module image libre. Le module image officiel de docxtemplater est payant : exclu. Critère : fidélité à la charte et gestion des images.

## 8. Référentiels (données, pas code)

Dans `referentiels/`, en JSON, chacun avec `version`, `date`, `source` :

| Fichier | Contenu | Source dans l'outil Diag V3.5 |
|---|---|---|
| `arbre.json` | Catégorie, intervention, sous-catégorie, prix total, fourniture, main d'œuvre, descriptif | Onglet « Arbre » (88 lignes) |
| `points.json` | Nombre de points câblés par type d'appareil | « Comptage de point » |
| `norme_52120.json` | Lots, fonctions, libellés, classes A–D, classe minimale BACS | « Liste norme », « DataIn_norme », « Norme MiniBACS », « BDD_A/B/C » |
| `regles_classes.json` | Règles de proposition de classe à partir des attributs | À écrire (voir 7.6) |
| `precos.json` | Précos fonctionnelles, texte, fonction, classe visée, système | « output », « Syst_Précos », « Liste précos fonctionnelle » |
| `zones_climatiques.json` | Département → zone climatique | « Listes_importrange » |
| `decret_bacs.json` | 10 critères, libellés du rapport | Template rapport V3.1 |
| `cee.json` | Paramètres BAT-TH-116 | « CEE », « Datain_CEE_DB » |

Règles :
- Un changement de prix = un commit sur `arbre.json`, avec une nouvelle version.
- Le projet enregistre la version des référentiels avec laquelle il a été chiffré. L'app signale quand un projet a été chiffré avec un Arbre plus ancien que l'actuel.

## 9. Exigences non fonctionnelles

- **Hors ligne d'abord** : après un premier chargement, toutes les fonctions V1 marchent en mode avion, sauf l'import ALTER en mode 2.
- **Persistance** : IndexedDB avec `navigator.storage.persist()`. Sauvegarde automatique à chaque modification. Export `.zip` en un geste : sur iOS, Safari peut purger le stockage d'une PWA non utilisée, donc un rappel de sauvegarde s'affiche si le dernier export date de plus de 7 jours.
- **Tactile d'abord** : cibles ≥ 44 px, utilisable d'une main sur téléphone, raccourcis clavier sur PC.
- **Performance** : 3D fluide (≥ 30 i/s) sur iPad pour 10 niveaux, 150 locaux, 500 équipements. Génération du rapport < 30 s.
- **Données clients** : **aucune donnée client dans le dépôt**. Les fichiers de Challans vivent dans `local-data/`, listé dans `.gitignore`. Les tests utilisent un projet démo synthétique.
- **Dépôt privé** : le code appartient à Alter Watt.
- Interface en français.

## 10. Architecture technique

- Vite + React + TypeScript strict.
- three.js via @react-three/fiber et @react-three/drei.
- zustand pour l'état, Dexie pour IndexedDB.
- vite-plugin-pwa pour le service worker et le manifeste.
- pdf.js embarqué.
- SheetJS pour l'import xlsx/csv.
- vitest pour les tests.
- Aucune ressource chargée depuis un CDN. Polices Fraunces et Open Sans embarquées.
- Couches séparées : `modele/` (types, migrations), `dessin/` (2D/3D), `metres/`, `moteur/` (réglementaire, précos, chiffrage, bilan — fonctions pures, sans UI), `rapport/`, `import-alter/`, `referentiels/`.
- Le moteur est une fonction pure : même projet + mêmes référentiels → même résultat. Tests de non-régression sur le projet démo.
- Déploiement : GitHub Actions vers GitHub Pages si le compte le permet (Pages sur dépôt privé = GitHub Pro), sinon Netlify (`netlify.toml` fourni).

## 11. Jalons (proposés, à valider par Allonzo)

| Date | Jalon | Critère d'acceptation |
|---|---|---|
| 18/10 | J1 — Maquette et métrés | Projet démo dessiné, 3D navigable au toucher, métrés et seuil 15 m testés, export/import `.zip`, fonctionne en mode avion |
| 01/11 | J2 — Import ALTER | Export ALTER de Challans importé (mode 1), équipements placés, réimport sans doublon |
| 22/11 | J3 — Moteur | Assujettissement, classes, conformité décret BACS, précos et chiffrage de Challans calculés ; écarts avec le rapport livré listés |
| 06/12 | J4 — Rapport | `.docx` complet de Challans généré, à la charte, ouvert sans erreur dans Word et Google Docs |
| 07/12 → 18/12 | J5 — Rejeu et marge | Comparaison ligne à ligne avec le rapport livré, temps mesuré, corrections |

Marge volontaire après le 06/12 : la soutenance intermédiaire GECD3 d'Allonzo tombe le 07/12, et des rendus sont attendus les 14 et 18/12.

## 12. Questions ouvertes

1. Qui rédige et valide `regles_classes.json` (Allonzo seul, avec Clovis) ?
2. OAuth vers le Sheet ALTER : l'admin Workspace AW autorise-t-il un client OAuth externe ?
3. Photos ALTER : où sont-elles et comment sont-elles nommées ?
4. Synoptique CVC en V1 : généré ou emplacement réservé ?
5. Charte : le rapport généré suit la charte alors que le template V3.1 ne la suit pas. À valider avec le pôle.
6. Méthode des économies et des CEE : extraction des onglets Bilan éco / CEE faite avant le jalon 4 ?
7. Sortie : `.docx` suffit-il, ou faut-il déposer directement un Google Doc dans le Drive du projet ?

## 13. Règles de travail pour Claude Code

- Lire `PRD.md`, puis `CLAUDE.md`, puis `BACKLOG.md` au début de chaque session.
- **Un jalon à la fois**, dans l'ordre. Ne jamais commencer un jalon dont le précédent n'a pas passé ses critères.
- `BACKLOG.md` ne contient que des cases `- [ ]`. Tout ce qui est sous « En attente d'Allonzo — ne pas prendre » ne se prend pas.
- Toute décision non couverte par ce PRD va dans `QUESTIONS.md` (section « En attente », Allonzo répond sous « Réponse : »). Ne pas trancher à sa place.
- Aucun prix, aucune règle métier en dur dans le code : tout passe par `referentiels/`.
- Aucune donnée client committée.
- Commits logiques, tests verts avant chaque commit. En fin de session : ce qui est fait, ce qui reste, ce qui est imparfait.
