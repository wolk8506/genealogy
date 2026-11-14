/**
 * App bar glass capsule & related toolbar metrics — single source of truth.
 * Human index: docs/design/tokens.md (do not duplicate numbers there).
 */

export const TOOLBAR_CAPSULE = {
  height: 36,
  padding: 4,
  radiusPx: "1000px",
  gapControlsPx: "4px",
  gapSegmentsPx: "4px",
  bgDark: "rgb(153 153 153 / 17%)",
  bgLight: "rgb(153 153 153 / 22%)",
  shadowDark: "0 8px 15px rgb(0 0 0 / 4%)",
  shadowLight: "0 8px 15px 0 rgb(0 0 0 / 6%)",
  borderLight: "1px solid rgb(255 255 255 / 50%)",
  borderDark: "1px solid rgb(0 0 0 / 60%)",
};

/** Default icon fill in app bar glass capsules. */
export const TOOLBAR_ICON = {
  fgDark: "rgb(227 227 226)",
  fgLight: "rgb(38 38 38)",
};

export const TOOLBAR_HIT = {
  height: 28,
  minWidth: 28,
  radiusPx: "100px",
  gapPx: "0",
  /** Иконка ↔ подпись в раскрытом hit (группировка, фильтры). */
  gapIconLabelPx: "2px",
  iconSize: 20,
  chevronSize: 16,
  /** Expandable hits (icon → icon+label). */
  activePaddingX: 0.75,
  /** Segments with label: same px active/inactive (no layout jump). */
  segmentPaddingX: 0.75,
  bgActive: "rgba(153, 153, 153, 0.24)",
  bgHoverActive: "rgba(153, 153, 153, 0.32)",
};

/** Menus opened from capsule controls (group select, sort, generations). */
export const TOOLBAR_MENU = {
  paperRadiusPx: "16px",
  itemRadiusPx: "10px",
  checkGutter: 18,
  checkIcon: 17,
};

/** In-page segmented controls — not App bar capsule hit radius. */
export const TOOLBAR_SEGMENT_RADIUS = "16px";
