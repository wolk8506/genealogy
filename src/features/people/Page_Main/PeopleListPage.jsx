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
} from "@mui/material";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PeopleIcon from "@mui/icons-material/People";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CakeIcon from "@mui/icons-material/Cake";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import FilterListIcon from "@mui/icons-material/FilterList";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import DeleteIcon from "@mui/icons-material/Delete";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import appIcon from "../../../img/app_icon.png";

import { Link } from "react-router-dom";

function PersonAvatar({ foto, initials }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (foto) window.avatarAPI.getPath(foto).then(setSrc);
  }, [foto]);
  return (
    <Avatar src={src}>{!src && initials?.slice(0, 2).toUpperCase()}</Avatar>
  );
}

export default function PeopleListPage() {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("asc");
  const [statsOpen, setStatsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setPeople(data || []);
      setLoading(false);
    });
  }, []);

  // не в архиве
  const active = useMemo(() => people.filter((p) => !p.archived), [people]);
  const archived = useMemo(() => people.filter((p) => p.archived), [people]);

  // фильтрация
  const filtered = useMemo(() => {
    return active.filter((p) => {
      const name = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
      return (
        name.includes(search.toLowerCase()) || String(p.id).includes(search)
      );
    });
  }, [active, search]);

  // группировка по поколению
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

  // статистика
  const stats = useMemo(() => {
    const total = active.length;
    const males = active.filter((p) => p.gender === "male").length;
    const females = active.filter((p) => p.gender === "female").length;
    const unknown = total - males - females;
    const perGen = Object.fromEntries(
      Object.entries(grouped).map(([g, arr]) => [g, arr.length])
    );
    const ages = active
      .map((p) => {
        if (!p.birthDate) return null;
        const d =
          new Date().getFullYear() - new Date(p.birthDate).getFullYear();
        return isNaN(d) ? null : d;
      })
      .filter((x) => x != null);
    const avgAge =
      ages.length > 0
        ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1)
        : "-";
    return {
      total,
      males,
      females,
      unknown,
      perGen,
      avgAge,
      archived: archived.length,
    };
  }, [active, grouped, archived]);

  const handleArchive = async (id) => {
    await window.peopleAPI.update(id, { archived: true });
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

  return (
    <>
      <Stack spacing={2}>
        {/* <Stack direction="row" alignItems="center">
          <PeopleAltIcon
            color="primary"
            fontSize="large"
            sx={{ marginRight: 1 }}
          />
          <Typography variant="h5">Список людей </Typography>
        </Stack> */}

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
          {/* <Box sx={{ height: 64 }} /> или 56, если AppBar меньше */}
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Поиск по имени или ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              size="small"
            />
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
        {gens.map((g) => (
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
                          overflow: "hidden", // обрезаем всё, что выходит за границы
                          backgroundClip: "padding-box", // гарантируем обрезку фоновых слоёв
                        }}
                      >
                        <ListItemAvatar>
                          <PersonAvatar foto={person.id} initials={initials} />
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
        ))}
      </Stack>

      {/* Статистика */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)}>
        <DialogTitle>Статистика</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Всего */}
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
                  <Typography variant="h6">{stats.total}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* Мужчины */}
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
                  <Typography variant="h6">{stats.males}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* Женщины */}
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
                  <Typography variant="h6">{stats.females}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* Неизвестно */}
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
                  <Typography variant="h6">{stats.unknown}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* Средний возраст */}
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
                <CakeIcon color="success" />
                <div>
                  <Typography variant="caption">Средний возраст</Typography>
                  <Typography variant="h6">{stats.avgAge}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* Архив */}
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
                  <Typography variant="h6">{stats.archived}</Typography>
                </div>
              </Paper>
            </Grid>

            {/* По поколениям */}
            {Object.entries(stats.perGen).map(([g, cnt]) => (
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
                  <Typography variant="caption" sx={{ minWidth: 64 }}>
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
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </>
  );
}
