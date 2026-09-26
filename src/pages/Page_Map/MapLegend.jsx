import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { KIND_COLOR } from "./mapHelpers";

const ITEMS = [
  { color: KIND_COLOR.photo, label: "Фото" },
  { color: KIND_COLOR.event, label: "События" },
  { color: KIND_COLOR.external, label: "Справочник" },
  { color: KIND_COLOR.mixed, label: "Несколько" },
];

export default function MapLegend() {
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: 12,
        left: 12,
        zIndex: 1000,
        bgcolor: "background.paper",
        borderRadius: 2,
        px: 1.5,
        py: 1,
        boxShadow: 2,
        border: "1px solid",
        borderColor: "divider",
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
            <Typography variant="caption">{item.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
