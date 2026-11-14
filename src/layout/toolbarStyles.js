import {
  TOOLBAR_CAPSULE,
  TOOLBAR_HIT,
  TOOLBAR_ICON,
  TOOLBAR_SEGMENT_RADIUS,
} from "./toolbarTokens";

export const toolbarIconColor = (theme) =>
  theme.palette.mode === "dark" ? TOOLBAR_ICON.fgDark : TOOLBAR_ICON.fgLight;

export const toolbarSegmentRadius = TOOLBAR_SEGMENT_RADIUS;

/** Оболочка glass-капсулы; контент и gap — в `ToolbarButtonGroup`. */
export const toolbarButtonGroupSx = {
  display: "inline-flex",
  alignItems: "center",
  padding: `${TOOLBAR_CAPSULE.padding}px`,
  boxSizing: "border-box",
  width: "auto",
  height: TOOLBAR_CAPSULE.height,
  position: "relative",
  WebkitAppRegion: "no-drag",
  flexShrink: 0,
};

export const toolbarButtonGroupBackgroundSx = (theme) => {
  const isDark = theme.palette.mode === "dark";
  return {
    position: "absolute",
    inset: 0,
    borderRadius: TOOLBAR_CAPSULE.radiusPx,
    pointerEvents: "none",
    ...(isDark
      ? {
          background: TOOLBAR_CAPSULE.bgDark,
          boxShadow: TOOLBAR_CAPSULE.shadowDark,
          border: TOOLBAR_CAPSULE.borderDark,
        }
      : {
          background: TOOLBAR_CAPSULE.bgLight,
          boxShadow: TOOLBAR_CAPSULE.shadowLight,
          border: TOOLBAR_CAPSULE.borderLight,
        }),
  };
};

const toolbarHitHoverSx = (active) => ({
  "&:hover": {
    backgroundColor: (theme) =>
      active ? TOOLBAR_HIT.bgHoverActive : theme.palette.action.hover,
  },
});

const toolbarHitFocusSx = {
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: 1,
  },
};

const toolbarHitIconSx = {
  "& .MuiSvgIcon-root": {
    fontSize: TOOLBAR_HIT.iconSize,
  },
};

/** Hit внутри glass-капсулы: group — inset 28px; single — до краёв (без padding капсулы). */
export const toolbarButtonGroupHitSx = (active, isSingle = false) => {
  const shared = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: TOOLBAR_HIT.gapPx,
    m: 0,
    border: "none",
    background: active ? TOOLBAR_HIT.bgActive : "transparent",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
    WebkitAppRegion: "no-drag",
    transition: "background-color 0.15s",
    ...toolbarHitHoverSx(active),
    ...toolbarHitFocusSx,
    ...toolbarHitIconSx,
  };

  if (isSingle) {
    return {
      ...shared,
      flex: "1 1 auto",
      alignSelf: "stretch",
      width: "100%",
      minWidth: TOOLBAR_CAPSULE.height,
      height: "100%",
      minHeight: TOOLBAR_CAPSULE.height,
      boxSizing: "border-box",
      borderRadius: TOOLBAR_CAPSULE.radiusPx,
      px: TOOLBAR_HIT.segmentPaddingX,
      py: 0,
    };
  }

  return {
    ...shared,
    flex: "0 0 auto",
    minWidth: TOOLBAR_HIT.minWidth,
    height: TOOLBAR_HIT.height,
    px: active ? TOOLBAR_HIT.activePaddingX : 0,
    borderRadius: TOOLBAR_HIT.radiusPx,
  };
};

/** Сегмент внутри капсулы (Base UI Toggle + ButtonBase). */
export const toolbarSegmentSx = (pressed, isSingle = false) => ({
  ...toolbarButtonGroupHitSx(pressed, isSingle),
  px: TOOLBAR_HIT.segmentPaddingX,
  position: "relative",
  zIndex: 1,
  color: "inherit",
});
