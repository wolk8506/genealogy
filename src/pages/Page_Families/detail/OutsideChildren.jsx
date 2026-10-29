// pages/Page_Families/detail/OutsideChildren.jsx
// Дети, у которых известен только один родитель из этой пары.
// Показываем тихой строкой — без отдельных карточек, чтобы не выдумывать связь.

import React from "react";
import { Box, Typography } from "@mui/material";
import { shortName, toId, yearOf } from "../../../utils/families/familyLabels";
import { SCHEMA_MAX_WIDTH } from "../familyTheme";

export default function OutsideChildren({
  items = [],
  byId,
  selectedPersonId,
  onSelect,
}) {
  if (!items.length) return null;

  return (
    <Box
      sx={{
        mt: 1.5,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        maxWidth: SCHEMA_MAX_WIDTH,
        mx: "auto",
      }}
    >
      <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>
        Вне союза:
      </Typography>

      {items.map(({ person, knownParentId }) => {
        const id = toId(person.id);
        const year = yearOf(person.birthday);
        const parent = byId?.get(knownParentId);
        const hint = parent
          ? `Известен только один родитель: ${shortName(parent)}`
          : "Известен только один родитель";

        return (
          <Box
            key={id}
            component="button"
            type="button"
            title={hint}
            onClick={() => onSelect?.(id)}
            sx={{
              border: "none",
              background: "none",
              p: "2px 7px",
              borderRadius: "999px",
              cursor: "pointer",
              fontSize: 11.5,
              lineHeight: 1.5,
              color:
                id === toId(selectedPersonId) ? "primary.main" : "text.secondary",
              fontFamily: "inherit",
              transition: "background-color .16s ease, color .16s ease",
              "&:hover": {
                backgroundColor: "action.hover",
                color: "text.primary",
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
              },
            }}
          >
            {shortName(person)}
            {year ? ` (${year})` : ""}
          </Box>
        );
      })}
    </Box>
  );
}
