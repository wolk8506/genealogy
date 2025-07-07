// src/components/GlobalPhotoGallery.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Stack,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ImageList,
  ImageListItem,
  IconButton,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Dialog,
  DialogContent,
  Paper,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SwipeableViews from "react-swipeable-views";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import ArchiveIcon from "@mui/icons-material/Archive";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Zoom } from "@mui/material";

// Преобразует datePhoto в timestamp, неподходящая строка → null
const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

export default function GlobalPhotoGallery() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // данные
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({});
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI-состояния
  const [search, setSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [viewMode, setViewMode] = useState("square"); // square | natural
  const [groupBy, setGroupBy] = useState("none"); // none | owner | date
  const [sortBy, setSortBy] = useState("date"); // date | datePhoto
  const [sortDir, setSortDir] = useState("desc"); // asc | desc
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // загрузка данных
  useEffect(() => {
    (async () => {
      const [people, list] = await Promise.all([
        window.peopleAPI.getAll(),
        window.photoAPI.getAllGlobal(),
      ]);
      setAllPeople(people || []);

      const paths = {};
      for (const p of list) {
        paths[p.id] = await window.photoAPI.getPath(p.owner, p.filename);
      }

      setPhotoPaths(paths);
      setPhotos(list);
      setLoading(false);
    })();
  }, []);

  // фильтрация по тексту и людям
  const filtered = useMemo(() => {
    return photos.filter((p) => {
      const txt = `${p.title || ""} ${p.description || ""}`.toLowerCase();
      const okText = txt.includes(search.toLowerCase());
      const okPeople =
        !selectedPeople.length ||
        selectedPeople.some((sp) =>
          [p.owner, ...(p.people || [])].includes(sp.id)
        );
      return okText && okPeople;
    });
  }, [photos, search, selectedPeople]);

  // ключ для сортировки по владельцу (для группы owner)
  const getOwnerKey = (ownerId) => {
    const u = allPeople.find((x) => x.id === ownerId);
    if (!u) return "\uffff";
    let last = u.lastName?.trim();
    if (!last && u.maidenName) {
      last = u.maidenName.replace(/[\(\)]/g, "").trim();
    }
    if (!last) return "\uffff";
    const first = u.firstName?.trim() || "";
    return (last + " " + first).toLowerCase();
  };

  // сортировка без группировки
  const sortedList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let ka =
        sortBy === "date"
          ? Date.parse(a.date)
          : normalizePhotoDate(a.datePhoto);
      let kb =
        sortBy === "date"
          ? Date.parse(b.date)
          : normalizePhotoDate(b.datePhoto);

      if (ka === kb) return 0;
      if (ka == null) return 1;
      if (kb == null) return -1;
      return sortDir === "asc" ? ka - kb : kb - ka;
    });
  }, [filtered, sortBy, sortDir]);

  // группировка по groupBy
  const grouped = useMemo(() => {
    if (groupBy === "owner") {
      const owners = allPeople
        .filter((u) => sortedList.some((p) => p.owner === u.id))
        .sort((a, b) => getOwnerKey(a.id).localeCompare(getOwnerKey(b.id)));

      return owners.map((u) => ({
        label:
          getOwnerKey(u.id) === "\uffff"
            ? "(Без фамилии)"
            : `${u.lastName || u.maidenName.replace(/[\(\)]/g, "")} ${
                u.firstName
              }`.trim(),
        items: sortedList.filter((p) => p.owner === u.id),
      }));
    }

    if (groupBy === "date") {
      const map = {};
      for (const p of sortedList) {
        const d = p.date?.split("T")[0] || "Без даты";
        map[d] = map[d] || [];
        map[d].push(p);
      }
      return Object.entries(map)
        .sort(([da], [db]) => (da > db ? -1 : da < db ? 1 : 0))
        .map(([label, items]) => ({ label, items }));
    }

    return [{ label: null, items: sortedList }];
  }, [groupBy, allPeople, sortedList]);

  // список людей для фильтра
  const availablePeople = allPeople.filter((u) =>
    filtered.some((p) => p.owner === u.id || (p.people || []).includes(u.id))
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // загрузка фото в плитке
  const renderTile = (photo) => {
    const idx = sortedList.findIndex((p) => p.id === photo.id);
    return (
      <ImageListItem
        key={photo.id}
        sx={{
          aspectRatio:
            viewMode === "square" ? "1 / 1" : photo.aspectRatio || "4 / 3",
          position: "relative",
          overflow: "hidden",
          borderRadius: 2,
          backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={photoPaths[photo.id]}
          alt={photo.title}
          loading="lazy"
          onClick={() => {
            setIndex(idx);
            setFullscreen(true);
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 4,
          }}
        />

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(photo);
          }}
          sx={{
            position: "absolute",
            top: 4,
            left: 4,
            backgroundColor: "rgba(0,0,0,0.4)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
          }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
        {/* Заглушка для редактирования */}
        {/* <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
          
          }}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            backgroundColor: "rgba(0,0,0,0.4)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton> */}
        {/* Заглушка для Удаления */}
        {/* <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Удалить это фото?")) {
              window.photoAPI.delete(photo.owner, photo.id);
              setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            }
          }}
          sx={{
            position: "absolute",
            bottom: 4,
            left: 4,
            backgroundColor: "rgba(255,0,0,0.4)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(255,0,0,0.6)" },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton> */}

        <Box
          sx={{
            position: "absolute",
            bottom: 4,
            right: 4,
            color: "orange",
            backgroundColor: "rgba(0,0,0,0.4)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: "0.75rem",
            fontWeight: 500,
          }}
        >
          <CalendarTodayIcon sx={{ fontSize: 14 }} />
          {photo.datePhoto || "—"}
        </Box>
      </ImageListItem>
    );
  };

  // основная разметка
  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ marginBottom: 2 }}>
        <PhotoLibraryIcon
          color="primary"
          fontSize="large"
          sx={{ marginRight: 1 }}
        />
        <Typography variant="h5">Фотогалерея</Typography>
      </Stack>
      <Paper
        elevation={1}
        sx={{
          position: "sticky",
          top: { xs: 56, sm: 64 },
          zIndex: 10,
          backgroundColor: theme.palette.background.paper,
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Поиск"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
          />

          <Autocomplete
            multiple
            options={availablePeople}
            getOptionLabel={(u) =>
              `${u.id} :: ${u.firstName || ""} ${
                u.lastName || u.maidenName || ""
              }`.trim()
            }
            value={selectedPeople}
            onChange={(_, v) => setSelectedPeople(v)}
            renderInput={(params) => (
              <TextField {...params} label="Фильтр по людям" size="small" />
            )}
            sx={{ minWidth: 240 }}
          />

          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="square">Квадрат</ToggleButton>
            <ToggleButton value="natural">Пропорции</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Группировка</InputLabel>
            <Select
              value={groupBy}
              label="Группировка"
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <MenuItem value="none">Без группировки</MenuItem>
              <MenuItem value="owner">По владельцу</MenuItem>
              <MenuItem value="date">По дате добавления</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Сортировка</InputLabel>
            <Select
              value={`${sortBy}:${sortDir}`}
              label="Сортировка"
              onChange={(e) => {
                const [by, dir] = e.target.value.split(":");
                setSortBy(by);
                setSortDir(dir);
              }}
            >
              <MenuItem value="date:desc">Добавлено (новые)</MenuItem>
              <MenuItem value="date:asc">Добавлено (старые)</MenuItem>
              <MenuItem value="datePhoto:desc">Фото (новые)</MenuItem>
              <MenuItem value="datePhoto:asc">Фото (старые)</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<ArchiveIcon />}
            sx={{ width: 150 }}
            onClick={() => window.photoExport.exportZip(filtered)}
          >
            в ZIP
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{ width: 150 }}
            onClick={() => window.photoExport.exportPDF(filtered)}
          >
            в PDF
          </Button>
        </Stack>
      </Paper>

      {grouped.map((grp, gi) => (
        <Box key={gi} sx={{ mb: 3 }}>
          {grp.label && (
            <Typography variant="h6" sx={{ mb: 1 }}>
              {grp.label}
            </Typography>
          )}
          <ImageList cols={3} gap={8}>
            {grp.items.map((photo) => renderTile(photo))}
          </ImageList>
        </Box>
      ))}

      <Dialog open={fullscreen} onClose={() => setFullscreen(false)} fullScreen>
        <DialogContent
          sx={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "#000",
            p: 0,
          }}
        >
          <IconButton
            onClick={() => setFullscreen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: isDark ? "#fff" : "#000",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.1)",
              },
              zIndex: 10,
            }}
          >
            <CloseIcon />
          </IconButton>

          <IconButton
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            sx={{
              position: "absolute",
              top: "50%",
              left: 8,
              transform: "translateY(-50%)",
              color: isDark ? "#fff" : "#000",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.1)",
              },
              zIndex: 10,
              borderRadius: "50%",
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>

          <IconButton
            onClick={() =>
              setIndex((prev) => Math.min(prev + 1, sortedList.length - 1))
            }
            sx={{
              position: "absolute",
              top: "50%",
              right: 8,
              transform: "translateY(-50%)",
              color: isDark ? "#fff" : "#000",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.1)",
              },
              zIndex: 10,
              borderRadius: "50%",
            }}
          >
            <ArrowForwardIosIcon />
          </IconButton>

          <SwipeableViews
            index={index}
            onChangeIndex={setIndex}
            enableMouseEvents
          >
            {sortedList.map((photo) => (
              <Box
                key={photo.id}
                sx={{
                  height: "100vh",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  px: 2,
                }}
              >
                <img
                  src={photoPaths[photo.id]}
                  alt={photo.title}
                  style={{
                    maxHeight: "80vh",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />
                <Typography variant="h6" mt={2} color="gray">
                  {photo.title}
                </Typography>
                <Typography variant="body2" color="gray">
                  {photo.description}
                </Typography>
                <Typography
                  variant="caption"
                  mt={1}
                  sx={{
                    color: isDark ? "#fff" : "#000",
                  }}
                >
                  👤 Добавил:{" "}
                  {allPeople.find((p) => p.id === photo.owner)?.firstName ||
                    "Неизвестно"}
                </Typography>
                <Typography
                  variant="caption"
                  mt={1}
                  sx={{
                    color: isDark ? "#fff" : "#000",
                  }}
                >
                  {photo?.datePhoto && `📅 ${photo?.datePhoto || "--"} |`} 🏷️ На
                  фото:{" "}
                  {photo.people
                    .map((id) => {
                      const person = allPeople.find((p) => p.id === id);
                      return person
                        ? `${person.firstName || ""} ${
                            person.lastName || ""
                          }`.trim()
                        : `ID ${id}`;
                    })
                    .join(", ")}
                </Typography>
              </Box>
            ))}
          </SwipeableViews>
        </DialogContent>
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

  // скачивание файла
  async function handleDownload(photo) {
    try {
      const url = photoPaths[photo.id];
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.split(".").pop().split("?")[0];
      const name = photo.filename || `${photo.id}.${ext}`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Не удалось скачать");
    }
  }
}
