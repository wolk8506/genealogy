import React from "react";
import { Stack, Box } from "@mui/material";

import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import LayersClearIcon from "@mui/icons-material/LayersClear";

import ExpandingPeopleSelect from "./ExpandingPeopleSelect";
import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingAddPhotoButton from "./ExpandingAddPhotoButton";
import GalleryGroupSortCluster from "./GalleryGroupSortCluster";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

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
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarClusterSx}>
        <ExpandingAddPhotoButton />
      </Box>

      <Box sx={toolbarDragSpacerSx} />

      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
        <ExpandingPeopleSelect
          allPeople={allPeople}
          selectedPeople={selectedPeople}
          onChange={(_, v) => setSelectedPeople(v)}
          photos={photos}
        />

        <GalleryGroupSortCluster
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          groupOptions={groupOptions}
          sortDir={sortDir}
          setSortDir={setSortDir}
        />

        <ExpandingSearch
          scope="gallery"
          value={search}
          onChange={setSearch}
          placeholder="Поиск по описанию и тегам..."
          enableHashtags
        />
      </Box>
    </Stack>
  );
}
