import React from "react";
import { Stack, Tooltip, IconButton, Badge, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingTimeSelect from "./ExpandingTimeSelect";
import ExpandingGenSelect from "./ExpandingGenSelect";
import ExpandingSortButton from "./ExpandingSortButton";
import { usePeopleListStore } from "../../store/usePeopleListStore";

import ExpandingTagsFilter from "./ExpandingTegsFilter";
import ButtonConteiner from "../../components/ButtonConteiner";
import TrashFillIcon from "../../components/svg/TrashFillIcon";
import PersonFillBadgePlusIcon from "../../components/svg/PersonFillBadgePlusIcon";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { TOOLBAR_CAPSULE } from "../../layout/toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../../layout/appBarToolbarLayout";

export default function PeopleListToolbar({
  people = [],
  search,
  setSearch,
  isFilterActive,
  onOpenFilter,
  sortOrder,
  onToggleSort,
  filters,
  updateFilter,
  allGenerations,
}) {
  const navigate = useNavigate();

  const handleOpenAddModal = () => {
    // Переходим на корень и добавляем параметр
    navigate("/?action=add");
  };

  const hasArchived = usePeopleListStore((state) => state.hasArchived);
  const hasArchivedExternal = usePeopleListStore(
    (state) => state.hasArchivedExternal,
  );
  const trashHasItems = hasArchived || hasArchivedExternal;

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarClusterSx}>
        <ButtonConteiner>
          <Tooltip title="Добавить человека">
            <IconButton
              onClick={handleOpenAddModal}
              aria-label="Добавить человека"
              size="small"
              sx={{ color: "inherit", p: 0 }}
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
              onClick={() => navigate("/trash")}
              aria-label="Корзина"
              size="small"
              sx={{ color: "inherit", p: 0 }}
            >
              <Badge
                badgeContent={4}
                invisible={!trashHasItems}
                variant="dot"
                color="warning"
              >
                <TrashFillIcon color={"inherit"} sx={{ fontSize: 16 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </ButtonConteiner>
      </Box>

      <Box sx={toolbarDragSpacerSx} />

      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
        <ExpandingTagsFilter
          selectedTags={filters.tags}
          onChange={(val) => updateFilter("tags", val)}
        />

        <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
          <ExpandingTimeSelect
            type="created"
            value={filters.created}
            onChange={(val) => updateFilter("created", val)}
          />
          <ExpandingTimeSelect
            type="edited"
            value={filters.edited}
            onChange={(val) => updateFilter("edited", val)}
          />
          <ExpandingGenSelect
            options={allGenerations}
            value={filters.gens}
            onChange={(_, newValue) => updateFilter("gens", newValue)}
          />
        </ToolbarButtonGroup>

        <ExpandingSortButton sortOrder={sortOrder} onToggle={onToggleSort} />

        <ExpandingSearch
          value={search}
          onChange={setSearch}
          placeholder="Поиск по имени или ID..."
        />
      </Box>
    </Stack>
  );
}
