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
  Paper,
  Tooltip,
  Chip,
  Box,
  alpha,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddPersonModal from "../../components/Dialog/AddPeopleDialog";
import { useSearchParams } from "react-router-dom";

import DescriptionIcon from "@mui/icons-material/Description"; // Для биографии
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary"; // Для фото

import appIcon from "../../img/app_icon.png";
import { Link } from "react-router-dom";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { useNotificationStore } from "../../store/useNotificationStore";

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

export default function PeopleListPage({ search, filters, sortOrder }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const isModalOpen = searchParams.get("action") === "add";

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const handleCloseModal = () => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
      setLoading(false);
      if (data) loadAllStats(data);
    });
    setSearchParams({});
  };

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

  const active = useMemo(() => people.filter((p) => !p.archived), [people]);

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
    const p = people.filter((el) => el.id === id)[0];
    const name =
      [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
        .filter(Boolean)
        .join(" ") || `ID ${p.id}`;

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Человек перемещен в корзину",
      message: `Из дерева удален: ${name} `,
      type: "warning",
      link: `/archive`,
    });
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 80px)", // Центрируем относительно экрана
          px: 3,
          textAlign: "center",
          animation: "fadeIn 0.8s ease-out", // Простая анимация появления
          "@keyframes fadeIn": {
            from: { opacity: 0, transform: "translateY(20px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {/* Центральная карточка */}
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            maxWidth: 500,
            borderRadius: "24px",
            bgcolor: alpha(theme.palette.background.paper, 0.4),
            border: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Stack spacing={3} alignItems="center">
            {/* Иконка с эффектом свечения */}
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: theme.palette.primary.main,
                  filter: "blur(25px)",
                  opacity: 0.15,
                  borderRadius: "50%",
                }}
              />
              <Avatar
                src={appIcon}
                sx={{
                  width: 100,
                  height: 100,
                  border: "4px solid",
                  borderColor: "background.paper",
                  boxShadow: theme.shadows[4],
                }}
              />
            </Box>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Генеалогия
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", maxWidth: 350, mx: "auto" }}
              >
                Ваше семейное древо пока пустует. Начните историю с первого
                предка.
              </Typography>
            </Box>

            <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
              <Button
                variant="contained"
                component={Link}
                to="/?action=add"
                size="large"
                startIcon={<PersonAddAlt1Icon />}
                sx={{
                  borderRadius: "12px",
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 700,
                  boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                }}
              >
                Добавить первого человека
              </Button>

              <Button
                variant="outlined"
                component={Link}
                to="/settings"
                size="large"
                startIcon={<SettingsBackupRestoreIcon />}
                sx={{
                  borderRadius: "12px",
                  py: 1.2,
                  textTransform: "none",
                  borderColor: alpha(theme.palette.divider, 0.5),
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "text.primary",
                    bgcolor: alpha(theme.palette.text.primary, 0.05),
                  },
                }}
              >
                Восстановить из архива
              </Button>
            </Stack>
          </Stack>
        </Box>

        <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
      </Box>
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

  // утилиту для проверки «Прошло меньше 24 часов»
  const isRecent = (dateStr) => {
    if (!dateStr) return false;

    const eventTime = new Date(dateStr).getTime();
    const currentTime = new Date().getTime();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 86,400,000 мс

    const diff = currentTime - eventTime;

    // Событие считается недавним, если оно произошло меньше 24 часов назад
    // и при этом время события не из будущего (diff >= 0)
    return diff >= 0 && diff < oneDayInMs;
  };

  const PersonCard = ({ person, stats, onDelete, size = "full" }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const name =
      [person.firstName, person.lastName || person.maidenName]
        .filter(Boolean)
        .join(" ") || "Без имени";
    const initials =
      (person.firstName?.[0] || "") +
      (person.lastName?.[0] || person.maidenName?.[1] || "");

    const createdToday = isRecent(person.createdAt);
    const editedToday = isRecent(person.editedAt);
    const showBadge = createdToday || editedToday;
    const labelColor = createdToday ? "success" : "info";
    const labelText = createdToday ? "Новый" : "Изменен";

    const isSmall = size === "small";

    return (
      <ListItemButton
        component={Link}
        to={`/person/${person.id}`}
        sx={{
          p: 0,
          borderRadius: "16px",
          width: "100%", // Растягиваем саму кнопку
          display: "flex",
          "&.MuiButtonBase-root": {
            alignItems: "stretch", // Гарантируем растягивание контента по вертикали, если нужно
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1, // КРИТИЧНО: заставляет Paper занять всё место в кнопке
            width: "100%",
            display: "flex",
            alignItems: "center",
            p: isSmall ? 1 : 1.5,
            borderRadius: "16px",
            bgcolor: isDark ? "rgba(42, 42, 42, 0.6)" : "#fff",
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            backdropFilter: isDark ? "blur(10px)" : "none",
            position: "relative",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: isSmall ? "none" : "translateY(-4px)",
              boxShadow: isDark
                ? "0 12px 24px rgba(0,0,0,0.4)"
                : "0 8px 16px rgba(0,0,0,0.05)",
              borderColor: "primary.main",
              bgcolor: isDark ? "rgba(42, 42, 42, 0.8)" : "#fff",
            },
          }}
        >
          <ListItemAvatar sx={{ minWidth: isSmall ? 52 : 64 }}>
            {/* Можно добавить Badge прямо на аватар, если хочешь вернуть точку */}
            <PersonAvatar foto={person.id} initials={initials} />
          </ListItemAvatar>

          <ListItemText
            primaryTypographyProps={{ component: "div" }}
            secondaryTypographyProps={{ component: "div" }}
            primary={
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                flexWrap="wrap"
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: isSmall ? "0.95rem" : "1.1rem",
                  }}
                >
                  {name}
                </Typography>
                {showBadge && (
                  <Chip
                    size="small"
                    label={labelText}
                    sx={{
                      height: 18,
                      fontSize: "9px",
                      fontWeight: 900,
                      borderRadius: "6px",
                      bgcolor: alpha(theme.palette[labelColor].main, 0.1),
                      color: `${labelColor}.main`,
                      border: `1px solid ${alpha(theme.palette[labelColor].main, 0.2)}`,
                    }}
                  />
                )}
              </Stack>
            }
            secondary={
              <Stack
                direction="row"
                spacing={isSmall ? 1 : 2}
                mt={0.5}
                component="div"
                alignItems="center"
              >
                <Typography
                  variant="caption"
                  component="span"
                  sx={{
                    bgcolor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontFamily: "monospace",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  ID {person.id}
                </Typography>

                {!isSmall && stats?.hasBio && (
                  <Tooltip title="Биография заполнена">
                    <DescriptionIcon
                      sx={{ fontSize: 16, color: "primary.main", opacity: 0.7 }}
                    />
                  </Tooltip>
                )}

                {stats?.count > 0 && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ color: "info.main" }}
                    component="span"
                  >
                    <PhotoLibraryIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                    {!isSmall && (
                      <Typography variant="caption" fontWeight="800">
                        {stats.count}
                      </Typography>
                    )}
                  </Stack>
                )}
              </Stack>
            }
          />

          <Button
            size="small"
            color="error"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(person.id);
            }}
            startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
            sx={{
              ml: "auto", // Прижимает кнопку вправо
              px: isSmall ? 1 : 2,
              borderRadius: "10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              opacity: isSmall ? 0.2 : 0.5,
              transition: "0.2s",
              whiteSpace: "nowrap", // Чтобы текст не переносился
              "&:hover": {
                opacity: 1,
                bgcolor: alpha(theme.palette.error.main, 0.1),
              },
            }}
          >
            {!isSmall && "В корзину"}
          </Button>
        </Paper>
      </ListItemButton>
    );
  };

  const renderRelationItem = (p) => (
    <PersonCard
      key={p.id}
      person={p}
      stats={personStats[p.id]}
      onDelete={handleArchive}
      size="small" // В связях используем компактный размер
    />
  );

  return (
    <>
      <Stack spacing={3} sx={{ width: "100%" }}>
        {singleMatch ? (
          /* РЕЖИМ 1: РОДСТВЕННЫЕ СВЯЗИ */
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "24px",
              bgcolor: isDark
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(0, 0, 0, 0.02)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 3, fontWeight: 800, color: "primary.main" }}
            >
              Родственные связи
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography variant="overline" sx={{ opacity: 0.6, ml: 1 }}>
                Центральная фигура
              </Typography>
              <Box sx={{ mt: 1 }}>
                <PersonCard
                  person={singleMatch}
                  stats={personStats[singleMatch.id]}
                  onDelete={handleArchive}
                  size="full"
                />
              </Box>
            </Box>

            <Grid
              container
              spacing={3}
              flexWrap={"nowrap"}
              justifyContent={"space-between"}
            >
              {[
                {
                  title: "Родители",
                  data: [father, mother].filter(Boolean),
                  empty: "Не указаны",
                },
                { title: "Супруги", data: spouses, empty: "Нет данных" },
                { title: "Дети", data: children, empty: "Нет данных" },
                {
                  title: "Братья / Сёстры",
                  data: siblings,
                  empty: "Нет данных",
                  fullWidth: true,
                },
              ].map((section) => (
                <Grid
                  item
                  xs={12}
                  sm={section.fullWidth ? 12 : 6}
                  md={section.fullWidth ? 12 : 4}
                  key={section.title}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1.5, fontWeight: 700, opacity: 0.8 }}
                  >
                    {section.title}
                  </Typography>
                  <Stack spacing={1}>
                    {section.data.length > 0 ? (
                      section.data.map(renderRelationItem)
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ fontStyle: "italic", opacity: 0.5, ml: 1 }}
                      >
                        {section.empty}
                      </Typography>
                    )}
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ) : (
          /* РЕЖИМ 2: ПОКОЛЕНИЯ */
          gens.map((g) => (
            <Paper
              key={g}
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                mb: 4,
                borderRadius: "24px",
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.02)"
                  : "rgba(0, 0, 0, 0.02)",
                border: "1px solid",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  py: 1.5,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  bgcolor: isDark
                    ? alpha("#1a1a1a", 0.9)
                    : alpha("#fafafa", 0.9),
                  backdropFilter: "blur(12px)",
                  mx: -1,
                  px: 2,
                  borderRadius: "16px",
                }}
              >
                <Box
                  sx={{
                    width: 4,
                    height: 20,
                    bgcolor: "primary.main",
                    borderRadius: 2,
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: "primary.main" }}
                >
                  Поколение {g}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.5 }}>
                  ({grouped[g].length})
                </Typography>
              </Box>

              <Grid container spacing={2} flexDirection={"column"}>
                {grouped[g].map((person) => (
                  <Grid key={person.id} item xs={12}>
                    <PersonCard
                      person={person}
                      stats={personStats[person.id]}
                      onDelete={handleArchive}
                      size="full" // В основном списке всегда полный размер
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ))
        )}
      </Stack>

      <ButtonScrollTop />
      <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}
