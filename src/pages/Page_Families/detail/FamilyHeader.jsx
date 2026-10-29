// pages/Page_Families/detail/FamilyHeader.jsx
// Липкая шапка семьи: назад, название и мета союза.

import React from "react";
import { Box, Chip, IconButton, Stack, Typography, useTheme } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { familyGlassSx, RADII, toneColor } from "../familyTheme";
import {
  pluralChildren,
  unionMetaParts,
  unionStatusMeta,
  unionTitle,
} from "../../../utils/families/familyLabels";

function StatusChip({ status }) {
  const theme = useTheme();
  const meta = unionStatusMeta(status);
  if (!meta || status === "married") return null;

  const color = toneColor(theme, meta.tone);

  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{
        height: 20,
        fontSize: "0.68rem",
        fontWeight: 600,
        color,
        backgroundColor: `${color}1F`,
        border: "none",
        "& .MuiChip-label": { px: 0.9 },
      }}
    />
  );
}

export default function FamilyHeader({ family, onBack }) {
  const metaParts = unionMetaParts(family);
  const archived = (family.partners || []).some((person) => person.archived);
  const childCount = family.children?.length || 0;

  return (
    <Box
      sx={[
        familyGlassSx,
        {
          position: "sticky",
          top: 58,
          zIndex: 5,
          borderRadius: `${RADII.section}px`,
          px: 1.25,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        },
      ]}
    >
      <IconButton
        size="small"
        onClick={onBack}
        aria-label="К списку семей"
        title="К списку семей"
      >
        <ArrowBackRoundedIcon fontSize="small" />
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: 16.5,
              fontWeight: 650,
              letterSpacing: "-0.015em",
              lineHeight: 1.25,
            }}
          >
            {unionTitle(family)}
          </Typography>

          <StatusChip status={family.status} />

          {family.isSingle && (
            <Chip
              size="small"
              label="неполная"
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.9 },
              }}
            />
          )}

          {archived && (
            <Chip
              size="small"
              label="архив"
              sx={{
                height: 20,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "text.secondary",
                backgroundColor: "action.hover",
                "& .MuiChip-label": { px: 0.9 },
              }}
            />
          )}
        </Stack>

        <Typography
          noWrap
          sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
        >
          {metaParts.length
            ? metaParts.join(" · ")
            : childCount
              ? `${childCount} ${pluralChildren(childCount)}`
              : "дата и место не указаны"}
        </Typography>
      </Box>
    </Box>
  );
}
