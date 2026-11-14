import React from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import { useToolbarButtonGroupHitSx } from "./ToolbarCapsuleContext";
import { TOOLBAR_HIT } from "../layout/toolbarTokens";
import ButtonConteiner from "./ButtonConteiner";

function NestedSortHit({ title, isDesc, onChange }) {
  const hitSx = useToolbarButtonGroupHitSx(false);

  return (
    <Tooltip title={title}>
      <Box
        component="button"
        type="button"
        onClick={() => onChange(isDesc ? "asc" : "desc")}
        sx={hitSx}
      >
        <SortIcon
          sx={{
            transform: isDesc ? "none" : "scaleY(-1)",
            fontSize: TOOLBAR_HIT.iconSize,
            color: "inherit",
          }}
        />
      </Box>
    </Tooltip>
  );
}

/**
 * Переключатель направления сортировки: вложенный — сегмент в капсуле; иначе одиночная кнопка.
 */
export default function SortDirToggle({ sortDir, onChange, nested = false }) {
  const isDesc = sortDir !== "asc";
  const title = isDesc
    ? "Сортировка: сначала новые"
    : "Сортировка: сначала старые";

  if (nested) {
    return (
      <NestedSortHit title={title} isDesc={isDesc} onChange={onChange} />
    );
  }

  return (
    <ButtonConteiner>
      <Tooltip title={title}>
        <IconButton
          onClick={() => onChange(isDesc ? "asc" : "desc")}
          sx={{ color: "inherit", p: 0 }}
        >
          <SortIcon
            sx={{
              transform: isDesc ? "none" : "scaleY(-1)",
              fontSize: TOOLBAR_HIT.iconSize,
            }}
          />
        </IconButton>
      </Tooltip>
    </ButtonConteiner>
  );
}
