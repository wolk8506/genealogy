import React from "react";
import {
  Stack,
  Box,
  Tooltip,
  IconButton,
  Typography,
  Badge,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingTimeSelect from "./ExpandingTimeSelect";
import ExpandingGenSelect from "./ExpandingGenSelect";
import ExpandingRelationCheck from "./ExpandingRelationCheck";
import ExpandingSortButton from "./ExpandingSortButton";
import { StatisticPopover } from "./StatisticPopover";
import DeleteIcon from "@mui/icons-material/Delete";
import { usePeopleListStore } from "../../store/usePeopleListStore";

import ExpandingTagsFilter from "./ExpandingTegsFilter";
import ButtonConteiner from "../../components/ButtonConteiner";

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
  const navigate = useNavigate();

  const handleOpenAddModal = () => {
    // Переходим на корень и добавляем параметр
    navigate("/?action=add");
  };

  const hasArchived = usePeopleListStore((state) => state.hasArchived);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      ml="auto"
      sx={{ WebkitAppRegion: "no-drag" }}
    >
      <ButtonConteiner>
        <Tooltip title="Корзина">
          <IconButton
            onClick={() => navigate("/trash")}
            size="small"
            sx={{ color: "white", p: 1 }}
          >
            <Badge
              badgeContent={4}
              invisible={!hasArchived}
              variant="dot"
              color="warning"
            >
              <DeleteIcon color={"inherit"} fontSize="inherit" />
            </Badge>
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
      {/* 1. СТАТИСТИКА (Компактно) */}
      <StatisticPopover people={people} />

      <ExpandingTagsFilter
        selectedTags={filters.tags}
        onChange={(val) => updateFilter("tags", val)}
      />

      {/* Открытие модалки добавления человека */}
      <ButtonConteiner>
        <Tooltip title="Добавить человека">
          <IconButton
            onClick={handleOpenAddModal}
            size="small"
            sx={{ color: "white", p: 1 }}
          >
            <PersonAddAlt1Icon color={"inherit"} fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>

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
