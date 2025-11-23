// src/components/PhotoGallery.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ImageList,
  ImageListItem,
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  Stack,
  TextField,
  Autocomplete,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SwipeableViews from "react-swipeable-views";
import PhotoUploadDialog from "./PhotoUploadDialog";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import FilterListIcon from "@mui/icons-material/FilterList";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PhotoMetaDialog from "../PhotoMetaDialog";

// нормализация datePhoto → timestamp или null
const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

export default function PhotoGallery({ personId, allPeople, refresh }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isSmall = useMediaQuery(theme.breakpoints.down("md")); // ? sm=600 | md=900 | lg=1200 | xl=1536

  // данные и состояния
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({});
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState("square"); // "square" | "natural"
  const [hideLabels, setHideLabels] = useState(false);

  // сортировка datePhoto: 0=off,1=asc,2=desc
  const [sortState, setSortState] = useState(0);
  const cycleSort = () => setSortState((s) => (s + 1) % 3);
  const sortIcons = [
    <FilterListOffIcon />,
    <FilterListIcon sx={{ rotate: "180deg" }} />,
    <FilterListIcon />,
  ];

  // редактирование
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  // fullscreen
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);

  const [meta, setMeta] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // загрузка фотографий и путей
  useEffect(() => {
    if (!personId) return;
    window.photoAPI.getAll(personId).then(async (list) => {
      const filtered = list.filter(
        (p) =>
          p.owner === Number(personId) || p.people.includes(Number(personId))
      );
      const paths = {};
      for (const p of filtered) {
        paths[p.id] = await window.photoAPI.getPath(p.owner, p.filename);
      }
      setPhotos(filtered);
      setPhotoPaths(paths);
    });
  }, [personId, refreshPhotos]);

  // объединённая сортировка: сначала date добавления, затем по datePhoto
  const displayPhotos = useMemo(() => {
    const arr = [...photos].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date)
    );
    if (sortState > 0) {
      arr.sort((a, b) => {
        const da = normalizePhotoDate(a.datePhoto);
        const db = normalizePhotoDate(b.datePhoto);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return sortState === 1 ? da - db : db - da;
      });
    }
    return arr;
  }, [photos, sortState]);

  // открытие fullscreen
  const handleFullscreenOpen = (photo) => {
    const i = displayPhotos.findIndex((p) => p.id === photo.id);
    setIndex(i);
    setFullscreen(true);
  };
  const handleFullscreenClose = async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen) {
      await window.windowAPI.setFullscreen(false); // вернём только если мы включили
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  };

  // открытие редактирования
  const handleOpen = (photo) => {
    setCurrent({ ...photo });
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setCurrent(null);
  };
  const handleSave = () => {
    window.photoAPI.update(current.owner, current);
    setPhotos((prev) => prev.map((p) => (p.id === current.id ? current : p)));
    handleClose();
    setRefreshPhotos((r) => r + 1);
  };

  const handlMaximazeWindow = async () => {
    const wantFullscreen = !hideLabels;
    setHideLabels(wantFullscreen);

    const alreadyFullscreen = await window.windowAPI.isFullscreen();

    if (wantFullscreen) {
      // Включаем fullscreen, если он ещё не активен
      if (!alreadyFullscreen) {
        await window.windowAPI.setFullscreen(true);
        setSliderForcedFullscreen(true);
      }
    } else {
      // Выключаем fullscreen, если именно этот компонент его активировал
      if (sliderForcedFullscreen) {
        await window.windowAPI.setFullscreen(false);
        setSliderForcedFullscreen(false);
      }
    }
  };
  // Листание слайдов с клавиатуры
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreen) return; // реагируем только при открытом просмотре

      if (e.key === "ArrowLeft") {
        setIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "ArrowRight") {
        setIndex((prev) => Math.min(prev + 1, displayPhotos.length - 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen, displayPhotos.length]);

  // 📋 Контекстное меню

  useEffect(() => {
    const { ipcRenderer } = window.electron;

    // зачистка — на случай дубликатов
    ipcRenderer.removeAllListeners("photo:download");
    ipcRenderer.removeAllListeners("photo:open");
    ipcRenderer.removeAllListeners("photo:delete");
    ipcRenderer.removeAllListeners("photo:meta-response");

    // Скачивание
    ipcRenderer.on("photo:download", (_, photo) => {
      ipcRenderer.send("photo:download", photo);
    });

    // Открытие
    ipcRenderer.on("photo:open", (_, id) => handleOpen(id));

    // Удаление
    ipcRenderer.on("photo:delete", (_, id) => {
      if (confirm("Удалить фото?")) {
        window.photoAPI.delete(personId, id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    });

    // Метаданные
    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      console.log("🕯️ мета-инфо получена:", receivedMeta);
      setMeta(receivedMeta);
      setOpenDialog(true);
    });

    // очистка при размонтировании
    return () => {
      ipcRenderer.removeAllListeners("photo:download");
      ipcRenderer.removeAllListeners("photo:open");
      ipcRenderer.removeAllListeners("photo:delete");
      ipcRenderer.removeAllListeners("photo:meta-response");
    };
  }, []);

  const quntityPhoto = displayPhotos?.length;
  // пустая галерея
  if (!displayPhotos.length) {
    return (
      <>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography variant="h6">
            Фотографии{" "}
            <IconButton onClick={() => setUploadOpen(true)}>
              <AddPhotoAlternateIcon />
            </IconButton>
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(e, v) => v && setViewMode(v)}
          >
            <ToggleButton value="square">Квадрат</ToggleButton>
            <ToggleButton value="natural">Пропорции</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          color="text.secondary"
          sx={{ py: 4 }}
        >
          <AddPhotoAlternateIcon
            sx={{ fontSize: 64, mb: 2, color: "lightgray" }}
          />
          <Typography variant="h6">Фотогалерея пуста</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Добавьте фотографию, чтобы она появилась здесь.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Загрузить фото
          </Button>
        </Box>

        <PhotoUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          personId={personId}
          currentUserId={personId}
          onPhotoAdded={() => setRefreshPhotos((r) => r + 1)}
        />
      </>
    );
  }

  return (
    <>
      {/* панель действий */}
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="h6">
          Фотографии{" "}
          <IconButton onClick={() => setUploadOpen(true)}>
            <AddPhotoAlternateIcon />
          </IconButton>
        </Typography>

        <Stack direction="row" spacing={1}>
          {/* триггер сортировки datePhoto */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarTodayIcon />}
            endIcon={sortIcons[sortState]}
            onClick={cycleSort}
          >
            Дата фото
          </Button>
          {/* вид */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(e, v) => v && setViewMode(v)}
          >
            <ToggleButton value="square">Квадрат</ToggleButton>
            <ToggleButton value="natural">Пропорции</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <PhotoUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        personId={personId}
        currentUserId={personId}
        onPhotoAdded={() => setRefreshPhotos((r) => r + 1)}
      />

      {/* сетка фотографий */}
      <ImageList cols={isSmall ? 3 : 4} gap={8}>
        {displayPhotos.map((photo) => (
          <ImageListItem
            key={photo.id}
            onClick={() => {
              handleFullscreenOpen(photo);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              console.log(personId);
              window.contextAPI.showPhotoMenu(
                photo,
                {
                  x: e.clientX,
                  y: e.clientY,
                },
                "full",
                personId
              );
            }}
            sx={{
              aspectRatio:
                viewMode === "square" ? "1 / 1" : photo.aspectRatio || "4 / 3",
              position: "relative",
              overflow: "hidden",
              borderRadius: 3,
              backgroundColor: isDark ? "#1e1e1e" : "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              "&:hover .overlay": {
                opacity: 1,
              },
            }}
          >
            <img
              src={photoPaths[photo.id]}
              alt={photo.title}
              loading="lazy"
              // onClick={() => handleFullscreenOpen(photo)}
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
                window.electron?.ipcRenderer.send("photo:download", photo);
              }}
              sx={{
                zIndex: 1000,
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

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpen(photo);
              }}
              sx={{
                zIndex: 1000,
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: "rgba(0,0,0,0.4)",
                color: "#fff",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>

            {personId === photo.owner && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Удалить фото?")) {
                    window.photoAPI.delete(personId, photo.id);
                    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                  }
                }}
                sx={{
                  zIndex: 1000,
                  position: "absolute",
                  bottom: 4,
                  left: 4,
                  backgroundColor: "rgba(255,0,0,0.4)",
                  color: "#fff",
                  "&:hover": { backgroundColor: "rgba(255,0,0,0.6)" },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}

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
            <Box
              className="overlay"
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.5)",
                color: "#fff",
                opacity: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                px: 1,
                transition: "opacity 0.3s",
              }}
            >
              <Typography variant="subtitle1">{photo.title}</Typography>
              <Typography variant="subtitle1">{photo.description}</Typography>
              <Typography variant="caption" mt={0.5}>
                🏷️ На фото:{" "}
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
          </ImageListItem>
        ))}
      </ImageList>

      {/* диалог редактирования */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent
          sx={{
            bgcolor: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "inherit",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6">Редактировать фото</Typography>
              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <img
              src={photoPaths[current?.id]}
              alt={current?.title}
              style={{
                maxWidth: "100%",
                maxHeight: 300,
                objectFit: "contain",
                borderRadius: 8,
                alignSelf: "center",
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Отображение</InputLabel>
              <Select
                value={current?.aspectRatio || "4/3"}
                label="Отображение"
                onChange={(e) =>
                  setCurrent({ ...current, aspectRatio: e.target.value })
                }
              >
                <MenuItem value="4/3">Горизонтальное (4:3)</MenuItem>
                <MenuItem value="1/1">Квадрат (1:1)</MenuItem>
                <MenuItem value="3/4">Вертикальное (3:4)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Заголовок"
              value={current?.title || ""}
              onChange={(e) =>
                setCurrent({ ...current, title: e.target.value })
              }
            />
            <TextField
              label="Описание"
              multiline
              rows={3}
              value={current?.description || ""}
              onChange={(e) =>
                setCurrent({ ...current, description: e.target.value })
              }
            />
            <Autocomplete
              multiple
              options={allPeople}
              getOptionLabel={(p) =>
                `${p.id} :: ${p.firstName || ""} ${
                  p.lastName || p.maidenName || ""
                }`.trim()
              }
              value={
                allPeople.filter((p) => current?.people?.includes(p.id)) || []
              }
              onChange={(e, v) =>
                setCurrent({ ...current, people: v.map((x) => x.id) })
              }
              renderInput={(params) => (
                <TextField {...params} label="Кто на фото" />
              )}
            />
            <TextField
              label="Дата снимка (ГГГГ-ММ-ДД)"
              value={current?.datePhoto || ""}
              onChange={(e) =>
                setCurrent({ ...current, datePhoto: e.target.value })
              }
            />

            <Button variant="contained" onClick={handleSave}>
              Сохранить
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Полноэкранный просмотр */}
      <Dialog open={fullscreen} onClose={handleFullscreenClose} fullScreen>
        <DialogContent
          sx={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "#000",
            p: 0,
          }}
        >
          <IconButton
            onClick={handleFullscreenClose}
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 1000,
              color: isDark ? "#fff" : "#000",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <IconButton
            // onClick={() => setHideLabels((h) => !h)}
            onClick={handlMaximazeWindow}
            sx={{
              position: "absolute",
              top: 8,
              left: 56,
              zIndex: 1000,
              color: isDark ? "#fff" : "#000",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
            }}
          >
            {hideLabels ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1000,
              display: hideLabels ? "none" : "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "#fff",
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: "0.9rem",
            }}
          >
            <PhotoLibraryIcon />
            <Typography>{`${index} / ${quntityPhoto}`}</Typography>
          </Box>

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
              setIndex((prev) => Math.min(prev + 1, displayPhotos.length - 1))
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
            {displayPhotos.map((photo) => (
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
                    maxHeight: hideLabels ? "100%" : "90vh",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                />

                {!hideLabels && (
                  <>
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
                      {allPeople.find((p) => p.id === photo.owner)?.gender ===
                      "male"
                        ? "👤 Добавил: "
                        : "👤 Добавила: "}
                      {allPeople.find((p) => p.id === photo.owner)?.firstName ||
                        "Неизвестно"}
                      {" | "}
                      {photo?.datePhoto &&
                        `📅 ${photo?.datePhoto || "--"} |`}{" "}
                      🏷️ На фото:{" "}
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
                  </>
                )}
              </Box>
            ))}
          </SwipeableViews>
        </DialogContent>
      </Dialog>
      <PhotoMetaDialog
        openDialog={openDialog}
        meta={meta}
        onClose={() => setOpenDialog(false)}
      />
    </>
  );
}
