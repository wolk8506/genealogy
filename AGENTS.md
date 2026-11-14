# Agent instructions (Genealogy React)

Проект: **Electron + React**, данные в `~/Documents/Genealogy/`, UI на **русском** для пользователя.

## Read first

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | Runtime, routes, photos & faces data flow |
| [docs/design/README.md](docs/design/README.md) | Apple-style UI, Figma link, tokens & components |
| [USER_GUIDE.md](USER_GUIDE.md) | End-user behavior (Russian) |
| [CHANGELOG.md](CHANGELOG.md) | Release notes; see unreleased policy in rules |

## UI stack (confirmed 12.11.2026)

- **New UI**: Base UI (`@base-ui/react`) + app theme tokens (Apple / iOS-like, cross-platform).
- **MUI**: legacy — date pickers, Autocomplete, complex menus; replace gradually, no big-bang rewrite.
- Do **not** add new MUI primitives if Base UI has an equivalent.
- MUI and Base UI surfaces must look the same: shared theme, z-index, portals, focus.

## Design source

- Figma (author copy): [macOS 27 Community — Copy](https://www.figma.com/design/iNTC5hH5Yfj3bC127fwSDo/macOS-27--Community---Copy---Copy-?node-id=131-8996)
- Numbers and mapping: `docs/design/tokens.md`, `docs/design/components.md`
- App bar glass capsule (**single vs group** hits, `ButtonConteiner`, `ToolbarCapsuleContext`): [docs/design/patterns.md](docs/design/patterns.md) § App bar — **Single vs group**.
- Do **not** invent radii, button sizes, or colors — reuse tokens and primitives.

## Governance (mandatory)

1. **Do not edit** `AGENTS.md`, `.cursor/rules/`, or `docs/design/*` / `docs/architecture.md` without asking: *«Обновляем правила/документацию?»* and explicit user approval.
2. **Visual changes**: do not refactor look-and-feel to match Figma without user approval if it changes existing screens.
3. **Screenshots**: agent does not capture UI for verification; ask the user for a screenshot when design is unclear.
4. **CHANGELOG**: update when a user-visible block is done; while iterating an unreleased feature, merge edits into one bullet — no changelog per intermediate bugfix (see meta rule).

## Code conventions

- Minimal diff; match surrounding code; comments only for non-obvious logic.
- Face ML runs in **renderer** (`src/services/faceRecognition.js`); per-photo data in `photos.json`; face **reference index** and geocode cache in `genealogy.sqlite` via `faceAPI` → `src/main/db/faceDb.cjs` (legacy `face-index.json` migrates on first open). IPC: `face:mergePersonIds` — no dedicated UI yet.
- Commits only when the user asks.
