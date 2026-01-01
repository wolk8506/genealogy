import React, { useEffect, useState, useMemo } from "react";
import {
  Avatar,
  ListItemAvatar,
  ListItemText,
  Typography,
  CircularProgress,
  TextField,
  Stack,
  Button,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  useTheme,
  Fab,
  Zoom,
  Paper,
  FormControlLabel,
  Checkbox,
  // MenuItem,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  // Select,
  // OutlinedInput,
  // Chip,
  // InputLabel,
  // Box,
  Autocomplete,
} from "@mui/material";

import ClearIcon from "@mui/icons-material/Clear";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import FilterListIcon from "@mui/icons-material/FilterList";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { Badge } from "@mui/material";

import appIcon from "../../img/app_icon.png";
import { Link } from "react-router-dom";

// вспомогательная функция для стилей
function getStyles(name, selected, theme) {
  return {
    fontWeight:
      selected.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

// настройки меню
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: 48 * 4.5 + 8,
      width: 250,
    },
  },
};

/* Аватар по ID фото */
function PersonAvatar({ foto, initials }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (foto) window.avatarAPI.getPath(foto).then(setSrc);
  }, [foto]);
  return (
    <Avatar src={src}>{!src && initials?.slice(0, 2).toUpperCase()}</Avatar>
  );
}

/* Проверка диапазонов дат */
function checkDateFilter(dateStr, filter) {
  if (!filter) return true;
  if (!dateStr) return false;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(startOfToday);
  startOfMonth.setDate(startOfMonth.getDate() - 30);
  const startOfYear = new Date(startOfToday);
  startOfYear.setDate(startOfYear.getDate() - 365);

  switch (filter) {
    case "today":
      return d >= startOfToday;
    case "week":
      return d >= startOfWeek;
    case "month":
      return d >= startOfMonth;
    case "year":
      return d >= startOfYear;
    default:
      return true;
  }
}

/* Модалка фильтров */
function PeopleFilterDialog({
  open,
  onClose,
  onApply,
  generations,
  initialFilters,
}) {
  const [createdFilter, setCreatedFilter] = useState("");
  const [editedFilter, setEditedFilter] = useState("");
  const [selectedGens, setSelectedGens] = useState([]);
  const [showRelations, setShowRelations] = useState(false);

  useEffect(() => {
    if (open && initialFilters) {
      setCreatedFilter(initialFilters.created || "");
      setEditedFilter(initialFilters.edited || "");
      setSelectedGens(initialFilters.gens || []);
      setShowRelations(!!initialFilters.showRelations);
    }
  }, [open, initialFilters]);

  const handleToggleGen = (g) => {
    setSelectedGens((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleReset = () => {
    const reset = { created: "", edited: "", gens: [], showRelations: false };
    setCreatedFilter("");
    setEditedFilter("");
    setSelectedGens([]);
    setShowRelations(false);
    onApply(reset);
  };

  const handleApply = () => {
    onApply({
      created: createdFilter,
      edited: editedFilter,
      gens: selectedGens,
      showRelations,
    });
    onClose();
  };

  useEffect(() => {
    // при монтировании страницы "Люди" сбрасываем счётчик
    localStorage.setItem("lastVisitPeoplePage", new Date().toISOString());
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <DialogTitle>Фильтры</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="subtitle2">Дата создания</Typography>

          <ToggleButtonGroup
            size="small"
            value={createdFilter}
            exclusive
            onChange={(e) => setCreatedFilter(e.target.value)}
            aria-label="Фильтр по дате создания"
          >
            <ToggleButton sx={{ width: "82px", borderRadius: "15px" }} value="">
              Все
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="today"
            >
              Сегодня
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="week"
            >
              Неделя
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="month"
            >
              Месяц
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="year"
            >
              Год
            </ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="subtitle2">Дата изменения</Typography>

          <ToggleButtonGroup
            size="small"
            value={editedFilter}
            exclusive
            onChange={(e) => {
              setEditedFilter(e.target.value);
            }}
            aria-label="Фильтр по дате изменения"
            sx={{ mt: "10px" }}
          >
            <ToggleButton sx={{ width: "82px", borderRadius: "15px" }} value="">
              Все
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="today"
            >
              Сегодня
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="week"
            >
              Неделя
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="month"
            >
              Месяц
            </ToggleButton>
            <ToggleButton
              sx={{ width: "82px", borderRadius: "15px" }}
              value="year"
            >
              Год
            </ToggleButton>
          </ToggleButtonGroup>

          {/* //--------------------------------------------- */}
          <Typography variant="subtitle2">Поколения</Typography>
          <Autocomplete
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "15px", // любой радиус
              },
              // "& .MuiChip-root": {
              //   borderRadius: "8px", // радиус для чипов
              // },
            }}
            size="small"
            slotProps={{
              popper: {
                placement: "top-start", // всегда вверх
              },
            }}
            multiple
            id="gens-autocomplete"
            options={generations} // список поколений
            value={selectedGens} // текущее состояние
            disableCloseOnSelect
            onChange={(event, newValue) => setSelectedGens(newValue)}
            getOptionLabel={(option) => `Поколение ${option}`}
            filterSelectedOptions
            renderInput={(params) => (
              <TextField
                {...params}
                label="Выберите поколения"
                placeholder="Поколения"
              />
            )}
          />
          {/* //--------------------------------------------- */}
          <Typography variant="subtitle2">Родственные связи</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={showRelations}
                onChange={(e) => setShowRelations(e.target.checked)}
              />
            }
            label="Показать родственные связи (при единственном результате поиска)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Отменить</Button>
        <Button onClick={handleReset}>Сбросить</Button>
        <Button onClick={handleApply} variant="contained">
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PeopleListPage() {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("asc");
  const [statsOpen, setStatsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    created: "",
    edited: "",
    gens: [],
    showRelations: false,
  });

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
      setLoading(false);
    });
  }, []);

  const active = useMemo(() => people.filter((p) => !p.archived), [people]);
  const archived = useMemo(() => people.filter((p) => p.archived), [people]);

  const filtered = useMemo(() => {
    let res = active.filter((p) => {
      const name = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      const matchSearch =
        name.includes(search.toLowerCase()) || String(p.id).includes(search);
      const matchGen =
        !filters.gens.length || filters.gens.includes(String(p.generation));
      const matchCreated = checkDateFilter(p.createdAt, filters.created);
      const matchEdited = checkDateFilter(p.editedAt, filters.edited);
      return matchSearch && matchGen && matchCreated && matchEdited;
    });

    res.sort((a, b) => {
      const ta = new Date(a.editedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.editedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    return res;
  }, [active, search, filters]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, p) => {
      const gen = p.generation ?? "Без поколения";
      acc[gen] = acc[gen] || [];
      acc[gen].push(p);
      return acc;
    }, {});
  }, [filtered]);

  const gens = useMemo(() => {
    const keys = Object.keys(grouped).sort((a, b) => {
      const na = isNaN(a) ? Infinity : +a;
      const nb = isNaN(b) ? Infinity : +b;
      return sortOrder === "asc" ? na - nb : nb - na;
    });
    return keys;
  }, [grouped, sortOrder]);

  const handleArchive = async (id) => {
    await window.peopleAPI.update(id, {
      archived: true,
      editedAt: new Date().toISOString(),
    });
    const data = await window.peopleAPI.getAll();
    setPeople(data);
  };

  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ height: "60vh" }}
      >
        <CircularProgress />
      </Stack>
    );
  }

  if (!people.length) {
    return (
      <Stack
        spacing={2}
        alignItems="center"
        justifyContent="center"
        sx={{ mt: 10 }}
      >
        <Avatar src={appIcon} sx={{ width: 80, height: 80 }} />
        <Typography variant="h5">Генеалогия</Typography>
        <Typography variant="h6" color="text.secondary">
          Пока нет записей
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Добавьте первого человека или восстановите из резервной копии.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" component={Link} to="/add">
            Добавить человека
          </Button>
          <Button variant="outlined" component={Link} to="/settings">
            Восстановить архив
          </Button>
        </Stack>
      </Stack>
    );
  }

  /* Родственные связи: включены и единственный результат */
  const singleMatch =
    filters.showRelations && filtered.length === 1 ? filtered[0] : null;
  const findById = (id) => active.find((p) => p.id === id);
  const father = singleMatch?.father ? findById(singleMatch.father) : null;
  const mother = singleMatch?.mother ? findById(singleMatch.mother) : null;
  const spouses = (singleMatch?.spouse || []).map(findById).filter(Boolean);
  const children = (singleMatch?.children || []).map(findById).filter(Boolean);
  const siblings = (singleMatch?.siblings || []).map(findById).filter(Boolean);

  // утилиту для проверки «сегодняшнего дня»
  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  const renderPersonItem = (p) => {
    const name =
      [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
      "Без имени";
    const initials =
      (p.firstName?.[0] || "") +
      (p.lastName?.[0] || (p.maidenName?.[0] ? p.maidenName?.[1] : ""));

    // определяем условия
    const createdToday = isToday(p.createdAt);
    const editedToday = isToday(p.editedAt);

    let badgeColor = "secondary";
    let invisible = true;
    if (createdToday) {
      badgeColor = "success"; // зелёный для новых
      invisible = false;
    } else if (editedToday) {
      badgeColor = "warning"; // жёлтый для обновлённых
      invisible = false;
    }

    return (
      <ListItemButton
        key={p.id}
        component={Link}
        to={`/person/${p.id}`}
        sx={{ p: 0, textDecoration: "none", width: "100%", borderRadius: 3 }}
      >
        <Paper
          elevation={1}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            p: 1,
            borderRadius: 2,
            backgroundColor: isDark ? "#2a2a2a" : "#fff",
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": { transform: "translateY(-4px)", boxShadow: 4 },
          }}
        >
          <ListItemAvatar>
            <Badge
              color={badgeColor}
              variant="dot"
              invisible={invisible}
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <PersonAvatar foto={p.id} initials={initials} />
            </Badge>
          </ListItemAvatar>
          <ListItemText
            primary={name}
            secondary={`ID: ${p.id}`}
            sx={{ ml: 1 }}
          />
          <Button
            size="small"
            color="warning"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleArchive(p.id);
            }}
            sx={{ ml: "auto" }}
          >
            В корзину
            <DeleteIcon fontSize="small" sx={{ ml: 0.5 }} />
          </Button>
        </Paper>
      </ListItemButton>
    );
  };

  const isFilterActive =
    filters.created ||
    filters.edited ||
    filters.gens.length > 0 ||
    filters.showRelations;

  return (
    <>
      <Stack spacing={2}>
        {/* Панель поиска и кнопок */}
        <Paper
          elevation={1}
          sx={{
            position: "sticky",
            top: { xs: 56, sm: 64 },
            zIndex: 10,
            backgroundColor: theme.palette.background.paper,
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Поиск по имени или ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              size="small"
              InputProps={{
                endAdornment: search && (
                  <Button
                    size="small"
                    onClick={() => setSearch("")}
                    sx={{ ml: 1 }}
                  >
                    <ClearIcon />
                  </Button>
                ),
              }}
            />

            {/* <Button
              startIcon={<FilterAltIcon />}
              variant="outlined"
              onClick={() => setFilterOpen(true)}
            >
              Фильтр
            </Button> */}
            <Button
              // startIcon={
              //   isFilterActive ? <FilterListIcon /> : <FilterAltIcon />
              // }
              variant="outlined"
              onClick={() => setFilterOpen(true)}
            >
              {isFilterActive ? <FilterAltOffIcon /> : <FilterAltIcon />}
            </Button>
            <Button
              startIcon={<SupervisorAccountIcon />}
              endIcon={
                <FilterListIcon
                  sx={{
                    transform: sortOrder === "asc" ? "rotate(180deg)" : "none",
                  }}
                />
              }
              variant="outlined"
              onClick={() =>
                setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
              }
            >
              Поколения
            </Button>
            <Button variant="outlined" onClick={() => setStatsOpen(true)}>
              <LeaderboardIcon />
            </Button>
          </Stack>
        </Paper>

        {/* Родственные связи вместо поколений, если единственный результат */}
        {singleMatch ? (
          <Paper elevation={2} sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Родственные связи
            </Typography>

            {/* Сам найденный человек */}
            <Typography variant="subtitle2">Найденный человек</Typography>
            <Stack spacing={1} sx={{ mt: 1, mb: 2 }}>
              {renderPersonItem(singleMatch)}
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2">Родители</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {father ? (
                    renderPersonItem(father)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Отец не указан
                    </Typography>
                  )}
                  {mother ? (
                    renderPersonItem(mother)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Мать не указана
                    </Typography>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2">Супруги</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {spouses.length ? (
                    spouses.map(renderPersonItem)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Нет данных
                    </Typography>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2">Дети</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {children.length ? (
                    children.map(renderPersonItem)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Нет данных
                    </Typography>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2">Братья/сёстры</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {siblings.length ? (
                    siblings.map(renderPersonItem)
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Нет данных
                    </Typography>
                  )}
                </Stack>
              </Grid>
            </Grid>
            <Divider sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Показаны связи для единственного результата поиска.
            </Typography>
          </Paper>
        ) : (
          /* Обычный рендер поколений */
          gens.map((g) => (
            <Paper
              key={g}
              elevation={2}
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
                borderRadius: 3,
              }}
            >
              <Typography variant="h6" sx={{ mb: 1, color: "primary.main" }}>
                Поколение {g}
              </Typography>
              <Grid container direction="column" spacing={2}>
                {grouped[g].map((person) => {
                  const name = [
                    person.firstName,
                    person.lastName || person.maidenName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const initials =
                    (person.firstName?.[0] || "") +
                    (person.lastName?.[0] || person.maidenName?.[1] || "");

                  // проверка дат
                  const createdToday = isToday(person.createdAt);
                  const editedToday = isToday(person.editedAt);

                  let badgeColor = "secondary";
                  let invisible = true;
                  if (createdToday) {
                    badgeColor = "success";
                    invisible = false;
                  } else if (editedToday) {
                    badgeColor = "warning";
                    invisible = false;
                  }

                  return (
                    <Grid item xs={12} key={person.id}>
                      <ListItemButton
                        component={Link}
                        to={`/person/${person.id}`}
                        sx={{
                          p: 0,
                          textDecoration: "none",
                          width: "100%",
                          borderRadius: 3,
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            p: 1,
                            borderRadius: 2,
                            backgroundColor: isDark ? "#2a2a2a" : "#fff",
                            transition: "transform 0.2s, box-shadow 0.2s",
                            "&:hover": {
                              transform: "translateY(-4px)",
                              boxShadow: 4,
                            },
                            overflow: "hidden",
                            backgroundClip: "padding-box",
                          }}
                        >
                          <ListItemAvatar>
                            <Badge
                              color={badgeColor}
                              variant="dot"
                              invisible={invisible}
                              overlap="circular"
                              anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                              }}
                            >
                              <PersonAvatar
                                foto={person.id}
                                initials={initials}
                              />
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={name || "Без имени"}
                            secondary={`ID: ${person.id}`}
                            sx={{ ml: 1 }}
                          />
                          <Button
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleArchive(person.id);
                            }}
                            sx={{ ml: "auto" }}
                          >
                            В корзину
                            <DeleteIcon fontSize="small" sx={{ ml: 0.5 }} />
                          </Button>
                        </Paper>
                      </ListItemButton>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          ))
        )}
      </Stack>

      {/* Статистика */}
      <Dialog
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        PaperProps={{ sx: { borderRadius: "15px" } }}
      >
        <DialogTitle>Статистика</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  bgcolor: isDark ? "#2a002a" : "#f9f9f9",
                  borderRadius: 3,
                }}
              >
                <PeopleIcon color="primary" />
                <div>
                  <Typography variant="caption">Всего людей</Typography>
                  <Typography variant="h6">{active.length}</Typography>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  borderRadius: 3,
                }}
              >
                <MaleIcon color="info" />
                <div>
                  <Typography variant="caption">Мужчин</Typography>
                  <Typography variant="h6">
                    {active.filter((p) => p.gender === "male").length}
                  </Typography>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  borderRadius: 3,
                }}
              >
                <FemaleIcon color="secondary" />
                <div>
                  <Typography variant="caption">Женщин</Typography>
                  <Typography variant="h6">
                    {active.filter((p) => p.gender === "female").length}
                  </Typography>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  borderRadius: 3,
                }}
              >
                <HelpOutlineIcon color="disabled" />
                <div>
                  <Typography variant="caption">Неизвестно</Typography>
                  <Typography variant="h6">
                    {active.filter((p) => !p.gender).length}
                  </Typography>
                </div>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  borderRadius: 3,
                }}
              >
                <RestoreFromTrashIcon color="warning" />
                <div>
                  <Typography variant="caption">В корзине</Typography>
                  <Typography variant="h6">{archived.length}</Typography>
                </div>
              </Paper>
            </Grid>

            {Object.entries(
              filtered.reduce((acc, p) => {
                const g = p.generation ?? "Без поколения";
                acc[g] = (acc[g] || 0) + 1;
                return acc;
              }, {})
            ).map(([g, cnt]) => (
              <Grid item xs={12} sm={6} md={4} key={g}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    borderRadius: 3,
                  }}
                >
                  <Typography variant="caption" sx={{ minWidth: 96 }}>
                    Поколение {g}
                  </Typography>
                  <Typography variant="h6">{cnt}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Модалка фильтров */}
      <PeopleFilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        generations={gens}
        initialFilters={filters}
      />

      {/* Кнопка вверх */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </>
  );
}
