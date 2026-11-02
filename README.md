# SoR4 Survival Tracker

A browser app for tracking Streets of Rage 4 Survival mode completion challenges. It replaces the old Google Forms and Sheets setup.

- **Co-op**: a 21×21 matrix of every Thomas × Craig character pairing (441 in total). It also has the head-to-head win scoreboard, a randomiser that only picks unplayed pairings, and top-run stats.
- **Solo Deep**: a 21×4 matrix of character × Blitz/Star move combos (78 valid). SoR1 Axel, Blaze and Adam have no Alternate Blitz, so those cells are blocked.

## Data storage

Runs are stored in this repo as `public/data/coop-runs.json` and `public/data/solo-runs.json`.

- The app reads and writes them through the GitHub Contents API, so every logged, edited or deleted run is a commit.
- To enable saving, paste a fine-grained personal access token into **Settings** in the app. It needs **Contents: read/write** on this repo.
- The token is stored only in your browser's local storage.
- Without a token, the app is read-only and shows the data from the last deploy.

## Development

```bash
npm install
npm run dev     # local dev server
npm run lint
npm run build   # outputs dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. Set **Settings → Pages → Source** to "GitHub Actions".

`scripts/import_xlsx.py` was a one-off import of the original Google Sheets exports. It needs `openpyxl`.

## Credits

Character portraits come from the [Streets of Rage Wiki](https://streetsofrage.fandom.com/wiki/Streets_of_Rage_Wiki). Streets of Rage © SEGA. Streets of Rage 4 © Dotemu, Lizardcube and Guard Crush Games. This is a fan-made tool for personal use.
