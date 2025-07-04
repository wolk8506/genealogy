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
  CircularProgress,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SwipeableViews from "react-swipeable-views";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";

export default function GlobalPhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({});
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewMode, setViewMode] = useState("square");
  const [search, setSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [groupBy, setGroupBy] = useState("none");
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      setAllPeople(data || []);
    });
  }, []);

  useEffect(() => {
    window.photoAPI.getAllGlobal().then(async (data) => {
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      const paths = {};
      for (const p of data) {
        paths[p.id] = await window.photoAPI.getPath(p.owner, p.filename);
      }
      setPhotos(data);
      setPhotoPaths(paths);
    });
  }, []);

  const handleFullscreenOpen = (i) => {
    setIndex(i);
    setFullscreen(true);
  };

  const filteredPhotos = photos.filter((photo) => {
    const textMatch =
      photo.title?.toLowerCase().includes(search.toLowerCase()) ||
      photo.description?.toLowerCase().includes(search.toLowerCase());

    const peopleMatch =
      selectedPeople.length === 0 ||
      selectedPeople.some((p) =>
        [photo.owner, ...(photo.people || [])].includes(p.id)
      );

    return textMatch && peopleMatch;
  });

  const groupedPhotos = (() => {
    if (groupBy === "owner") {
      return allPeople
        .map((person) => ({
          label: `${person.firstName} ${person.lastName}`,
          items: filteredPhotos.filter((p) => p.owner === person.id),
        }))
        .filter((g) => g.items.length > 0);
    }

    if (groupBy === "date") {
      const groups = {};
      for (const photo of filteredPhotos) {
        const date = photo.date?.split("T")[0] || "Без даты";
        if (!groups[date]) groups[date] = [];
        groups[date].push(photo);
      }
      return Object.entries(groups).map(([label, items]) => ({
        label,
        items,
      }));
    }

    return [{ label: null, items: filteredPhotos }];
  })();

  const availablePeople = allPeople.filter((person) =>
    filteredPhotos.some(
      (photo) =>
        photo.owner === person.id || (photo.people || []).includes(person.id)
    )
  );

  if (!allPeople.length) return <CircularProgress />;

  return (
    <>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          label="Поиск по заголовку или описанию"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
        />
        <Autocomplete
          multiple
          options={availablePeople}
          getOptionLabel={(p) =>
            `${p.firstName || ""} ${p.lastName || ""}`.trim()
          }
          value={selectedPeople}
          onChange={(e, newValue) => setSelectedPeople(newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Фильтр по людям" size="small" />
          )}
          sx={{ minWidth: 300 }}
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="square">Квадрат</ToggleButton>
          <ToggleButton value="natural">Пропорции</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Группировка</InputLabel>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            label="Группировка"
          >
            <MenuItem value="none">Без группировки</MenuItem>
            <MenuItem value="owner">По владельцу</MenuItem>
            <MenuItem value="date">По дате</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          onClick={() => window.photoExport.exportZip(filteredPhotos)}
        >
          📦 Скачать ZIP
        </Button>
        <Button
          variant="outlined"
          onClick={() => window.photoExport.exportPDF(filteredPhotos)}
        >
          🖨️ Экспорт в PDF
        </Button>
      </Stack>

      {groupedPhotos.map((group, gi) => (
        <Box key={gi} sx={{ mb: 4 }}>
          {group.label && (
            <Typography variant="h6" sx={{ mb: 1 }}>
              {group.label}
            </Typography>
          )}
          <ImageList cols={3} gap={8}>
            {group.items.map((photo) => {
              const i = filteredPhotos.findIndex((p) => p.id === photo.id);
              return (
                <ImageListItem
                  key={photo.id}
                  sx={{
                    aspectRatio:
                      viewMode === "square"
                        ? "1 / 1"
                        : photo.aspectRatio || "4 / 3",
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
                    onClick={() => handleFullscreenOpen(i)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      borderRadius: 4,
                    }}
                  />
                </ImageListItem>
              );
            })}
          </ImageList>
        </Box>
      ))}

      <Dialog open={fullscreen} onClose={() => setFullscreen(false)} fullScreen>
        <DialogContent
          sx={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            color: isDark ? "#fff" : "inherit",
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
              boxShadow: isDark
                ? "0 0 4px rgba(255,255,255,0.2)"
                : "0 0 4px rgba(0,0,0,0.1)",
            }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>

          <IconButton
            onClick={() =>
              setIndex((prev) => Math.min(prev + 1, filteredPhotos.length - 1))
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
            {filteredPhotos.map((photo) => (
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
