import React from "react";
import { Button } from "@mui/material";
import {
  appButtonBaseSx,
  appButtonPresetSx,
} from "./appButtonStyles";

// Единые пресеты кнопок приложения:
// primary — основное действие, secondary — вторичное,
// danger — опасное действие, dangerOutlined — опасное вторичное,
// ghost — текстовая кнопка.
// Геометрия: высота 24, radius 12, без капса.
const PRESETS = {
  primary: { variant: "contained", color: "primary" },
  secondary: { variant: "text", color: "inherit" },
  danger: { variant: "text", color: "error" },
  dangerOutlined: { variant: "text", color: "error" },
  ghost: { variant: "text", color: "inherit" },
};

export default function AppButton({
  preset = "primary",
  sx,
  ...rest
}) {
  const p = PRESETS[preset] || PRESETS.primary;
  return (
    <Button
      variant={p.variant}
      color={p.color}
      sx={{
        ...appButtonBaseSx,
        ...appButtonPresetSx[preset],
        ...sx,
      }}
      {...rest}
    />
  );
}
