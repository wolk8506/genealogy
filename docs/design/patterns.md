# UI patterns (reference files)

Copy structure and spacing from these files; do not invent a new layout for the same pattern.

## Settings master card

- **Pattern**: Header strip + scrollable body + primary CTA; `cardStyle` height ~525px.
- **References**: `src/pages/Page_Settings/OptimizationMasterCard.jsx`, `FaceScanMasterCard.jsx`
- **Container**: `ArchivedPeoplePage.jsx` grid, `cardStyle` object.

## Draggable modal dialog

- **Reference**: `PhotoMetaUpdateDialog.jsx` + `DraggableDialog.jsx`
- Photo preview left, form right; overlay tools top-left on preview.

## Fullscreen photo

- **Reference**: `PhotoFullscreenViewer.jsx`
- Face toggle; horizontal drag navigation.

## Notifications

- Store: `src/store/useNotificationStore.js`
- Always set `category` for icon mapping (`NotificationBell.jsx`).

## Face queues (full-page)

- **Shared UI**: `src/pages/Page_Settings/FacesQueueView.jsx`
- **Routes** (in `MainLayout.jsx`):
  - `/settings/faces/review` → `FaceReviewQueuePage.jsx` → `FacesQueueView` `mode="review"` (confirm suggested / assign people)
  - `/settings/faces/no-faces` → `FaceNoFacesQueuePage.jsx` → `FacesQueueView` `mode="noFaces"`
- **Entry**: `FaceScanMasterCard` buttons, `NotificationBell` → `navigate(...)`; counts in `useFaceReviewStore` (`pendingCount`, `noFacesCount`).
- **Actions**: `AppButton` for toolbar/footer actions in this view (see `FacesQueueView.jsx`).

## Modal dialog actions (footer)

- **Reference**: `src/components/Dialog/DialogActionButton.jsx` + `DialogActionsBar`
- Used in `PhotoMetaUpdateDialog`, `ConfirmDialog`, most editors — **pill** buttons (see `tokens.md`).

## App bar — glass toolbar capsule

Frosted **capsule** on the transparent `AppBar` (Finder-style). One capsule can hold several icon/segment controls; reuse `ToolbarButtonGroup` / `ButtonConteiner`, not ad-hoc pill boxes.

| Piece | Where | Role |
|-------|-------|------|
| `ToolbarButtonGroup` | `src/components/ToolbarButtonGroup.jsx` | Wrapper: background layer + content row (`gap` prop) |
| Tokens | `src/layout/toolbarTokens.js` | **Numbers** — `TOOLBAR_CAPSULE`, `TOOLBAR_HIT`, `TOOLBAR_ICON`, `TOOLBAR_MENU` |
| Styles | `src/layout/toolbarStyles.js` | SX built from tokens: `toolbarButtonGroupSx`, `toolbarButtonGroupHitSx`, `toolbarSegmentSx`, `toolbarIconColor`, … |
| Hit zone (group) | `toolbarButtonGroupHitSx` | 28×28 inset, radius `100px`, icons **20px**; default inner gap **0** (`TOOLBAR_HIT.gapPx`) |
| Hit zone (single) | same fn + `isSingle` / context | **36×36** to capsule edges, radius **1000px**; hover/pressed fill full inner area |
| Capsule | height **36**, radius **1000px** | Glass bg + shadow; outline in `tokens.md` (`borderLight` / `borderDark`) |
| Capsule padding | **4px** group only | **0** when single (one direct child) |
| Between controls in one capsule | `TOOLBAR_CAPSULE.gapControlsPx` (**4px**) | e.g. two icons in `ButtonConteiner` |
| Between segments in one capsule | `TOOLBAR_CAPSULE.gapSegmentsPx` (**4px**) | People list dates block, `PersonTabCluster`, gallery group+sort |
| Icon ↔ label inside hit (expanded) | `TOOLBAR_HIT.gapIconLabelPx` (**2px**) | Group select, date/gen filters, map layers — override default `gapPx` on hit when label visible |

### Icon & label color in hits (mandatory)

- Capsule sets foreground via `toolbarIconColor` → `ToolbarButtonGroup` `color`.
- Icons, chevrons, and segment captions in the **hit** use `color: "inherit"` (not `primary.main`, not `text.primary`).
- **Pressed / selected** segment: `TOOLBAR_HIT.bgActive` on the hit; keep glyph color inherited.
- **Exception:** menus/popovers opened from the segment (paper title in `primary`, selected row) — not the hit itself.
- **Exception:** deliberate accents (e.g. edit mode filled button on bio, colored tag chips in tags filter).

### Single vs group (mandatory)

**Detection:** `ToolbarButtonGroup` sets `isSingle` when `React.Children.count(children) === 1` (unless `forceGroup` — composite control in one wrapper, e.g. expanding people filter).

| Mode | Outer capsule | Hit / hover |
|------|----------------|-------------|
| **Single** | Same **36px** height; **no** inner padding | Hit to **border**: full capsule height/width; radius capsule. Icon-only: **36×36**; text/chevron pills (sort, tags, count): hit stretches with content (`minWidth` 36). |
| **Group** | Padding **4px** between shell and hits | Each control **28×28** inset; segment hover does **not** touch capsule border. |

**What counts as single**

- One `IconButton` (or tooltip + icon): `ButtonConteiner` with one child — drawer, bell, add, trash, right panel (`NotificationBell`, `PeopleListToolbar`).
- One `Toggle` / one trigger button in the capsule: sort generations, tags filter, `FamilySortPill`, `FamiliesCountPill`.
- **Not** single: 2+ direct children (nav back/forward, filter date block), multi-segment `PersonTabCluster`.

**Implementation**

- Context: `ToolbarCapsuleSingleContext` in `ToolbarCapsuleContext.jsx` — use `useToolbarButtonGroupHitSx`, `useToolbarSegmentSx`, or `ToolbarSegmentHit` for Base UI `Toggle` (do not call `toolbarSegmentSx(pressed)` without context).
- Icon singles: `ButtonConteiner` → `IconHitWrapper` sizes `IconButton` to **36** when single, **28** when paired in one capsule; **no** extra `p` on `IconButton` (hover lives on hit wrapper).

**References (single)**

- Single icon: one child in `ButtonConteiner` — `MainLayout.jsx` (drawer, right panel), `NotificationBell.jsx`, `PeopleListToolbar.jsx` (add, trash)
- Single segment + label: `ExpandingSortButton.jsx`, `ExpandingTegsFilter.jsx`, `FamiliesCountPill.jsx`, `FamilyUnionPill.jsx`, `FamilySortPill.jsx` (one child in parent `ToolbarButtonGroup`)

**References (group)**

- Gallery group + sort: `GalleryGroupSortCluster.jsx` + `ExpandingGroupSelect` (`nested`) + `SortDirToggle` (`nested`); personal gallery via `PhotoToolbar.jsx`
- Paired icons in one capsule: two children in `ButtonConteiner` → inset 28px each
- Navigation: `NavigationButtons.jsx`
- People list date/gens block: one `ToolbarButtonGroup` + `ExpandingTimeSelect` / `ExpandingGenSelect`
- Person tabs: `PersonTabCluster.jsx`

**Dropdown from capsule segment** (grouping menus): `popoverArrowSx()` on `Menu` paper, radius **16px**, title overline in `primary`; items with check gutter + pill hover — see `ExpandingGroupSelect.jsx` and People list `ExpandingGenSelect.jsx`.

**Legacy:** none on App bar — use glass capsule only. `ExpandingSearch` → glass capsule (single collapsed / expanded field).

**Expanding search:** `src/components/ExpandingSearch.jsx` — collapsed = single `ToolbarButtonGroup` + full-bleed hit; expanded = `gap: 6px`, `px: 10px`, field icons **18px**, input **13px**; `:focus-within` outline `primary.main`.

When a new pattern appears twice, ask the user to add it here (after approval).
