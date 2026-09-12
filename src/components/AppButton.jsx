import React from "react";
import { Button } from "@mui/material";

// Единые пресеты кнопок приложения:
// primary — основное действие, secondary — вторичное,
// danger — опасное действие, dangerOutlined — опасное вторичное,
// ghost — текстовая кнопка.
// Геометрия везде одинаковая: radius 10, без капса, высота small 28 / medium 36.
const PRESETS = {
  primary: { variant: "contained", color: "primary" },
  secondary: { variant: "outlined", color: "inherit" },
  danger: { variant: "contained", color: "error" },
  dangerOutlined: { variant: "outlined", color: "error" },
  ghost: { variant: "text", color: "inherit" },
};

export default function AppButton({
  preset = "primary",
  size = "small",
  sx,
  ...rest
}) {
  const p = PRESETS[preset] || PRESETS.primary;
  return (
    <Button
      variant={p.variant}
      color={p.color}
      size={size}
      sx={{
        borderRadius: "10px",
        textTransform: "none",
        fontWeight: 600,
        height: size === "small" ? 28 : 36,
        ...sx,
      }}
      {...rest}
    />
  );
}
