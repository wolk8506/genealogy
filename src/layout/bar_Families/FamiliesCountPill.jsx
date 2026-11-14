// layout/bar_Families/FamiliesCountPill.jsx
// Количество семей в хедере — отдельная glass-капсула слева от тулбара страницы.

import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { useToolbarButtonGroupHitSx } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT } from "../toolbarTokens";

function CountPillContent({ count, label }) {
  const hitSx = useToolbarButtonGroupHitSx(false);

  return (
    <Box
      role="status"
      aria-label={label}
      sx={{
        ...hitSx,
        gap: TOOLBAR_HIT.gapIconLabelPx,
        cursor: "default",
        userSelect: "none",
        color: "inherit",
      }}
    >
      <FamilyRestroomRoundedIcon
        sx={{ fontSize: 20, opacity: 0.85, color: "inherit" }}
      />
      <Typography
        component="span"
        sx={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
          color: "inherit",
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}

export default function FamiliesCountPill({ count = 0 }) {
  const label = `Количество семей: ${count}`;

  return (
    <Tooltip title={label}>
      <ToolbarButtonGroup>
        <CountPillContent count={count} label={label} />
      </ToolbarButtonGroup>
    </Tooltip>
  );
}
