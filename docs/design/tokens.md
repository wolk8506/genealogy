# Design tokens

Figma: see [README.md](README.md).

**App bar glass capsule:** numeric values live only in [`src/layout/toolbarTokens.js`](../src/layout/toolbarTokens.js). Change that file when the user approves a visual tweak; keep this doc as an index (no duplicated numbers).

Other sections below still list values in-repo until they get the same treatment (`appButtonStyles.js`, etc.).

## In-page buttons (`AppButton` — `appButtonStyles.js`)

| Token | Value | Notes |
|-------|-------|-------|
| `button.height` | 24px | `AppButton` |
| `button.radius` | 12px | |
| `button.fontSize` | 0.875rem | |
| `button.fontWeight` | 600 | |
| `button.textTransform` | none | No all-caps |
| `button.shadow` | none | Flat Apple-style |

## Dialog buttons (`DialogActionButton.jsx`)

| Token | Value | Notes |
|-------|-------|-------|
| `dialogButton.height` | 32px | Modal footers |
| `dialogButton.radius` | 999px | Full pill |
| `dialogButton.minWidth` | 110px | Per-button; bar uses `maxWidth: 220` |
| `dialogButton.fontSize` | 0.875rem | |
| `dialogButton.fontWeight` | 500 | Slightly lighter than `AppButton` |
| `dialogButton.textTransform` | none | |
| `dialogActions.gap` | 18px | `DialogActionsBar` |

## Surfaces

| Token | Where | Notes |
|-------|-------|-------|
| `glass.*` | `src/theme/palette.js` | Map, overlays, glass buttons |
| Settings cards | `height: 525px`, `borderRadius: 5` (20px) | `ArchivedPeoplePage` `cardStyle` |

## Segment / pill controls (in-page, not App bar)

| Token | Value | Reference |
|-------|-------|-------|
| `segment.radius` | 16px | Person tabs and similar (CHANGELOG v1.14); **not** App bar glass capsule |

## App bar glass capsule

Pattern: `docs/design/patterns.md` § App bar — glass toolbar capsule.

| Export | Used by |
|--------|---------|
| `TOOLBAR_CAPSULE` | Capsule shell: height, padding, radius, `gapControlsPx`, `gapSegmentsPx`, glass bg/border/shadow |
| `TOOLBAR_HIT` | Hit zone: `gapPx` (icon↔chevron, usually 0), `gapIconLabelPx` (icon↔label when expanded), sizes, active/hover bg |
| `TOOLBAR_ICON` | `toolbarIconColor()` — capsule foreground; hits use `inherit` (see `patterns.md`) |
| `TOOLBAR_MENU` | Menus from capsule (`ExpandingGroupSelect`, `FamilySortPill`, …) — paper/rows |
| `TOOLBAR_SEGMENT_RADIUS` | In-page segments (not App bar capsule hit radius) |

Capsule outline (`TOOLBAR_CAPSULE`, applied in `toolbarButtonGroupBackgroundSx`):

| Key | Theme | Value |
|-----|-------|-------|
| `borderLight` | light | `1px solid rgb(255 255 255 / 50%)` |
| `borderDark` | dark | `1px solid rgb(0 0 0 / 60%)` |

Styles: `src/layout/toolbarStyles.js` (reads tokens only). Components: `ToolbarButtonGroup.jsx`, `ToolbarCapsuleContext.jsx`.

Single vs group hit behavior: `docs/design/patterns.md` § App bar — **Single vs group** (not duplicated here).

Icon fill keys (`TOOLBAR_ICON` in `toolbarTokens.js`): `fgDark`, `fgLight` — resolved by `toolbarIconColor`.

Menu arrow: `popoverArrowSx()` in `src/theme/popoverArrow.js` (geometry, not in `toolbarTokens.js`).

## Figma (to fill from kit)

When implementing new controls, measure in Figma and add a row here:

| Figma component | height | radius | padding | Mapped to |
|-----------------|--------|--------|---------|-----------|
| Button (filled) | TBD | TBD | TBD | `AppButton` primary or `DialogActionButton` tone `primary` |
| Button (gray) | TBD | TBD | TBD | `AppButton` secondary or `DialogActionButton` tone `secondary` |
| Toggle / Switch | TBD | TBD | — | `CustomSwitch` |
| App bar glass capsule | see `TOOLBAR_CAPSULE` | see `toolbarTokens.js` | see `toolbarTokens.js` | `ToolbarButtonGroup` |
| Grouped card | TBD | TBD | TBD | Settings `Card` pattern |

**TBD** = not synced yet; keep current code values until user asks to align with Figma.
