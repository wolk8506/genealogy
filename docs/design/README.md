# Design system (Apple-style)

## Figma reference

- **Author copy**: [macOS 27 Community — Copy — Copy](https://www.figma.com/design/iNTC5hH5Yfj3bC127fwSDo/macOS-27--Community---Copy---Copy-?node-id=131-8996)
- Community kit — read-only reference; values are transcribed into `tokens.md` (no Figma MCP in this project).

Product direction: **iOS / mobile Apple** feel on a **cross-platform desktop** app (grouped cards, soft radius, glass surfaces). Prefer kit controls: buttons, toggles, lists, grouped inset cards.

## Docs in this folder

| File | Content |
|------|---------|
| [tokens.md](tokens.md) | Sizes, radii, typography — source for agents |
| [components.md](components.md) | Reuse primitives before styling raw MUI/Base UI |
| [patterns.md](patterns.md) | Screen patterns and reference files |

## Agent workflow

1. Check `components.md` for an existing primitive (`AppButton`, `CustomSwitch`, …).
2. Use `tokens.md` and theme (`src/theme/`) — do not guess pixel values.
3. Copy layout from a **reference file** in `patterns.md` when adding a similar surface.
4. User-visible strings: **Russian**.
5. If Figma and code disagree: **do not change production UI** unless the user approves a visual update.

## Screenshots

The agent does not generate screenshots for design QA. Ask the user to attach a screenshot when verification is needed.
