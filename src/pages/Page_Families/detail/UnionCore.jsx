// pages/Page_Families/detail/UnionCore.jsx
// Ядро союза: два супруга и «капсула» брака между ними.

import React from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import AncestorRow, { PARENT_ROW_WIDTH } from "./AncestorRow";
import PersonNode, { NODE_SIZES } from "../nodes/PersonNode";
import {
  CHILD_STEM_HEIGHT,
  RADII,
  SCHEMA_MAX_WIDTH,
  toneColor,
} from "../familyTheme";
import {
  toId,
  unionStatusMeta,
} from "../../../utils/families/familyLabels";

export const HERO_HEIGHT = 92;

/** Колонка супруга равна карточке: линия союза упирается ровно в её край. */
const PARTNER_WIDTH = NODE_SIZES.hero.width;
const CAPSULE_COLUMN_MIN = 168;
const CAPSULE_COLUMN_MAX = 620;

/**
 * Родительский ряд шире карточки супруга, поэтому схема оставляет по бокам
 * поля на его выступ плюс небольшой воздух до рамки контейнера.
 */
const SCHEMA_GUTTER = 12;
const PARENT_ROW_OVERHANG = Math.max(
  0,
  (PARENT_ROW_WIDTH - PARTNER_WIDTH) / 2,
);

const rowSx = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
  width: "100%",
  maxWidth: SCHEMA_MAX_WIDTH,
  mx: "auto",
  px: `${PARENT_ROW_OVERHANG + SCHEMA_GUTTER}px`,
  boxSizing: "border-box",
};

/** Линия от низа одинокого супруга к блоку детей. */
const stemSx = {
  position: "absolute",
  bottom: `-${CHILD_STEM_HEIGHT}px`,
  left: "50%",
  transform: "translateX(-50%)",
  width: "1px",
  height: `${CHILD_STEM_HEIGHT}px`,
  backgroundColor: "divider",
};

function PartnerColumn({ partner, byId, selectedPersonId, onSelect }) {
  return (
    <Stack
      sx={{ flexShrink: 0, width: PARTNER_WIDTH, alignItems: "center" }}
      spacing={0}
    >
      <AncestorRow
        person={partner}
        byId={byId}
        selectedPersonId={selectedPersonId}
        onSelect={onSelect}
      />
      <PersonNode
        person={partner}
        variant="hero"
        selected={toId(partner.id) === toId(selectedPersonId)}
        onSelect={onSelect}
        sx={{ maxWidth: "100%" }}
      />
    </Stack>
  );
}

function ConnectorLine() {
  return (
    <Box
      aria-hidden
      sx={{
        flex: 1,
        height: "1px",
        backgroundColor: "divider",
        minWidth: 8,
      }}
    />
  );
}

function UnionCapsule({ family }) {
  const theme = useTheme();
  const meta = unionStatusMeta(family.status);
  const color = meta ? toneColor(theme, meta.tone) : theme.palette.text.disabled;
  const date = family.startDate;
  const Icon = date || meta ? FavoriteRoundedIcon : FavoriteBorderRoundedIcon;

  return (
    <Box
      sx={{
        flexShrink: 0,
        minWidth: 96,
        maxWidth: 150,
        px: 1.25,
        py: 0.75,
        borderRadius: `${RADII.card}px`,
        backgroundColor: theme.palette.glass.strong,
        border: `1px solid ${theme.palette.glass.border}`,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 6px 18px rgba(0,0,0,0.45)"
            : "0 6px 18px rgba(0,0,0,0.07)",
        textAlign: "center",
      }}
    >
      <Stack
        direction="row"
        spacing={0.6}
        alignItems="center"
        justifyContent="center"
      >
        <Icon sx={{ fontSize: 13, color }} />
        <Typography
          noWrap
          sx={{
            fontSize: 12,
            fontWeight: 650,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          {date || "союз"}
        </Typography>
      </Stack>

      {family.startPlace && (
        <Typography
          noWrap
          sx={{ fontSize: 10.5, color: "text.secondary", lineHeight: 1.35 }}
        >
          {family.startPlace}
        </Typography>
      )}

      {meta && family.status !== "married" && (
        <Typography
          noWrap
          sx={{ fontSize: 10.5, color, fontWeight: 600, lineHeight: 1.35 }}
        >
          {meta.label}
        </Typography>
      )}
    </Box>
  );
}

export default function UnionCore({
  family,
  byId,
  selectedPersonId,
  onSelect,
}) {
  const [first, second] = family.partners;

  if (!first) return null;

  if (!second) {
    return (
      <Box sx={rowSx}>
        <Stack alignItems="center" sx={{ width: PARTNER_WIDTH }}>
          <AncestorRow
            person={first}
            byId={byId}
            selectedPersonId={selectedPersonId}
            onSelect={onSelect}
          />
          <PersonNode
            person={first}
            variant="hero"
            selected={toId(first.id) === toId(selectedPersonId)}
            onSelect={onSelect}
          />
        </Stack>

        <Box aria-hidden sx={stemSx} />
      </Box>
    );
  }

  return (
    <Box sx={rowSx}>
      <PartnerColumn
        partner={first}
        byId={byId}
        selectedPersonId={selectedPersonId}
        onSelect={onSelect}
      />

      <Box
        sx={{
          flex: 1,
          minWidth: CAPSULE_COLUMN_MIN,
          maxWidth: CAPSULE_COLUMN_MAX,
          height: HERO_HEIGHT,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
          <ConnectorLine />
          <UnionCapsule family={family} />
          <ConnectorLine />
        </Box>

        {/* Одна линия от низа капсулы до блока детей — без стыков и наложений. */}
        <Box sx={{ flex: 1, position: "relative" }}>
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "1px",
              height: `calc(100% + ${CHILD_STEM_HEIGHT}px)`,
              backgroundColor: "divider",
            }}
          />
        </Box>
      </Box>

      <PartnerColumn
        partner={second}
        byId={byId}
        selectedPersonId={selectedPersonId}
        onSelect={onSelect}
      />
    </Box>
  );
}
