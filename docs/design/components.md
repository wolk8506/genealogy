# UI primitives catalog

**Rule:** reuse before creating. New primitive only if used twice+, or mapped from Figma and approved by user.

## Buttons

| Component | Path | Use |
|-----------|------|-----|
| `AppButton` | `src/components/AppButton.jsx` | **Toolbar, settings cards, in-page** actions; presets: `primary`, `secondary`, `danger`, `dangerOutlined`, `ghost` |
| Styles | `src/components/appButtonStyles.js` | Shared geometry for `AppButton` — do not duplicate `height: 24` / `borderRadius: 12` on toolbars |
| Toolbar tokens | `src/layout/toolbarTokens.js` | App bar capsule metrics — edit here, not `docs/design/tokens.md` tables |
| `DialogActionButton` | `src/components/Dialog/DialogActionButton.jsx` | **Modal / dialog footers**; tones: `primary`, `secondary`, `danger` |
| `DialogActionsBar` | same file | Flex row for dialog buttons (`dialogActionsSx`) |
| `ToolbarButtonGroup` | `src/components/ToolbarButtonGroup.jsx` | **App bar** glass capsule; 1–N children; auto **single** vs **group** padding (see `patterns.md`) |
| `ButtonConteiner` | `src/components/ButtonConteiner.jsx` | 1–N icon buttons; single child → full-bleed **36×36** hit |
| `ToolbarCapsuleContext` | `src/components/ToolbarCapsuleContext.jsx` | `useToolbarCapsuleSingle`, `useToolbarButtonGroupHitSx`, `useToolbarSegmentSx`, `ToolbarSegmentHit` |

### When to use which

| Surface | Use |
|---------|-----|
| Settings card, map toolbar, gallery chrome | `AppButton` |
| Dialog footer (Save / Cancel / destructive) | `DialogActionButton` inside `DialogActionsBar` |
| App bar: grouped icon / filter / sort controls | `ToolbarButtonGroup` (2+ children) + hooks / `ToolbarSegmentHit` |
| App bar: lone icon or lone segment (text ok) | `ButtonConteiner` (1 icon) or `ToolbarButtonGroup` (1 child) + hooks |
| Styling hit inside capsule | `useToolbarButtonGroupHitSx` / `useToolbarSegmentSx` — not raw `toolbar*Sx` without `isSingle` |
| Icon-only control (elsewhere) | `IconButton` (theme + glass where map/notifications already do) |

Do **not** use raw `Button` for standard actions in new code — pick `AppButton` or `DialogActionButton`.

## Inputs & toggles

| Component | Path | Use |
|-----------|------|-----|
| `CustomSwitch` | `src/components/CustomSwitch.jsx` | Settings toggles (not raw MUI Switch in new code) |
| `NumberField` | `src/components/NumberField.jsx` | Numeric input where used |
| Base UI `Toggle` | `@base-ui/react/toggle` | Toolbar segment in `ToolbarButtonGroup`; render via `ToolbarSegmentHit` (`ExpandingGenSelect`, person tabs, …) |

## Media & photos

| Component | Path | Use |
|-----------|------|-----|
| `PhotoFaceOverlay` | `src/components/PhotoFaceOverlay.jsx` | Face boxes; draw, move (RMB), resize handle |
| `PhotoMetaUpdateDialog` | `src/components/Dialog/PhotoMetaUpdateDialog.jsx` | Photo metadata + faces reference layout |

## Content

| Component | Path | Use |
|-----------|------|-----|
| `MarkdownViewer` | `src/components/MarkdownViewer.jsx` | Read-only markdown (changelog, user guide) |

## Legacy (do not extend without reason)

- Raw `@mui/material/Button` — replace with `AppButton` when touching the file.
- New MUI components — only if no Base UI equivalent (see `AGENTS.md`).

## Adding a primitive

1. Propose name and props to the user.
2. Add one line to this file after approval.
3. Optionally add Figma row in `tokens.md`.
