import React from "react";
import { Stack, IconButton, Box, Tooltip } from "@mui/material";

import SortIcon from "@mui/icons-material/Sort";

import { useTheme, alpha } from "@mui/material/styles";

import ExpandingSearch from "../../../components/ExpandingSearch";
import ExpandingAddPhotoButton from "./ExpandingAddPhotoButton";
import ExpandingGroupSelect from "./ExpandingGroupSelect";

export default function PhotoToolbar({
  search,
  setSearch,
  groupBy,
  setGroupBy,
  sortDir,
  setSortDir,
  onAddPhoto,
}) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flexGrow: 1 }}
    >
      <ExpandingAddPhotoButton onToggle={onAddPhoto} />
      <Box sx={{ flexGrow: 1 }} />
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 7,
          height: 34,
          color: "text.secondary",
          fontSize: 20,
        }}
      >
        <ExpandingGroupSelect value={groupBy} onChange={setGroupBy} />
        <Tooltip title="Сортировка">
          <IconButton
            onClick={() => setSortDir((p) => (p === "asc" ? "desc" : "asc"))}
            sx={{ color: "white", p: 1, WebkitAppRegion: "no-drag" }}
          >
            <SortIcon
              sx={{
                transform: sortDir === "desc" ? "none" : "scaleY(-1)",
                fontSize: "20px",
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      <ExpandingSearch
        scope={"personal_gallery"}
        value={search}
        onChange={setSearch}
        placeholder="Поиск по описанию и тегам..."
        enableHashtags={true}
      />
    </Stack>
  );
}
