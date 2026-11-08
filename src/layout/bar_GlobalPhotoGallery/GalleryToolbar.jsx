import React from "react";
import { Stack, Box } from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import LayersClearIcon from "@mui/icons-material/LayersClear";

import ExpandingPeopleSelect from "./ExpandingPeopleSelect";
import ExpandingGroupSelect from "../../components/ExpandingGroupSelect";
import SortDirToggle from "../../components/SortDirToggle";
import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingAddPhotoButton from "./ExpandingAddPhotoButton";
import { toolbarPillSx } from "../toolbarStyles";

const groupOptions = [
  {
    value: "none",
    label: "Без групп",
    icon: <LayersClearIcon fontSize="small" />,
    category: "Сброс",
  },
  {
    value: "owner",
    label: "По людям",
    icon: <PersonIcon fontSize="small" />,
    category: "Личности",
  },
  {
    value: "date",
    label: "Дата загрузки",
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

export default function GalleryToolbar({
  allPeople,
  selectedPeople,
  setSelectedPeople,
  photos,
  groupBy,
  setGroupBy,
  sortDir,
  setSortDir,
  search,
  setSearch,
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      width="100%"
      sx={{ alignItems: "center" }}
    >
      {/* КНОПКА ДОБАВЛЕНИЯ ФОТО — слева, как в личном альбоме */}
      <ExpandingAddPhotoButton />

      <Box sx={{ flexGrow: 1 }} />

      {/* КТО НА ФОТО */}
      <ExpandingPeopleSelect
        allPeople={allPeople}
        selectedPeople={selectedPeople}
        onChange={(_, v) => setSelectedPeople(v)}
        photos={photos}
      />

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
        {/* ГРУППИРОВКА */}
        <ExpandingGroupSelect
          value={groupBy}
          onChange={setGroupBy}
          options={groupOptions}
        />

        {/* СОРТИРОВКА: направление текущей группировки */}
        <SortDirToggle sortDir={sortDir} onChange={setSortDir} />
      </Box>

      {/* ПОИСК */}
      <ExpandingSearch
        scope={"gallery"}
        value={search}
        onChange={setSearch}
        placeholder="Поиск по описанию и тегам..."
        enableHashtags={true}
      />
    </Stack>
  );
}
