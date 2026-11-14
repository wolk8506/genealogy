/** Общий sx для кластеров кнопок в App bar (Electron drag / no-drag). */

export const toolbarClusterSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 1.5,
  flexShrink: 0,
  position: "relative",
  zIndex: 2,
  WebkitAppRegion: "no-drag",
};

export const toolbarDragSpacerSx = {
  flex: 1,
  minWidth: 16,
  alignSelf: "stretch",
  WebkitAppRegion: "drag",
};

export const toolbarRowSx = {
  alignItems: "center",
  flex: 1,
  minWidth: 0,
  height: "100%",
};

/** Растягивает page toolbar в App bar `Toolbar` (spacer + правый кластер). */
export const toolbarPageHostSx = {
  flex: 1,
  minWidth: 0,
  display: "flex",
};
