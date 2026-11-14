import React from "react";
import { Box, useTheme } from "@mui/material";
import {
  toolbarButtonGroupBackgroundSx,
  toolbarButtonGroupSx,
  toolbarIconColor,
} from "../layout/toolbarStyles";
import { TOOLBAR_CAPSULE } from "../layout/toolbarTokens";
import { ToolbarCapsuleSingleContext } from "./ToolbarCapsuleContext";

/**
 * Стеклянная капсула тулбара (glass): фон + тень по теме, внутри — hit-зоны 28px.
 * Эталон: группировка + сортировка в глобальной галереи.
 */
export default function ToolbarButtonGroup({
  children,
  gap = TOOLBAR_CAPSULE.gapControlsPx,
  /** Составной контрол в одном ребёнке — оставить group padding (inset hits). */
  forceGroup = false,
  sx,
  contentSx,
}) {
  const theme = useTheme();
  const childCount = React.Children.count(children);
  const isSingle = !forceGroup && childCount === 1;

  return (
    <ToolbarCapsuleSingleContext.Provider value={isSingle}>
      <Box
        sx={{
          ...toolbarButtonGroupSx,
          color: (t) => toolbarIconColor(t),
          padding: isSingle ? 0 : `${TOOLBAR_CAPSULE.padding}px`,
          minWidth: isSingle ? TOOLBAR_CAPSULE.height : undefined,
          alignItems: isSingle ? "stretch" : "center",
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
          ...sx,
        }}
      >
        <Box sx={toolbarButtonGroupBackgroundSx(theme)} aria-hidden />
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            alignItems: isSingle ? "stretch" : "center",
            alignSelf: "stretch",
            flex: isSingle ? "1 1 auto" : undefined,
            minWidth: isSingle ? TOOLBAR_CAPSULE.height : undefined,
            height: "100%",
            width: isSingle ? "100%" : undefined,
            gap,
            ...(isSingle && {
              "& > *": {
                display: "flex",
                flex: "1 1 auto",
                alignSelf: "stretch",
                minHeight: TOOLBAR_CAPSULE.height,
                height: "100%",
                width: "100%",
                minWidth: TOOLBAR_CAPSULE.height,
              },
            }),
            ...contentSx,
          }}
        >
          {children}
        </Box>
      </Box>
    </ToolbarCapsuleSingleContext.Provider>
  );
}
