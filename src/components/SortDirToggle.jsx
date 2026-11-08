import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";

/**
 * Переключатель направления сортировки: та же иконка в той же пилюле,
 * что в персональной галерее.
 */
export default function SortDirToggle({ sortDir, onChange }) {
  const isDesc = sortDir !== "asc";
  return (
    <Tooltip title={isDesc ? "Сортировка: сначала новые" : "Сортировка: сначала старые"}>
      <IconButton
        onClick={() => onChange(isDesc ? "asc" : "desc")}
        sx={{ color: "text.primary", p: 1, WebkitAppRegion: "no-drag" }}
      >
        <SortIcon
          sx={{ transform: isDesc ? "none" : "scaleY(-1)", fontSize: "20px" }}
        />
      </IconButton>
    </Tooltip>
  );
}
