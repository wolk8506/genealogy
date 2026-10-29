// pages/Page_Families/detail/ChildrenTray.jsx
// Общий блок детей союза. Внуки здесь не разворачиваются — для этого есть древо.

import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import PersonNode, { ChildOwnFamilyBadge } from "../nodes/PersonNode";
import {
  CHILD_STEM_HEIGHT,
  familyGlassSx,
  RADII,
  SCHEMA_MAX_WIDTH,
} from "../familyTheme";
import {
  pluralChildren,
  toId,
} from "../../../utils/families/familyLabels";

export default function ChildrenTray({
  family,
  byPerson,
  selectedPersonId,
  onSelect,
}) {
  const children = family.children || [];
  const count = children.length;
  const title = count === 1 ? "Ребёнок" : "Дети";

  return (
    <Box sx={{ width: "100%", maxWidth: SCHEMA_MAX_WIDTH, mx: "auto" }}>
      {/* Вертикальную связь рисует схема союза — здесь только отступ. */}
      <Box aria-hidden sx={{ height: CHILD_STEM_HEIGHT }} />

      <Box
        sx={[
          familyGlassSx,
          {
            borderRadius: `${RADII.section}px`,
            p: 1.75,
            width: "100%",
            maxWidth: 900,
            mx: "auto",
          },
        ]}
      >
        <Stack
          direction="row"
          alignItems="baseline"
          spacing={0.75}
          sx={{ mb: 1.25, px: 0.5 }}
        >
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
            {count ? `${count} ${pluralChildren(count)}` : ""}
          </Typography>
        </Stack>

        {count > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(283px, 1fr))",
              gap: 1.25,
            }}
          >
            {children.map((child) => {
              const childId = toId(child.id);
              const ownUnions = byPerson?.get(childId) || [];
              return (
                <PersonNode
                  key={child.id}
                  person={child}
                  variant="child"
                  selected={childId === toId(selectedPersonId)}
                  onSelect={onSelect}
                  badge={
                    ownUnions.length ? <ChildOwnFamilyBadge /> : null
                  }
                  title={
                    ownUnions.length
                      ? `${child.firstName || "Ребёнок"} — есть своя семья`
                      : undefined
                  }
                />
              );
            })}
          </Box>
        ) : (
          <Typography
            sx={{ fontSize: 12, color: "text.disabled", px: 0.5, py: 0.5 }}
          >
            У этого союза дети не указаны.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
