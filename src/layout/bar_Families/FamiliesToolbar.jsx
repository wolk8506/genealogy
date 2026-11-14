// layout/bar_Families/FamiliesToolbar.jsx
// Тулбар страницы «Семьи» в хедере: сортировка, затем поиск (как в галерее).

import React from "react";
import { Stack, Box } from "@mui/material";
import ExpandingSearch from "../../components/ExpandingSearch";
import FamilySortPill from "./FamilySortPill";
import FamilyUnionPill from "./FamilyUnionPill";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

export default function FamiliesToolbar({
  detail = false,
  search,
  setSearch,
  sort,
  setSort,
  unionOptions = [],
  activeUnionKey,
  onOpenUnion,
}) {
  if (detail) {
    return (
      <Stack direction="row" sx={toolbarRowSx}>
        <Box sx={toolbarDragSpacerSx} />
        <Box sx={toolbarClusterSx}>
          <FamilyUnionPill
            options={unionOptions}
            activeKey={activeUnionKey}
            onSelect={onOpenUnion}
          />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarDragSpacerSx} />

      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
        <ToolbarButtonGroup>
          <FamilySortPill nested value={sort} onChange={setSort} />
        </ToolbarButtonGroup>

        <ExpandingSearch
          scope="families"
          value={search}
          onChange={setSearch}
          placeholder="Имена, место, год"
          tooltip="Поиск по семьям"
        />
      </Box>
    </Stack>
  );
}
