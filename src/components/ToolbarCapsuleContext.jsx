import React, { createContext, useContext } from "react";
import { ButtonBase } from "@mui/material";
import {
  toolbarButtonGroupHitSx,
  toolbarSegmentSx,
} from "../layout/toolbarStyles";

/** true, если в капсуле один прямой ребёнок (full-bleed hit). */
export const ToolbarCapsuleSingleContext = createContext(false);

export function useToolbarCapsuleSingle() {
  return useContext(ToolbarCapsuleSingleContext);
}

export function useToolbarButtonGroupHitSx(active) {
  const isSingle = useToolbarCapsuleSingle();
  return toolbarButtonGroupHitSx(active, isSingle);
}

export function useToolbarSegmentSx(pressed) {
  const isSingle = useToolbarCapsuleSingle();
  return toolbarSegmentSx(pressed, isSingle);
}

/** Base UI Toggle render: hit учитывает single/group в капсуле. */
export function ToolbarSegmentHit({
  pressed,
  children,
  sx: sxProp,
  ...buttonBaseProps
}) {
  const sx = useToolbarSegmentSx(pressed);
  return (
    <ButtonBase
      {...buttonBaseProps}
      sx={sxProp ? (Array.isArray(sxProp) ? [sx, ...sxProp] : [sx, sxProp]) : sx}
    >
      {children}
    </ButtonBase>
  );
}
