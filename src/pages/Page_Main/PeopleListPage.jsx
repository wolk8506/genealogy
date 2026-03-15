import React, { useEffect, useState, useMemo } from "react";
import {
  Avatar,
  ListItemAvatar,
  ListItemText,
  Typography,
  CircularProgress,
  Stack,
  Button,
  ListItemButton,
  Grid,
  useTheme,
  Fab,
  Zoom,
  Paper,
  Divider,
  Tooltip,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import { Badge } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description"; // Для биографии
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary"; // Для фото

import appIcon from "../../img/app_icon.png";
import { Link } from "react-router-dom";

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
    now.getDate(),
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

export default function PeopleListPage({
  search,
  filters,
  sortOrder,
  statsOpen,
  setStatsOpen,
  filterOpen,
  setFilterOpen,
  setFilters,
}) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [personStats, setPersonStats] = useState({}); // Храним данные по ID

  const loadAllStats = async (list) => {
    const statsMap = {};
    // Загружаем данные параллельно для скорости
    await Promise.all(
      list.map(async (p) => {
        const data = await window.appAPI.getPersonFolderSize(p.id);
        statsMap[p.id] = data;
      }),
    );
    setPersonStats(statsMap);
  };

  // Вызываем при загрузке списка
  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
      setLoading(false);
      if (data) loadAllStats(data);
    });
  }, []);

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
  // const archived = useMemo(() => people.filter((p) => p.archived), [people]);

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

    const stats = personStats[p.id] || { count: 0, hasBio: false };

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
            secondary={
              <Stack
                component="span"
                direction="row"
                alignItems="center"
                mt={1}
                spacing={2}
              >
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                    px: 1,
                    py: 0.2,
                    borderRadius: "6px",
                    fontFamily: "monospace",
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  ID: {p.id}
                </Typography>
                {/* Индикатор Биографии */}
                {stats.hasBio && (
                  <Tooltip title="Биография заполнена">
                    <DescriptionIcon
                      sx={{
                        fontSize: 16,
                        color: "primary.main",
                        opacity: 0.8,
                      }}
                    />
                  </Tooltip>
                )}
                {/* Индикатор Фото */}
                {stats.count > 0 && (
                  <Tooltip title={`Фотографий: ${stats.count}`}>
                    <Stack
                      component="span"
                      direction="row"
                      alignItems="center"
                      spacing={0.7}
                      sx={{
                        opacity: 0.7,
                        color: "primary.main",
                      }}
                    >
                      <PhotoLibraryIcon sx={{ fontSize: 14 }} />
                      <Typography
                        component="span"
                        variant="caption"
                        fontWeight="700"
                      >
                        {/* {stats.count} */}
                      </Typography>
                    </Stack>
                  </Tooltip>
                )}
              </Stack>
            }
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
            {p.id === Number(search) && "В корзину"}

            <DeleteIcon
              fontSize="small"
              sx={{ ml: p.id === Number(search) ? 0.5 : 6 }}
            />
          </Button>
        </Paper>
      </ListItemButton>
    );
  };

  return (
    <>
      <Stack spacing={2}>
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
                Поколение - {g} :: ({grouped[g].length})
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

                  const stats = personStats[person.id] || {
                    count: 0,
                    hasBio: false,
                  };

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
                    <Grid size={{ xs: 12 }} key={person.id}>
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
                            secondary={
                              <Stack
                                mt={1}
                                component="span"
                                direction="row"
                                alignItems="center"
                                spacing={4}
                              >
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    color: "text.secondary",
                                    bgcolor: isDark
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(0,0,0,0.04)",
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: "10px",
                                    fontFamily: "monospace",
                                    border: `1px solid ${theme.palette.divider}`,
                                  }}
                                >
                                  ID: {person.id}
                                </Typography>
                                {/* Индикатор Биографии */}
                                {stats.hasBio && (
                                  <Tooltip title="Биография заполнена">
                                    <Stack
                                      component="span"
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.7}
                                      sx={{
                                        color: "text.secondary",
                                        bgcolor: isDark
                                          ? "rgba(255,255,255,0.05)"
                                          : "rgba(0,0,0,0.04)",
                                        px: 1,
                                        py: 0.4,
                                        borderRadius: "10px",
                                        fontFamily: "monospace",
                                        border: `1px solid ${theme.palette.divider}`,
                                        //
                                        opacity: 0.7,
                                        color: "primary.main",
                                      }}
                                    >
                                      <DescriptionIcon sx={{ fontSize: 17 }} />
                                    </Stack>
                                  </Tooltip>
                                )}
                                {/* Индикатор Фото */}
                                {stats.count > 0 && (
                                  <Tooltip title={`Фотографий: ${stats.count}`}>
                                    <Stack
                                      component="span"
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.7}
                                      sx={{
                                        color: "text.secondary",
                                        bgcolor: isDark
                                          ? "rgba(255,255,255,0.05)"
                                          : "rgba(0,0,0,0.04)",
                                        px: 1,
                                        py: 0.2,
                                        borderRadius: "10px",
                                        fontFamily: "monospace",
                                        border: `1px solid ${theme.palette.divider}`,
                                        //
                                        opacity: 0.7,
                                        color: "primary.main",
                                      }}
                                    >
                                      <PhotoLibraryIcon sx={{ fontSize: 17 }} />
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        fontWeight="700"
                                      >
                                        {stats.count}
                                      </Typography>
                                    </Stack>
                                  </Tooltip>
                                )}
                              </Stack>
                            }
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
                            sx={{ ml: "auto", borderRadius: "10px" }}
                            endIcon={<DeleteIcon fontSize="small" />}
                          >
                            В корзину
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
