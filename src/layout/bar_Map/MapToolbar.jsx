import React, { useMemo } from "react";
import { Box, Stack, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ButtonConteiner from "../../components/ButtonConteiner";
import ExpandingPeopleSelect from "../bar_GlobalPhotoGallery/ExpandingPeopleSelect";
import MapLayerFilterCluster from "./MapLayerFilterCluster";
import { TOOLBAR_HIT } from "../toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

export default function MapToolbar({
  allPeople = [],
  mapPeopleOptions = [],
  selectedPeople = [],
  onPeopleChange,
  showPhotos,
  showEvents,
  showExternal,
  onTogglePhotos,
  onToggleEvents,
  onToggleExternal,
  onRefresh,
  loading,
}) {
  const peopleOptions = useMemo(() => {
    if (mapPeopleOptions.length > 0) return mapPeopleOptions;
    return allPeople;
  }, [allPeople, mapPeopleOptions]);

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarDragSpacerSx} />

      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
        <ExpandingPeopleSelect
          allPeople={allPeople}
          selectedPeople={selectedPeople}
          onChange={onPeopleChange}
          options={peopleOptions}
          placeholder="Кто на карте?"
        />

        <MapLayerFilterCluster
          showPhotos={showPhotos}
          showEvents={showEvents}
          showExternal={showExternal}
          onTogglePhotos={onTogglePhotos}
          onToggleEvents={onToggleEvents}
          onToggleExternal={onToggleExternal}
        />

        <ButtonConteiner>
          <IconButton
            size="small"
            title="Обновить (Shift — перегеокодировать)"
            onClick={(e) => onRefresh?.(e)}
            disabled={loading}
            sx={{ color: "inherit", p: 0 }}
          >
            <RefreshIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
          </IconButton>
        </ButtonConteiner>
      </Box>
    </Stack>
  );
}
