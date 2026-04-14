# AGENTS.md

## Cursor Cloud specific instructions

This is a static vanilla JavaScript web application (no backend/database). All game data is loaded via `fetch()` from JSON files in `data/`.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Static file server | `npx serve -l 3000 /workspace` | Required to serve the app; `fetch()` calls fail under `file://` protocol |
| Tests | `yarn test` | Jest + jsdom, 152 tests |
| CSS build | `yarn build:css` | TailwindCSS; only needed when modifying `styles.css` |

### Caveats

- The app uses ES modules (`<script type="module">`) and `fetch()` for JSON data, so a local HTTP server is required for browser testing.
- The game starts with a skill allocation modal. To reach story content, complete the skill allocation or use the browser console to dismiss the modal.
- See `package.json` `scripts` for all available commands (`test`, `build:css`, `sort`, `missing`).
