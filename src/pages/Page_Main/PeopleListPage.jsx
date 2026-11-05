import React, { useEffect, useState, useMemo, useRef } from "react";
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
import ConfirmDialog from "../../components/Dialog/ConfirmDialog";
import { useSearchParams } from "react-router-dom";

import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import SettingsBackupRestoreIcon from "@mui/icons-material/SettingsBackupRestore";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import appIcon from "../../img/app_icon.png";
import { Link } from "react-router-dom";
import { useNotificationStore } from "../../store/useNotificationStore";
import { PersonCard } from "./PersonCard";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import { useTagsStore } from "../../store/useTagsStore";

const pillButtonSx = {
  height: 32,
  borderRadius: "999px",
  px: 2,
  py: 0,
  textTransform: "none",
  fontSize: "0.8125rem",
  lineHeight: 1.2,
  fontWeight: 700,
  boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
  "& .MuiButton-startIcon": {
    mr: 0.5,
    ml: 0,
    "& > *:nth-of-type(1)": { fontSize: 16 },
  },
};

// Заглушка в стиле пустых состояний остальных разделов:
// свечение, крупный заголовок, описание и действия.
function ListEmpty({ avatar, glow, title, text, actions }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 80px)",
        px: 3,
        textAlign: "center",
        animation: "fadeIn 0.8s ease-out",
        "@keyframes fadeIn": {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
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
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: glow || theme.palette.primary.main,
                filter: "blur(25px)",
                opacity: 0.15,
                borderRadius: "50%",
              }}
            />
            {avatar}
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {title}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: "text.secondary", maxWidth: 360, mx: "auto" }}
            >
              {text}
            </Typography>
          </Box>
          {actions}
        </Stack>
      </Box>
    </Box>
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
  setSearch,
  setFilters,
  setFilterOpen,
  onShowRelations,
}) {
  const refreshArchiveStatus = usePeopleListStore(
    (state) => state.refreshArchiveStatus,
  );
  const personTags = useTagsStore((state) => state.personTags);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isModalOpen = searchParams.get("action") === "add";

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const handleCloseModal = () => {
    // Сначала закрываем окно (URL), и только потом перезагружаем список,
    // иначе тяжёлый рендер тормозит анимацию закрытия.
    setSearchParams({});
    setTimeout(() => {
      window.peopleAPI.getAll().then((data) => {
        setPeople(data || []);
        setLoading(false);
        if (data) loadAllStats(data);
      });
    }, 160);
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
        // 1. Проверяем наличие записей в корзине
        refreshArchiveStatus();

        // 2. Загружаем статистику
        loadAllStats(allPeople);
      }
    });
  }, [refreshArchiveStatus]);

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

  const requestArchive = (id) => {
    const person = people.find((p) => p.id === id);
    if (person) setArchiveTarget(person);
  };

  const handleArchive = async (id) => {
    await window.peopleAPI.update(id, {
      archived: true,
      editedAt: new Date().toISOString(),
    });
    refreshArchiveStatus();
    const data = await window.peopleAPI.getAll();
    setPeople(data);
    const p = people.filter((el) => el.id === id)[0];
    const name =
      [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
        .filter(Boolean)
        .join(" ") || `ID ${p.id}`;

    addNotification({
      timestamp: new Date().toISOString(),
      title: "Человек перемещён в корзину",
      message: `Из дерева удалён: ${name}`,
      type: "warning",
      category: "trash",
      link: `/trash`,
    });
  };

  const confirmArchive = async () => {
    if (!archiveTarget || archiving) return;
    setArchiving(true);
    try {
      await handleArchive(archiveTarget.id);
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  const formatPersonName = (p) =>
    [p.firstName, p.patronymic, p.lastName || p.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  // Поиск сузился до одного человека — показать его в связях панели.
  // Срабатывает только на переходе (не на монтировании).
  // Хуки строго до ранних return (правила хуков).
  const prevFilteredCount = useRef(null);
  useEffect(() => {
    if (prevFilteredCount.current === null) {
      prevFilteredCount.current = filtered.length;
      return;
    }
    if (
      filtered.length === 1 &&
      prevFilteredCount.current !== 1 &&
      onShowRelations
    ) {
      onShowRelations(filtered[0].id);
    }
    prevFilteredCount.current = filtered.length;
  }, [filtered, onShowRelations]);

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
      <>
        <ListEmpty
          avatar={
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
          }
          title="Генеалогия"
          text="Ваше семейное древо пока пустует. Начните историю с первого предка."
          actions={
            <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
              <Button
                variant="contained"
                component={Link}
                to="/?action=add"
                size="large"
                startIcon={<PersonAddAlt1Icon />}
                sx={pillButtonSx}
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
                  ...pillButtonSx,
                  boxShadow: "none",
                  borderColor: alpha(theme.palette.divider, 0.5),
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "text.primary",
                    bgcolor: alpha(theme.palette.text.primary, 0.05),
                  },
                }}
              >
                Восстановить из бэкапа
              </Button>
            </Stack>
          }
        />

        <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
      </>
    );
  }

  // Все записи в корзине — в списке пусто, но библиотека не пустая.
  if (!active.length) {
    return (
      <>
        <ListEmpty
          glow={theme.palette.warning.main}
          avatar={
            <Avatar
              sx={{
                width: 100,
                height: 100,
                border: "4px solid",
                borderColor: "background.paper",
                boxShadow: theme.shadows[4],
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                color: "warning.main",
              }}
            >
              <RestoreFromTrashIcon sx={{ fontSize: 48 }} />
            </Avatar>
          }
          title="Все люди в корзине"
          text="В списке никого нет: все записи перемещены в корзину. Восстановите нужных людей, чтобы они снова появились здесь."
          actions={
            <Button
              variant="contained"
              component={Link}
              to="/trash"
              size="large"
              startIcon={<RestoreFromTrashIcon />}
              sx={pillButtonSx}
            >
              Открыть корзину
            </Button>
          }
        />

        <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
      </>
    );
  }

  // Поиск или фильтры не дали результатов.
  if (!filtered.length) {
    return (
      <>
        <ListEmpty
          avatar={
            <Avatar
              sx={{
                width: 100,
                height: 100,
                border: "4px solid",
                borderColor: "background.paper",
                boxShadow: theme.shadows[4],
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
              }}
            >
              <SearchOffIcon sx={{ fontSize: 48 }} />
            </Avatar>
          }
          title="Ничего не найдено"
          text="Измените запрос или сбросьте фильтры — поиск идёт по имени и ID, а фильтры ограничивают поколения, даты и метки."
          actions={
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                setSearch?.("");
                setFilters?.({ created: "", edited: "", gens: [], tags: [] });
                setFilterOpen?.(false);
              }}
              sx={pillButtonSx}
            >
              Сбросить поиск и фильтры
            </Button>
          }
        />

        <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
      </>
    );
  }

  return (
    <>
      <Stack spacing={3} sx={{ width: "100%", pt: 1 }}>
        {gens.map((g) => (
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
                  top: 58,
                  zIndex: 20,
                  py: 1.5,
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  bgcolor: alpha(theme.palette.background.default, 0.4),
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

              <Grid container spacing={2} direction={"column"}>
                {grouped[g].map((person) => (
                  <Grid key={person.id} size={{ xs: 12 }}>
                    <PersonCard
                      person={person}
                      stats={personStats[person.id]}
                      onDelete={requestArchive}
                      onShowRelations={onShowRelations}
                      size="full" // В основном списке всегда полный размер
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ))}
      </Stack>

      <AddPersonModal open={isModalOpen} onClose={handleCloseModal} />
      <ConfirmDialog
        open={!!archiveTarget}
        title="Переместить в корзину?"
        message={
          archiveTarget
            ? `«${formatPersonName(archiveTarget)}» исчезнет из списка и дерева. Восстановить можно в разделе «Корзина».`
            : ""
        }
        confirmLabel="В корзину"
        busy={archiving}
        onClose={(confirmed) => {
          if (confirmed) confirmArchive();
          else setArchiveTarget(null);
        }}
      />
    </>
  );
}
