import React from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { KIND_COLOR } from "./mapHelpers";

const ITEMS = [
  { color: KIND_COLOR.photo, label: "Фото" },
  { color: KIND_COLOR.event, label: "События" },
  { color: KIND_COLOR.external, label: "Справочник" },
  { color: KIND_COLOR.mixed, label: "Несколько" },
];

export default function MapLegend() {
  const theme = useTheme();
  const bg = theme.palette.glass.surface;
  const fg = theme.palette.text.primary;

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        color: fg,
        bgcolor: bg,
        borderRadius: 2,
        px: 1.5,
        py: 1,
        boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        pointerEvents: "none",
      }}
    >
      <Stack spacing={0.5}>
        {ITEMS.map((item) => (
          <Stack key={item.label} direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: item.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="inherit">
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
