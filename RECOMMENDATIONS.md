# Codebase Analysis & Recommendations

## Project Overview

**Alone Against the Dark v2** — a browser-based choose-your-own-adventure game (Call of Cthulhu theme) built as a static single-page app with vanilla JavaScript ES modules, JSON-driven narrative data, and no bundler.

---

## 1. Bugs (High Priority)

These are issues that will cause runtime errors or incorrect behavior in production.

### 1.1 `currentEntryId` is not defined in `index.js`

`src/index.js:23` references `currentEntryId`, but this variable is a module-private `let` in `gameActions.js:293` and is never exported. Clicking the minimap will throw a `ReferenceError`.

**Fix:** Export `currentEntryId` from `gameActions.js` (or better, expose a getter function like `getCurrentEntryId()`), and import it in `index.js`.

### 1.2 Nested `DOMContentLoaded` listener never fires

`src/index.js:40-43` registers a second `DOMContentLoaded` listener *inside* one that already fired. The inner callback will never run, so `showMinimapIfPiecesExist()` is dead code at startup.

**Fix:** Call `showMinimapIfPiecesExist()` directly at the end of the outer listener, not inside a nested one.

### 1.3 Duplicate `DOMContentLoaded` initialization in `gameUI.js`

`src/game/gameUI.js:601-606` registers its own `DOMContentLoaded` handler that calls `initializeGame()` and wires save/load buttons. This competes with `src/index.js:10-44`, risking double initialization depending on module load order.

**Fix:** Remove the `DOMContentLoaded` block from `gameUI.js`. Keep `index.js` as the single entry point for bootstrapping.

### 1.4 Combat health clamp — operator precedence bug

`src/game/gameActions.js:2114`:
```javascript
if (opponent.health > 0 - damageToOpponent < 0) {
```
This parses as `(opponent.health > 0) - damageToOpponent < 0` due to operator precedence, which is not the intended logic.

**Fix:** Replace with:
```javascript
if (opponent.health - damageToOpponent < 0) {
```

### 1.5 `multipleChecks` reads wrong object for check parameters

`src/game/gameActions.js:1257-1268` iterates `effects.multipleChecks` but reads `difficulty`, `tries`, `opposedValue`, etc. from `effects.check` instead of from each individual `check` object.

**Fix:** Use `check.difficulty`, `check.tries`, etc. from the loop variable, not from `effects.check`.

### 1.6 Book shop `includes` compares objects to strings

`src/game/gameActions.js:974`: `inventoryBooks` is an array of **item objects** (filtered by matching `item.name`), but the code checks `!inventoryBooks.includes(book.name)` which compares objects to a string — this will always be `true`, so the "already purchased" filter never works.

**Fix:** Compare against the item names:
```javascript
if (!inventoryBooks.some((item) => item.name === book.name)) {
```

### 1.7 Custom roll inventory check compares objects to strings

`src/utils/dice.js:52`: `currentState.inventory.includes(clue)` compares inventory **objects** against string IDs. The bonus for having specific clues likely never triggers.

**Fix:** Use `.some()` with name matching:
```javascript
if (currentState.inventory.some((item) => item.name === clue)) {
```

### 1.8 `findWeaponByName` accesses wrong data path

`src/game/gameActions.js:2048`: Uses `gameData[category]` but weapon data is loaded into `gameData.weapons` in `initializeGame`. Should be `gameData.weapons[category]`. (This function is also currently unused — see Dead Code section.)

### 1.9 `fullHealth` check uses hardcoded 100 instead of per-character max

`src/game/gameActions.js:1623-1626`: `checkRequirements` uses `currentState.health < 100` for `fullHealth`, but `updateHealth` (line 1331) correctly caps at `gameData.investigators[currentState.character].health`. These will disagree for characters whose max health is not 100.

**Fix:** Use the same per-character max:
```javascript
const initialHealth = gameData.investigators[currentState.character].health
if (currentState.health < initialHealth) { return false }
```

### 1.10 `updateHealth` "fully restored" message uses hardcoded 100

`src/game/gameActions.js:1341`: Shows "Health fully restored!" when health equals 100, but healing is capped at the character's initial health (line 1332) which may not be 100.

**Fix:** Use `initialHealth` for the comparison.

---

## 2. Dead Code

### 2.1 `updateChoices` — never called
`src/game/gameActions.js:87-101` — defined but never referenced anywhere in the codebase.

### 2.2 `updateDotPosition` — never called
`src/game/gameActions.js:332-344` — defined but never referenced.

### 2.3 `findWeaponByName` — never called
`src/game/gameActions.js:2038-2052` — defined but never referenced (and has a data path bug as noted above).

### 2.4 Duplicate `displayEntry` in `gameUI.js`
`src/game/gameUI.js:577-599` — a simplified `displayEntry` that bypasses the real narrative/effects pipeline in `gameActions.js`. If this isn't actively used, it should be removed. If it is used somewhere, it should delegate to the real implementation.

**Recommendation:** Remove all dead code. It adds confusion and maintenance burden.

---

## 3. Code Duplication

### 3.1 `requirements.minHotelStays` — duplicated block
`src/game/gameActions.js:1781-1821` — the exact same `if (requirements.minHotelStays)` block is repeated back-to-back. The second copy should be deleted.

### 3.2 `defaultBaseValues` — repeated 3 times in `gameUI.js`
The same ~50-line skill baseline object appears in `generateSkillInputs` (~line 129), the skills panel setup (~line 372), and `updateSkillsPanel` (~line 497). Any edit must be replicated in all three.

**Fix:** Extract to a single module-level constant:
```javascript
const DEFAULT_BASE_VALUES = { Accounting: 5, Anthropology: 1, /* ... */ }
```

### 3.3 Hotel stay increment logic — repeated many times
Similar blocks for incrementing `moderateHotelStays`/`expensiveHotelStays` appear in `handleEntryChoices`, `makeChoice`, and other handlers.

**Fix:** Extract into a helper: `incrementHotelStay(type)`.

### 3.4 Water supply UI/state logic — duplicated across handlers
Similar water-supply update patterns appear in `handleComplexOutcome`, `makeChoice`, and `handleOutcomeBasedEncounter`.

**Fix:** Extract into a shared `updateWaterSupply(amount)` helper.

---

## 4. Architecture & Design

### 4.1 `gameActions.js` is a 2,787-line "god module"
This single file contains routing, UI rendering, combat, save/load, requirements checking, minimap management, inventory, and special entry handlers. It makes the code hard to navigate, test, and modify safely.

**Recommendation:** Split into focused modules:
- `combat.js` — combat logic and rounds
- `requirements.js` — `checkRequirements` and related helpers
- `minimap.js` — map display and dot positioning
- `inventory.js` — add/remove items, display updates
- `saveLoad.js` — save/load game state
- `entryEffects.js` — handling `effects` from entries
- `specialEntries.js` — handlers for entries with custom logic (54, 187, etc.)

### 4.2 Business logic is tightly coupled to the DOM
Functions like `displayEntry`, `makeSkillCheck`, `updateHealth`, and `updateSanity` all directly manipulate DOM elements via `getElementById`. This makes unit testing harder and prevents reuse.

**Recommendation:** Separate pure state-mutation functions from rendering. For example:
```javascript
// Pure function
function applyHealthChange(state, amount, maxHealth) {
  return Math.max(0, Math.min(state.health + amount, maxHealth))
}

// Rendering (separate)
function renderHealth(health) {
  document.getElementById('health').innerText = `Health: ${health}`
}
```

### 4.3 Circular module dependencies
`gameState.js` imports from `gameActions.js`, and `gameActions.js` imports from `gameState.js`. This creates fragile initialization order and potential reference issues.

**Recommendation:** Create a clear layering: a pure `state` module that has no UI imports, a `rules/engine` module that imports state, and a `ui/render` module that imports both.

### 4.4 Side-effectful module imports in `gameUI.js`
`gameUI.js` creates and injects DOM elements (styles, buttons, panels) at import time (~lines 218-487), rather than behind an explicit `init()` function. This makes load order fragile and testing difficult.

**Fix:** Wrap all setup in an exported `initUI()` function that `index.js` calls explicitly.

### 4.5 Global mutable state with no schema validation
`currentState` is a plain object mutated from many locations. The save format has no version identifier and `loadGame` uses `Object.assign(currentState, savedState)`, which can leave stale keys or produce shape mismatches as the code evolves.

**Recommendation:** Add a `SAVE_VERSION` field and a migration function for loading old saves. Consider using a centralized state update pattern (even a simple `updateState(fn)` wrapper) to make changes traceable.

### 4.6 Effects DSL handled through large if/else chains
Entry effects are processed through hundreds of lines of sequential `if (effects.X)` checks in `handleEntryEffects` and `makeChoice`. This is hard to extend and error-prone.

**Recommendation:** Create an effect handler registry:
```javascript
const effectHandlers = {
  health: (value) => updateHealth(value),
  sanity: (value) => updateSanity(value),
  addItem: (value) => addItem(value),
  // ...
}

function handleEffects(effects) {
  for (const [key, value] of Object.entries(effects)) {
    if (effectHandlers[key]) effectHandlers[key](value)
  }
}
```

---

## 5. Error Handling

### 5.1 `initializeGame` swallows fetch errors
`src/game/gameState.js:91-93` catches fetch failures and only logs them. The game starts in a broken partial state with no user feedback.

**Fix:** Display an error message to the user and prevent further interaction when game data fails to load.

### 5.2 `loadState` has no JSON parse protection
`src/utils/storage.js:5-8` calls `JSON.parse` without `try/catch`. Corrupted localStorage data will throw an unhandled exception.

**Fix:**
```javascript
export function loadState(key) {
  try {
    const state = localStorage.getItem(key)
    return state ? JSON.parse(state) : null
  } catch (e) {
    console.error('Failed to load state:', e)
    return null
  }
}
```

### 5.3 Inconsistent null checks on DOM elements
Some functions guard against missing elements (e.g., `updateCalendarAndTimeDisplay` checks `clockElement`), while others access `getElementById(...).innerText` or `.style` without checking (e.g., `showMinimapIfPiecesExist` at line 2651, `updateHealth` at line 1334).

**Fix:** Always guard DOM lookups, or establish a convention where elements are guaranteed to exist and assert that in development.

### 5.4 Empty `catch` block hides failures
`src/game/gameActions.js:165-171` catches errors from `displayLocations` with a bare `catch {}`, hiding diagnostic information.

**Fix:** At minimum, log the error: `catch (error) { console.error(error); ... }`.

---

## 6. Testing

### 6.1 No test coverage metrics
`jest.config.js` has no `collectCoverage`, `coverageThreshold`, or coverage reporters configured.

**Recommendation:** Add coverage configuration:
```javascript
collectCoverage: true,
coverageDirectory: 'coverage',
coverageThreshold: {
  global: { branches: 60, functions: 60, lines: 60, statements: 60 },
},
```

### 6.2 `storage.js` and `scripts/` are untested
`src/utils/storage.js` has no test coverage. The utility scripts under `scripts/` have no tests either.

**Recommendation:** Add tests for `saveState`, `loadState`, and `getData`.

### 6.3 Single monolithic test file
`tests/game.test.js` is ~3,252 lines — hard to navigate and maintain.

**Recommendation:** Split into focused test files mirroring the source structure:
- `tests/gameState.test.js`
- `tests/gameActions.test.js`
- `tests/gameUI.test.js`
- `tests/dice.test.js`
- `tests/storage.test.js`

### 6.4 No randomness mocking strategy
`rollDice` uses `Math.random` directly. Tests can't control dice outcomes cleanly without patching globals.

**Recommendation:** Accept a random number generator as an optional parameter, defaulting to `Math.random`:
```javascript
export function rollDice(sides, rng = Math.random) {
  return Math.floor(rng() * sides) + 1
}
```

---

## 7. CI/CD & Tooling

### 7.1 No ESLint configuration
The project only uses Prettier (formatting). There is no static analysis to catch unused variables, type errors, `innerHTML` misuse, or other common issues.

**Recommendation:** Add ESLint with a sensible preset:
```bash
yarn add -D eslint @eslint/js
```
Consider `eslint-plugin-no-unsanitized` for flagging `innerHTML` usage.

### 7.2 No lint or format check in CI
The GitHub Actions workflow only runs `yarn test`. Formatting issues and lint violations can be merged without detection.

**Recommendation:** Add steps to CI:
```yaml
- name: Check formatting
  run: npx prettier --check .

- name: Lint
  run: npx eslint src/ tests/
```

### 7.3 No CI on push to `main`
The workflow only triggers on `pull_request`. Direct pushes or merged PRs don't run the test suite.

**Fix:** Add `push` trigger:
```yaml
on:
  push:
    branches: ['main']
  pull_request:
    branches: ['*']
```

### 7.4 No dependency update automation
No Dependabot or Renovate configuration exists. Dependencies can silently become outdated or accumulate vulnerabilities.

**Recommendation:** Add `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 7.5 Tailwind `purge` is empty
`tailwind.config.js` has `purge: []`, meaning no CSS tree-shaking occurs. The output CSS will contain all of Tailwind's utility classes.

**Fix:**
```javascript
content: ['./*.html', './src/**/*.js'],
```
(Note: Tailwind v3 renamed `purge` to `content`.)

---

## 8. Code Quality Quick Wins

### 8.1 Extract magic numbers into named constants
Hardcoded values like `150` (skill points), `100` (health), date `new Date(1931, 8, 1)`, and various `setTimeout` delays should be named constants at the top of the relevant module.

```javascript
const MAX_SKILL_POINTS = 150
const GAME_START_DATE = new Date(1931, 8, 1)
const MARKER_FADE_DELAY_MS = 6000
```

### 8.2 Use `classList.toggle` instead of manual add/remove
`src/index.js:28-33` manually checks and toggles a class. This can be simplified:
```javascript
document.getElementById('inventoryPanel').classList.toggle('open')
```

### 8.3 `console.log` left in production code
`src/utils/dice.js:44` and various places in `gameActions.js` have `console.log` calls used for debugging.

**Recommendation:** Remove debug logging or gate it behind a `DEBUG` flag.

### 8.4 Inconsistent code style in `storage.js`
`storage.js` uses semicolons while the rest of the codebase (per `.prettierrc`) does not. Run `npx prettier --write src/utils/storage.js` to fix.

### 8.5 `scripts/missing` invokes `code` (VS Code)
`package.json:10` has `cd output && code missingEntries.json` which fails on headless/CI environments.

**Fix:** Remove the `code` invocation, or make it optional.

---

## 9. Summary — Prioritized Action Items

| Priority | Category | Item |
|----------|----------|------|
| **P0** | Bug | Fix `currentEntryId` not accessible in `index.js` (§1.1) |
| **P0** | Bug | Fix combat health clamp operator precedence (§1.4) |
| **P0** | Bug | Fix book shop `includes` comparing objects to strings (§1.6) |
| **P0** | Bug | Fix custom roll inventory check (§1.7) |
| **P0** | Bug | Remove duplicate `DOMContentLoaded` in `gameUI.js` (§1.3) |
| **P0** | Bug | Fix nested `DOMContentLoaded` that never fires (§1.2) |
| **P1** | Bug | Fix `multipleChecks` using wrong check parameters (§1.5) |
| **P1** | Bug | Fix `fullHealth` hardcoded 100 (§1.9, §1.10) |
| **P1** | Duplication | Remove duplicated `minHotelStays` block (§3.1) |
| **P1** | Dead Code | Remove `updateChoices`, `updateDotPosition`, `findWeaponByName` (§2) |
| **P1** | Error Handling | Add JSON parse protection to `loadState` (§5.2) |
| **P2** | Duplication | Extract `defaultBaseValues` to a constant (§3.2) |
| **P2** | Architecture | Split `gameActions.js` into focused modules (§4.1) |
| **P2** | Architecture | Separate state logic from DOM rendering (§4.2) |
| **P2** | Tooling | Add ESLint (§7.1) |
| **P2** | Tooling | Add lint/format checks to CI (§7.2) |
| **P2** | Testing | Add coverage metrics (§6.1) |
| **P3** | Architecture | Resolve circular dependencies (§4.3) |
| **P3** | Architecture | Implement effect handler registry (§4.6) |
| **P3** | Testing | Split monolithic test file (§6.3) |
| **P3** | Tooling | Add Dependabot config (§7.4) |
| **P3** | Tooling | Fix Tailwind purge/content config (§7.5) |
| **P3** | Quality | Extract magic numbers, remove debug logging (§8) |
