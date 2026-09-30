# QUESTIONS — Diag BACS 3D

Toute décision non couverte par le PRD est posée ici. Allonzo répond sous « Réponse : ». Tant qu'une question n'a pas de réponse, l'app applique l'hypothèse indiquée, sans trancher.

## En attente

### Q1 — Qui rédige et valide `regles_classes.json` ? (PRD §12.1)
Allonzo seul, ou avec Clovis ? Nécessaire avant J3.

Réponse :

### Q2 — OAuth vers le Sheet ALTER (PRD §12.2)
L'admin Workspace AW autorise-t-il un client OAuth externe ? Sinon, le mode 2 est abandonné et seul l'import de fichier reste.

Réponse :

### Q3 — Photos ALTER (PRD §12.3)
Où sont-elles (dossier Drive par projet ?) et comment sont-elles nommées ? En V1, photos prises dans l'app ou importées à la main.

Réponse :

### Q4 — Synoptique CVC en V1 (PRD §12.4)
Généré depuis le graphe génération → distribution → émission, ou emplacement réservé ?

Réponse :

### Q5 — Charte du rapport (PRD §12.5)
Le rapport généré suit la charte alors que le template V3.1 ne la suit pas. À valider avec le pôle.

Réponse :

### Q6 — Méthode des économies et des CEE (PRD §12.6)
L'extraction des onglets Bilan éco / CEE / Datain_CEE_DB sera-t-elle faite avant le jalon 4 ?

Réponse :

### Q7 — Sortie du rapport (PRD §12.7)
`.docx` suffit-il, ou faut-il déposer directement un Google Doc dans le Drive du projet ?

Réponse :

### Q8 — Contenu complet de `points.json`
Le PRD ne cite que quatre valeurs de l'onglet « Comptage de point » (départ hydraulique 10, chaudière 10, CTA simple flux 20, CTA double flux 40). Tous les autres types comptent 0 point et sont signalés « non référencé ». Peux-tu fournir l'onglet complet (export CSV dans `local-data/`), ou les valeurs pour : PAC, groupe froid, sous-station, ECS, émetteurs, éclairage, compteurs, capteurs, GTB, cuisine ?

Hypothèse en attendant : 0 point pour les types absents, aucune extrapolation.

Réponse :

### Q9 — Source de `zones_climatiques.json`
Le référentiel reprend le zonage RT 2012 / RE 2020 (H1a … H3) par département, sans les DOM. L'onglet « Listes_importrange » de l'outil Diag utilise-t-il le même découpage (avec lettres) ou seulement H1 / H2 / H3 ? Peux-tu exporter l'onglet dans `local-data/` pour comparaison ?

Réponse :

### Q10 — Dépôt public
Le PRD §9 demande un dépôt privé (« le code appartient à Alter Watt »). Le dépôt GitHub `Allonzop/diag-bacs-3d` est actuellement **public**. Faut-il le passer en privé ? Si oui, GitHub Pages devient payant et Netlify reste le déploiement (déjà en place).

Réponse :

### Q11 — Formule de la longueur estimée : interprétation retenue
Le PRD §7.3 donne « (|dx| + |dy|) + montée au plafond + |Δz| entre niveaux + descente, × coefficient ». Interprétation codée (`src/metres/cables.ts`) :
- montée = hauteur sous plafond du niveau de départ − hauteur de pose du départ ;
- |Δz| = différence d'altitude des planchers des deux niveaux (0 sur le même niveau) ;
- descente = hauteur sous plafond du niveau d'arrivée − hauteur de pose de l'arrivée ;
- seuil 15 m appliqué à la longueur estimée, coefficient inclus (≤ 15 → filaire).

Est-ce la bonne lecture ? En particulier, sur un même niveau, faut-il bien compter montée + descente (câble passant par le plafond) ?

Réponse :

### Q12 — Échelle par défaut d'un fond de plan non calé
Avant calage, un fond de plan importé est affiché sur 30 m de large. Y a-t-il une convention plus utile (par exemple lire l'échelle du cartouche à la main) ?

Réponse :

### Q13 — Duplication de niveau : les équipements aussi ?
La duplication copie les locaux (géométrie) mais pas les équipements. Faut-il proposer une option « avec équipements » ?

Réponse :

## Résolues

(aucune)
