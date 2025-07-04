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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import SwipeableViews from "react-swipeable-views";
import { useTheme } from "@mui/material/styles";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import EditIcon from "@mui/icons-material/Edit";
import { Box } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export default function PhotoGallery({ personId, allPeople, refresh }) {
  const [photos, setPhotos] = useState([]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const [photoPaths, setPhotoPaths] = useState({});
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewMode, setViewMode] = useState("square"); // "square" или "natural"
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) setViewMode(newMode);
  };

  const handleFullscreenOpen = (photo) => {
    const i = photos.findIndex((p) => p.id === photo.id);
    setIndex(i);
    setFullscreen(true);
  };

  const handleFullscreenClose = () => {
    setFullscreen(false);
  };
  useEffect(() => {
    if (!personId) return;

    window.photoAPI.getAll(personId).then(async (data) => {
      const filtered = data.filter(
        (p) =>
          p.people.includes(Number(personId)) || p.owner === Number(personId)
      );

      const paths = {};
      for (const p of filtered) {
        paths[p.id] = await window.photoAPI.getPath(p.owner, p.filename); // ✅ исправлено
      }

      setPhotos(filtered);
      setPhotoPaths(paths);
    });
  }, [personId, refresh]);

  const handleOpen = (photo) => {
    setCurrent(photo);
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
  };

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" mb={1}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="square">Квадрат</ToggleButton>
          <ToggleButton value="natural">Пропорции</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <ImageList cols={3} gap={8}>
        {photos.map((photo) => (
          <ImageListItem
            key={photo.id}
            sx={{
              aspectRatio:
                viewMode === "square" ? "1 / 1" : photo.aspectRatio || "4 / 3",
              overflow: "hidden",
              position: "relative",
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
              onClick={() => handleFullscreenOpen(photo)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain", // 👈 сохраняем пропорции, не обрезаем
                borderRadius: 4,
              }}
            />

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // ⛔️ предотвратить открытие fullscreen
                handleOpen(photo); // ✏️ открыть редактирование
              }}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: "rgba(0,0,0,0.4)",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.6)",
                },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Удалить это фото?")) {
                  window.photoAPI.delete(personId, photo.id);
                  setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                }
              }}
              sx={{
                position: "absolute",
                bottom: 4,
                left: 4,
                backgroundColor: "rgba(255,0,0,0.4)",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "rgba(255,0,0,0.6)",
                },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ImageListItem>
        ))}
      </ImageList>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent
          sx={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
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
              loading="lazy"
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
                <MenuItem value="1/1">Квадратное (1:1)</MenuItem>
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
                `${p.firstName || ""} ${p.lastName || ""}`.trim()
              }
              value={
                allPeople.filter((p) => current?.people?.includes(p.id)) || []
              }
              onChange={(e, newValue) =>
                setCurrent({
                  ...current,
                  people: newValue.map((p) => p.id),
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Кто на фото" />
              )}
            />
            <Button variant="contained" onClick={handleSave}>
              Сохранить
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
      <Dialog open={fullscreen} onClose={handleFullscreenClose} fullScreen>
        <DialogContent
          sx={{
            p: 0,
            position: "relative",
            bgcolor: isDark ? "#000" : "#fff",
          }}
        >
          <IconButton
            onClick={handleFullscreenClose}
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
              boxShadow: isDark
                ? "0 0 4px rgba(255,255,255,0.2)"
                : "0 0 4px rgba(0,0,0,0.1)",
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>

          <IconButton
            onClick={() =>
              setIndex((prev) => Math.min(prev + 1, photos.length - 1))
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
              boxShadow: isDark
                ? "0 0 4px rgba(255,255,255,0.2)"
                : "0 0 4px rgba(0,0,0,0.1)",
            }}
          >
            <ArrowForwardIosIcon />
          </IconButton>

          <SwipeableViews
            index={index}
            onChangeIndex={setIndex}
            enableMouseEvents
          >
            {photos.map((photo) => (
              <Box
                key={photo.id}
                sx={{
                  height: "100vh",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#fff",
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
            ))}
          </SwipeableViews>
        </DialogContent>
      </Dialog>
    </>
  );
}

function appPath(filename) {
  return `${require("path").join(
    require("electron").remote.app.getPath("documents"),
    "Genealogy",
    "images",
    "photos",
    filename
  )}`;
}
