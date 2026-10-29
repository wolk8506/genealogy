// pages/Page_Families/nodes/PersonNode.jsx
// Карточка человека на схеме семьи: hero (супруг), compact (родитель),
// child (ребёнок) и пустой слот.

import React from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import PersonAvatar from "../../../components/PersonAvatar";
import {
  formatYears,
  maidenLabel,
  personInitials,
  personName,
  toId,
} from "../../../utils/families/familyLabels";
import { genderColor, familyCardSx, RADII } from "../familyTheme";

export const NODE_SIZES = {
  hero: { avatar: 56, height: 92, width: 256, name: 15, meta: 12, pad: "12px 14px" },
  compact: { avatar: 34, height: 64, width: 202, name: 13, meta: 11, pad: "9px 8px" },
  child: { avatar: 34, height: 60, width: "100%", name: 13, meta: 11, pad: "9px 10px" },
};

const SIZES = NODE_SIZES;

export default function PersonNode({
  person,
  variant = "hero",
  selected = false,
  muted = false,
  badge = null,
  title = null,
  onSelect,
  sx,
}) {
  const theme = useTheme();
  if (!person) return null;

  const size = SIZES[variant] || SIZES.hero;
  const years = formatYears(person);
  const maiden = maidenLabel(person);
  const dot = genderColor(theme, person.gender);
  const archived = Boolean(person.archived);

  const handleSelect = () => {
    if (onSelect) onSelect(toId(person.id));
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={personName(person)}
      title={title || personName(person, { patronymic: true })}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      sx={[
        familyCardSx(theme, { selected }),
        {
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          width: size.width,
          height: size.height,
          px: size.pad.split(" ")[1],
          py: size.pad.split(" ")[0],
          borderRadius: `${RADII.card}px`,
          textAlign: "left",
          cursor: "pointer",
          userSelect: "none",
          outline: "none",
          opacity: muted ? 0.6 : 1,
          overflow: "hidden",
          flexShrink: 0,
          "&:hover": {
            transform: "translateY(-1px)",
            borderColor: alpha(theme.palette.primary.main, selected ? 0.8 : 0.35),
          },
          "&:focus-visible": {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`,
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <PersonAvatar
          personId={person.id}
          initials={personInitials(person)}
          size={size.avatar}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: dot,
            border: "2px solid",
            borderColor: theme.palette.background.paper,
          }}
        />
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          noWrap
          sx={{
            fontSize: size.name,
            fontWeight: variant === "hero" ? 650 : 600,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {personName(person)}
        </Typography>

        {variant === "hero" && (years || maiden) && (
          <Typography
            noWrap
            sx={{ fontSize: size.meta, color: "text.secondary", lineHeight: 1.35 }}
          >
            {[years, maiden].filter(Boolean).join(" · ")}
          </Typography>
        )}

        {variant !== "hero" && years && (
          <Typography
            noWrap
            sx={{ fontSize: size.meta, color: "text.secondary", lineHeight: 1.35 }}
          >
            {years}
          </Typography>
        )}

        {archived && (
          <Typography
            noWrap
            sx={{ fontSize: 10.5, color: "text.disabled", lineHeight: 1.3 }}
          >
            в архиве
          </Typography>
        )}
      </Box>

      {badge && (
        <Box
          sx={{
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            color: "text.secondary",
            backgroundColor: alpha(theme.palette.text.primary, 0.06),
          }}
        >
          {badge}
        </Box>
      )}
    </Box>
  );
}

export function EmptyPersonNode({
  label = "не указан",
  width = 196,
  height = 64,
}) {
  return (
    <Box
      sx={{
        width,
        height,
        display: "grid",
        placeItems: "center",
        px: 1,
        borderRadius: `${RADII.card}px`,
        border: "1.5px dashed",
        borderColor: "divider",
        color: "text.disabled",
        fontSize: 11.5,
        textAlign: "center",
        lineHeight: 1.3,
      }}
    >
      {label}
    </Box>
  );
}

export function ChildOwnFamilyBadge() {
  return <AccountTreeRoundedIcon sx={{ fontSize: 14 }} />;
}
