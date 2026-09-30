# Référentiels

Données métier, **jamais de code**. Chaque fichier porte `version`, `date` et `source`.
Un changement de valeur = un commit sur le fichier, avec une nouvelle `version`.
Le projet enregistre la version des référentiels avec lesquels il a été calculé (`versionsReferentiels`).

| Fichier | Contenu | Jalon |
|---|---|---|
| `metres.json` | seuil filaire/radio (15 m), coefficient de cheminement par défaut, grille d'aimantation | J1 |
| `points.json` | points câblés par type d'appareil (extrait partiel, à compléter) | J1 |
| `zones_climatiques.json` | département → zone climatique | J1 |
| `arbre.json` | prix de l'Arbre | J3 |
| `norme_52120.json`, `regles_classes.json`, `precos.json`, `decret_bacs.json`, `cee.json` | moteur réglementaire | J3 |
