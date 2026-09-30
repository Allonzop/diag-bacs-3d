# Diag BACS 3D

Application web installable (PWA), hors ligne, pour le Diag BACS d'Alter Watt : maquette 3D simple du bâtiment, métrés, import ALTER, moteur réglementaire (décret BACS, NF EN ISO 52120-1), chiffrage et rapport Word à la charte.

- Cahier des charges : `PRD.md`
- Règles de travail et architecture : `CLAUDE.md`
- Avancement par jalon : `BACKLOG.md`
- Décisions en attente : `QUESTIONS.md`

```bash
npm install
npm run dev        # développement
npm run verifier   # typecheck + tests
npm run build      # production (dist/)
```

Déploiement : Netlify (`netlify.toml`) — https://diag-bacs-3d.netlify.app

Aucune donnée client n'est committée : les fichiers de dossiers vivent dans `local-data/` (ignoré par git).
