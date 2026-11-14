import React from "react";
import { Box } from "@mui/material";
import ToolbarButtonGroup from "./ToolbarButtonGroup";
import {
  useToolbarButtonGroupHitSx,
  useToolbarCapsuleSingle,
} from "./ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../layout/toolbarTokens";

/**
 * Одна или несколько icon-кнопок в glass-капсуле (как эталон галереи).
 */
function IconHitWrapper({ children }) {
  const isSingle = useToolbarCapsuleSingle();
  const hitSx = useToolbarButtonGroupHitSx(false);
  const btnSize = isSingle ? TOOLBAR_CAPSULE.height : TOOLBAR_HIT.minWidth;

  return (
    <Box
      sx={{
        ...hitSx,
        p: 0,
        ...(isSingle && {
          width: TOOLBAR_CAPSULE.height,
          flex: `0 0 ${TOOLBAR_CAPSULE.height}px`,
        }),
        "& > .MuiTooltip-root": {
          display: "inline-flex",
          width: isSingle ? "100%" : "auto",
          height: isSingle ? "100%" : "auto",
          alignItems: "center",
          justifyContent: "center",
        },
        "& .MuiIconButton-root": {
          width: btnSize,
          height: btnSize,
          p: 0,
          borderRadius: isSingle
            ? TOOLBAR_CAPSULE.radiusPx
            : TOOLBAR_HIT.radiusPx,
          color: "inherit",
        },
        "& .MuiIconButton-root:hover": {
          backgroundColor: "transparent",
        },
      }}
    >
      {children}
    </Box>
  );
}

export default function ButtonConteiner({ children, sx, contentSx }) {
  const count = React.Children.count(children);
  const gap = count > 1 ? TOOLBAR_CAPSULE.gapControlsPx : 0;

  return (
    <ToolbarButtonGroup gap={gap} sx={sx} contentSx={contentSx}>
      {React.Children.map(children, (child, index) => (
        <IconHitWrapper key={child?.key ?? index}>
          {child}
        </IconHitWrapper>
      ))}
    </ToolbarButtonGroup>
  );
}
