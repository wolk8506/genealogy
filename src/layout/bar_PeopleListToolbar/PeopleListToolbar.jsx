import React from "react";
import { Stack, Box, Tooltip, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";

import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ExpandingSearch from "../../components/ExpandingSearch";
import ExpandingTimeSelect from "./ExpandingTimeSelect";
import ExpandingGenSelect from "./ExpandingGenSelect";
import ExpandingRelationCheck from "./ExpandingRelationCheck";
import ExpandingSortButton from "./ExpandingSortButton";
import { StatisticPopover } from "./StatisticPopover";

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

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" ml="auto">
      {/* 1. СТАТИСТИКА (Компактно) */}
      <StatisticPopover people={people} />
      {/* Открытие модалки добавления человека */}
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
        <Tooltip title="Добавить человека">
          <IconButton
            onClick={handleOpenAddModal}
            size="small"
            sx={{ color: "white", p: "8px" }}
          >
            <PersonAddAlt1Icon color={"inherit"} />
          </IconButton>
        </Tooltip>
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
