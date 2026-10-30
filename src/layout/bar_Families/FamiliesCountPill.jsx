// layout/bar_Families/FamiliesCountPill.jsx
// Количество семей в хедере приложения — pill в стиле остальных кнопок.

import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import { toolbarPillSx } from "../toolbarStyles";

export default function FamiliesCountPill({ count = 0 }) {
  const label = `Количество семей: ${count}`;

  return (
    <Tooltip title={label}>
      <Box
        role="status"
        aria-label={label}
        sx={{
          ...toolbarPillSx,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.75,
          px: 1.5,
          color: "text.primary",
          backdropFilter: "blur(6px)",
          userSelect: "none",
        }}
      >
        <FamilyRestroomRoundedIcon sx={{ fontSize: 17, opacity: 0.8 }} />
        <Typography
          component="span"
          sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}
        >
          {count}
        </Typography>
      </Box>
    </Tooltip>
  );
}
