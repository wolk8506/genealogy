import React from "react";
import { Stack } from "@mui/material";
import ExpandingPeopleSelect from "./ExpandingPeopleSelect";
import ExpandingGroupSelect from "./ExpandingGroupSelect";
import ExpandingSelect from "./ExpandingSelect";
import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingAddPhotoButton from "./ExpandingAddPhotoButton";

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
    <Stack direction="row" spacing={2} ml="auto">
      {/* КНОПКА ДОБАВЛЕНИЯ ФОТО */}
      <ExpandingAddPhotoButton />

      {/* КТО НА ФОТО */}
      <ExpandingPeopleSelect
        allPeople={allPeople}
        selectedPeople={selectedPeople}
        onChange={(_, v) => setSelectedPeople(v)}
        photos={photos}
      />

      {/* ГРУППИРОВКА */}
      <ExpandingGroupSelect value={groupBy} onChange={setGroupBy} />

      {/* СОРТИРОВКА: направление текущей группировки */}
      <ExpandingSelect
        label="Сортировка"
        groupBy={groupBy}
        sortDir={sortDir}
        onSortChange={setSortDir}
      />

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
