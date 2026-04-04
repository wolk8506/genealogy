import React, { useEffect, useState, useMemo } from "react";
import {
  Avatar,
  Typography,
  CircularProgress,
  Stack,
  Button,
  Grid,
  useTheme,
  Paper,
  Box,
  alpha,
} from "@mui/material";

import AddPersonModal from "../../components/Dialog/AddPeopleDialog";
import { useSearchParams } from "react-router-dom";

import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";

import appIcon from "../../img/app_icon.png";
import { Link } from "react-router-dom";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import { useNotificationStore } from "../../store/useNotificationStore";
import { PersonCard } from "./PersonCard";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import { useTagsStore } from "../../store/useTagsStore";

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
  const setHasArchived = usePeopleListStore((state) => state.setHasArchived);
  const personTags = useTagsStore((state) => state.personTags);
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
      const allPeople = data || [];
      setPeople(allPeople);
      setLoading(false);

      if (allPeople.length > 0) {
        // 1. Проверяем наличие удаленных (архивированных) записей
        const existsArchived = allPeople.some((p) => p.archived);
        setHasArchived(existsArchived);

        // 2. Загружаем статистику
        loadAllStats(allPeople);
      }
    });
  }, [setHasArchived]);

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

      // --- НОВАЯ ЛОГИКА ФИЛЬТРАЦИИ ПО МЕТКАМ ---
      // Если в фильтре выбраны метки, проверяем, есть ли у человека ХОТЯ БЫ ОДНА из них (OR)
      const myTags = personTags[p.id] || [];
      const matchTags =
        !filters.tags || filters.tags.length === 0
          ? true // Если фильтр пуст, показываем всех
          : filters.tags.some((tagId) => myTags.includes(tagId));
      // -----------------------------------------

      return (
        matchSearch && matchGen && matchCreated && matchEdited && matchTags
      ); // Добавили matchTags
    });

    res.sort((a, b) => {
      const ta = new Date(a.editedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.editedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    return res;
  }, [active, search, filters, personTags]);

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
    setHasArchived(true);
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
                  top: 50,
                  zIndex: 20,
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
