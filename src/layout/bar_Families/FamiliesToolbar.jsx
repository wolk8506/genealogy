// layout/bar_Families/FamiliesToolbar.jsx
// Тулбар страницы «Семьи» в хедере приложения:
// каталог — поиск и сортировка, детальный вид — переключатель союзов.

import React from "react";
import { Stack } from "@mui/material";
import ExpandingSearch from "../../components/ExpandingSearch";
import FamilySortPill from "./FamilySortPill";
import FamilyUnionPill from "./FamilyUnionPill";

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
      <Stack direction="row" spacing={2} ml="auto">
        <FamilyUnionPill
          options={unionOptions}
          activeKey={activeUnionKey}
          onSelect={onOpenUnion}
        />
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={2} ml="auto">
      <ExpandingSearch
        scope="families"
        value={search}
        onChange={setSearch}
        placeholder="Имена, место, год"
        tooltip="Поиск по семьям"
      />

      <FamilySortPill value={sort} onChange={setSort} />
    </Stack>
  );
}
