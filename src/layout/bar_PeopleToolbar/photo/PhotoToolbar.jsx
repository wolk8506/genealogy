import React from "react";
import { Stack, Box } from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import LayersClearIcon from "@mui/icons-material/LayersClear";

import ExpandingSearch from "../../../components/ExpandingSearch";
import ExpandingAddPhotoButton from "./ExpandingAddPhotoButton";
import ExpandingGroupSelect from "../../../components/ExpandingGroupSelect";
import SortDirToggle from "../../../components/SortDirToggle";
import { toolbarPillSx } from "../../toolbarStyles";

const groupOptions = [
  {
    value: "none",
    label: "Без группировки",
    icon: <LayersClearIcon fontSize="small" />,
    category: "Сброс",
  },
  {
    value: "byType",
    label: "Типу участия",
    icon: <PersonIcon fontSize="small" />,
    category: "Личности",
  },
  {
    value: "date",
    label: "Дата добавления",
    icon: <HistoryIcon fontSize="small" />,
    category: "Время",
  },
  {
    value: "datePhoto",
    label: "Дата снимка",
    icon: <EventIcon fontSize="small" />,
    category: "Время",
  },
];

export default function PhotoToolbar({
  search,
  setSearch,
  groupBy,
  setGroupBy,
  sortDir,
  setSortDir,
  onAddPhoto,
}) {
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
          ...toolbarPillSx,
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          color: "text.primary",
          fontSize: 20,
        }}
      >
        <ExpandingGroupSelect
          value={groupBy}
          onChange={setGroupBy}
          options={groupOptions}
        />
        <SortDirToggle sortDir={sortDir} onChange={setSortDir} />
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
