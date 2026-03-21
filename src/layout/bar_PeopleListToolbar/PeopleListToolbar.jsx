import React from "react";
import { Stack, Typography, useTheme, Box, Divider } from "@mui/material";

import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingTimeSelect from "./ExpandingTimeSelect";
import ExpandingGenSelect from "./ExpandingGenSelect";
import ExpandingRelationCheck from "./ExpandingRelationCheck";
import ExpandingSortButton from "./ExpandingSortButton";

export default function PeopleListToolbar({
  people = [],
  search,
  setSearch,
  isFilterActive,
  onOpenFilter,
  sortOrder,
  onToggleSort,
  onOpenStats,
  filters,
  updateFilter,
  allGenerations,
}) {
  const theme = useTheme();

  // РАСЧЕТ СТАТИСТИКИ
  const stats = React.useMemo(() => {
    const active = people.filter((p) => !p.archived);
    const archived = people.filter((p) => p.archived);
    return {
      total: active.length,
      males: active.filter((p) => p.gender === "male").length,
      females: active.filter((p) => p.gender === "female").length,
      trash: archived.length,
    };
  }, [people]);

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" ml="auto">
      {/* 1. СТАТИСТИКА (Компактно) */}
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 7,
          height: 40,
          color: "text.secondary",
        }}
      >
        <Stack
          direction="row"
          spacing={0.7}
          sx={{ color: "white", py: "10px", pr: "5px", pl: "10px" }}
        >
          <PeopleIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight="600">
            {stats.total}
          </Typography>
        </Stack>
        <Divider orientation="vertical" variant="middle" flexItem />
        <Stack
          direction="row"
          spacing={0.7}
          sx={{ color: "white", py: "10px", pr: "5px", pl: "2px" }}
        >
          <MaleIcon fontSize="small" color="info" />
          <Typography variant="body2" fontWeight="600">
            {stats.males}
          </Typography>
        </Stack>
        <Divider orientation="vertical" variant="middle" flexItem />
        <Stack
          direction="row"
          spacing={0.7}
          sx={{ color: "white", py: "10px", pr: "5px", pl: "2px" }}
        >
          <FemaleIcon fontSize="small" color="secondary" />
          <Typography variant="body2" fontWeight="600">
            {stats.females}
          </Typography>
        </Stack>
        <Divider orientation="vertical" variant="middle" flexItem />
        <Stack
          direction="row"
          spacing={0.7}
          sx={{ color: "white", py: "10px", pr: "10px", pl: "2px" }}
        >
          <RestoreFromTrashIcon fontSize="small" color="warning" />
          <Typography variant="body2" fontWeight="600">
            {stats.trash}
          </Typography>
        </Stack>
      </Box>

      {/* Фильтр по дате создания */}
      <ExpandingTimeSelect
        type="created"
        value={filters.created}
        onChange={(val) => updateFilter("created", val)}
      />

      {/* Фильтр по дате изменения */}
      <ExpandingTimeSelect
        type="edited"
        value={filters.edited}
        onChange={(val) => updateFilter("edited", val)}
      />

      {/* Выбор поколения */}
      <ExpandingGenSelect
        options={allGenerations}
        value={filters.gens}
        onChange={(_, newValue) => updateFilter("gens", newValue)}
      />

      {/* Чекбокс связей */}
      <ExpandingRelationCheck
        checked={filters.showRelations}
        onChange={(val) => updateFilter("showRelations", val)}
      />

      {/* ФИЛЬТРЫ */}

      {/* СОРТИРОВКА ПОКОЛЕНИЙ */}
      <ExpandingSortButton sortOrder={sortOrder} onToggle={onToggleSort} />

      {/* ПОИСК */}
      <ExpandingSearch
        value={search}
        onChange={setSearch}
        placeholder="Поиск по имени или ID..."
      />
    </Stack>
  );
}
