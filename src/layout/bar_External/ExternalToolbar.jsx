import React from "react";
import { Stack, Box, IconButton, Tooltip, Badge } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ExpandingSearch from "../../components/ExpandingSearch";
import ButtonConteiner from "../../components/ButtonConteiner";
import PersonFillBadgePlusIcon from "../../components/svg/PersonFillBadgePlusIcon";
import TrashFillIcon from "../../components/svg/TrashFillIcon";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import ExternalTypeFilter from "./ExternalTypeFilter";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

export default function ExternalToolbar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  const navigate = useNavigate();
  const hasArchived = usePeopleListStore((state) => state.hasArchived);
  const hasArchivedExternal = usePeopleListStore(
    (state) => state.hasArchivedExternal,
  );
  const trashHasItems = hasArchived || hasArchivedExternal;

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarClusterSx}>
        <ButtonConteiner>
          <Tooltip title="Добавить человека/питомца">
            <IconButton
              onClick={() => navigate("/external?action=add")}
              size="small"
              sx={{ color: "inherit", p: 0 }}
              aria-label="Добавить человека или питомца"
            >
              <PersonFillBadgePlusIcon
                sx={{ fontSize: 16, color: "inherit" }}
              />
            </IconButton>
          </Tooltip>
        </ButtonConteiner>

        <ButtonConteiner>
          <Tooltip title="Корзина">
            <IconButton
              onClick={() => navigate("/trash?tab=external")}
              size="small"
              sx={{ color: "inherit", p: 0 }}
              aria-label="Корзина"
            >
              <Badge variant="dot" color="warning" invisible={!trashHasItems}>
                <TrashFillIcon color="inherit" fontSize="inherit" />
              </Badge>
            </IconButton>
          </Tooltip>
        </ButtonConteiner>
      </Box>

      <Box sx={toolbarDragSpacerSx} />

      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
        <ExternalTypeFilter value={typeFilter} onChange={setTypeFilter} />

        <ExpandingSearch
          value={search}
          onChange={setSearch}
          placeholder="Поиск по имени, ID, описанию…"
        />
      </Box>
    </Stack>
  );
}
