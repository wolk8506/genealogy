// pages/Page_Families/catalog/FamilyCard.jsx
// Карточка семьи в каталоге.

import React from "react";
import { Box, Chip, Stack, Typography, alpha, useTheme } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PersonAvatar from "../../../components/PersonAvatar";
import { familyCardSx } from "../familyTheme";
import {
  personInitials,
  unionMetaLine,
  unionStatusMeta,
  unionTitle,
} from "../../../utils/families/familyLabels";

export default function FamilyCard({ family, onOpen }) {
  const theme = useTheme();
  const status = unionStatusMeta(family.status);
  const archived = (family.partners || []).some((person) => person.archived);
  const fromEventOnly =
    family.sources?.includes("event") && !family.sources?.includes("spouse");

  const handleOpen = () => onOpen?.(family.key);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpen();
        }
      }}
      sx={[
        familyCardSx(theme),
        {
          p: 1.75,
          cursor: "pointer",
          outline: "none",
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: alpha(theme.palette.primary.main, 0.35),
          },
          "&:focus-visible": {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`,
          },
        },
      ]}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ display: "flex", flexShrink: 0, pl: 0.25 }}>
          {(family.partners || []).map((person, index) => (
            <Box
              key={person.id}
              sx={{
                ml: index ? "-10px" : 0,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: theme.palette.background.paper,
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              }}
            >
              <PersonAvatar
                personId={person.id}
                initials={personInitials(person)}
                size={34}
              />
            </Box>
          ))}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              fontSize: 14,
              fontWeight: 650,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            {unionTitle(family)}
          </Typography>
          <Typography
            noWrap
            sx={{ fontSize: 11.5, color: "text.secondary", lineHeight: 1.4 }}
          >
            {unionMetaLine(family) || "дата и место не указаны"}
          </Typography>
        </Box>

        <ChevronRightRoundedIcon
          sx={{ fontSize: 18, color: "text.disabled", flexShrink: 0 }}
        />
      </Stack>

      {(status || family.isSingle || archived || fromEventOnly) && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 1.25, flexWrap: "wrap", gap: 0.5 }}
        >
          {status && family.status !== "married" && (
            <Chip
              size="small"
              label={status.label}
              sx={{
                height: 19,
                fontSize: "0.66rem",
                fontWeight: 600,
                color: (t) => t.palette.accents?.[status.tone] || "text.secondary",
                backgroundColor: (t) =>
                  `${t.palette.accents?.[status.tone] || "#8E8E93"}1F`,
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}

          {family.isSingle && (
            <Chip
              size="small"
              label="неполная"
              sx={{
                height: 19,
                fontSize: "0.66rem",
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}

          {archived && (
            <Chip
              size="small"
              label="архив"
              sx={{
                height: 19,
                fontSize: "0.66rem",
                color: "text.secondary",
                backgroundColor: "action.hover",
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}

          {fromEventOnly && (
            <Chip
              size="small"
              label="из события"
              title="Брак указан событием, а не связью супругов"
              sx={{
                height: 19,
                fontSize: "0.66rem",
                color: "text.secondary",
                backgroundColor: "action.hover",
                "& .MuiChip-label": { px: 0.8 },
              }}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}
