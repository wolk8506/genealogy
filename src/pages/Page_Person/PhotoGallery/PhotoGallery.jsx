import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  Stack,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
  DialogActions,
  Paper,
  ButtonGroup,
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
import PhotoUploadDialog from "./PhotoUploadDialog";
import PhotoMetaDialog from "../../../components/PhotoMetaDialog";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SwipeableViews from "react-swipeable-views";

import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";
import NameSection from "../../../components/NameSection";

const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

// -------------------- GridByRowsNoDeps: lightweight row-based virtualizer --------------------
function GridByRowsNoDeps({
  items,
  columns,
  rowHeight,
  height,
  columnGap = 8,
  overscan = 3,
  renderCell,
  onVisibleRange,
}) {
  const containerRef = useRef(null);
  const rAFRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [, force] = React.useReducer((s) => s + 1, 0);

  const itemsLen = items?.length || 0;
  const rowCount = Math.ceil(itemsLen / columns);
  const rowFullHeight = rowHeight + columnGap;

  const compute = useCallback(() => {
    const st = scrollTopRef.current || 0;
    const start = Math.max(0, Math.floor(st / rowFullHeight) - overscan);
    const visible = Math.min(
      rowCount - start,
      Math.ceil(height / rowFullHeight) + overscan * 2
    );
    return { start, visible };
  }, [rowFullHeight, overscan, rowCount, height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = (e) => {
      scrollTopRef.current = e.currentTarget.scrollTop;
      if (rAFRef.current === null) {
        rAFRef.current = requestAnimationFrame(() => {
          rAFRef.current = null;
          // compute visible window
          const { start, visible } = compute();
          // notify parent to enqueue prefetch
          if (typeof onVisibleRange === "function") {
            const fromIndex = start * columns;
            const toIndex = Math.min(
              itemsLen - 1,
              fromIndex + visible * columns - 1
            );
            try {
              onVisibleRange({ fromIndex, toIndex });
            } catch (e) {
              /* swallow */
            }
          }
          force();
        });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [compute, columns, itemsLen, onVisibleRange]);

  // initial tick to render viewport and notify loader
  useEffect(() => {
    const t = setTimeout(() => {
      const { start, visible } = compute();
      if (typeof onVisibleRange === "function") {
        const fromIndex = start * columns;
        const toIndex = Math.min(
          itemsLen - 1,
          fromIndex + visible * columns - 1
        );
        try {
          onVisibleRange({ fromIndex, toIndex });
        } catch (e) {}
      }
      force();
    }, 20);
    return () => clearTimeout(t);
  }, [compute, columns, itemsLen, onVisibleRange]);

  // render derived from scrollTopRef synchronously
  const { start, visible } = compute();
  const startIndex = start * columns;
  const endIndex = Math.min(itemsLen - 1, startIndex + visible * columns - 1);
  const totalHeight = rowCount * rowFullHeight;
  const translateY = start * rowFullHeight;
  const cellWidth = `${100 / columns}%`;

  const rows = [];
  for (let r = 0; r < visible; r++) {
    const rowIndex = start + r;
    const cells = [];
    for (let c = 0; c < columns; c++) {
      const idx = rowIndex * columns + c;
      const item = items[idx];
      cells.push(
        <div
          key={idx}
          style={{
            width: cellWidth,
            height: rowHeight,
            boxSizing: "border-box",
          }}
        >
          {item ? (
            renderCell(item, idx)
          ) : (
            <div style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      );
    }
    rows.push(
      <div
        key={rowIndex}
        style={{ display: "flex", gap: `${columnGap}px`, width: "100%" }}
      >
        {cells}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, overflowY: "auto", position: "relative" }}
    >
      <div style={{ height: totalHeight, width: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${columnGap}px`,
          }}
        >
          {rows}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

// Pure Photo cell (stateless, no side-effects)
function PhotoCell({
  photo,
  path,
  onDownload,
  onEdit,
  onDelete,
  onOpen,
  rowHeight,
  isDark,
  personId,
}) {
  return (
    <div
      onClick={() => onOpen(photo)}
      onContextMenu={(e) => {
        e.preventDefault();
        window.contextAPI?.showPhotoMenu?.(
          photo,
          { x: e.clientX, y: e.clientY },
          "full",
          personId
        );
      }}
      style={{
        width: "100%",
        height: rowHeight,
        borderRadius: 8,
        overflow: "hidden",
        background: isDark ? "#1e1e1e" : "#f0f0f0",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {path ? (
        <img
          src={path}
          alt={photo.title}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "gray",
          }}
        >
          Загрузка...
        </div>
      )}

      <div style={{ position: "absolute", top: 6, left: 6, zIndex: 10 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(photo);
          }}
          sx={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff", p: 0.6 }}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </div>

      <div style={{ position: "absolute", top: 6, right: 6, zIndex: 10 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(photo);
          }}
          sx={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff", p: 0.6 }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </div>

      {personId === photo.owner && (
        <div style={{ position: "absolute", bottom: 6, left: 6, zIndex: 10 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(photo);
            }}
            sx={{ backgroundColor: "rgba(255,0,0,0.4)", color: "#fff", p: 0.6 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 6,
          right: 6,
          zIndex: 10,
          backgroundColor: "rgba(0,0,0,0.4)",
          color: "orange",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 12,
        }}
      >
        <CalendarTodayIcon
          sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.3 }}
        />
        {photo.datePhoto || "—"}
      </div>
    </div>
  );
}

export default function PhotoGallery({ personId, allPeople, refresh }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));

  // states
  // const [date, setDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({});
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState("square");
  const [hideLabels, setHideLabels] = useState(false);
  const [sortState, setSortState] = useState(0);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  // load metadata
  useEffect(() => {
    if (!personId) return;
    let mounted = true;
    window.photoAPI.getAll(personId).then((list) => {
      if (!mounted) return;
      const filtered = list.filter(
        (p) =>
          p.owner === Number(personId) ||
          (p.people || []).includes(Number(personId))
      );
      setPhotos(filtered);
    });
    return () => {
      mounted = false;
    };
  }, [personId, refreshPhotos]);

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

  const peopleMap = useMemo(() => {
    const m = new Map();
    (allPeople || []).forEach((p) => {
      const name =
        `${p.firstName || ""} ${p.lastName || p.maidenName || ""}`.trim() ||
        "Неизвестно";
      m.set(p.id, name);
    });
    return m;
  }, [allPeople]);

  // Path loader controller (queue + pending)
  const pendingRef = useRef(new Set());
  const queueRef = useRef(new Set());
  const timerRef = useRef(null);

  const setPathIfNotExists = useCallback((id, p) => {
    setPhotoPaths((prev) => (prev[id] ? prev : { ...prev, [id]: p }));
  }, []);

  const fetchPath = useCallback(
    async (photo) => {
      if (!photo) return null;
      if (photoPaths[photo.id]) return photoPaths[photo.id];
      if (pendingRef.current.has(photo.id)) return null;
      pendingRef.current.add(photo.id);
      try {
        const path = await window.photoAPI.getPath(photo.owner, photo.filename);
        setPathIfNotExists(photo.id, path);
        return path;
      } catch (e) {
        console.error("getPath failed", e);
        return null;
      } finally {
        pendingRef.current.delete(photo.id);
      }
    },
    [photoPaths, setPathIfNotExists]
  );

  const flushQueue = useCallback(async () => {
    const ids = Array.from(queueRef.current);
    if (!ids.length) return;
    queueRef.current.clear();
    const toFetch = ids
      .map((id) => displayPhotos.find((p) => p.id === id))
      .filter(Boolean);
    await Promise.allSettled(toFetch.map((p) => fetchPath(p)));
  }, [displayPhotos, fetchPath]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushQueue();
    }, 80);
  }, [flushQueue]);

  // called by GridByRowsNoDeps onVisibleRange behavior: we emulate that by calling handleVisibleRange manually
  const handleVisibleRange = useCallback(
    ({ fromIndex, toIndex }) => {
      const margin = 8;
      const start = Math.max(0, fromIndex - margin);
      const end = Math.min(displayPhotos.length - 1, toIndex + margin);
      for (let i = start; i <= end; i++) {
        const p = displayPhotos[i];
        if (!p) continue;
        if (photoPaths[p.id]) continue;
        if (pendingRef.current.has(p.id)) continue;
        queueRef.current.add(p.id);
      }
      scheduleFlush();
    },
    [displayPhotos, photoPaths, scheduleFlush]
  );

  // preload neighbors for fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const ids = [index - 1, index, index + 1].filter(
      (i) => i >= 0 && i < displayPhotos.length
    );
    const toLoad = ids.map((i) => displayPhotos[i]).filter(Boolean);
    toLoad.forEach((p) => {
      if (!p) return;
      if (!photoPaths[p.id] && !pendingRef.current.has(p.id)) {
        pendingRef.current.add(p.id);
        window.photoAPI
          .getPath(p.owner, p.filename)
          .then((path) => setPathIfNotExists(p.id, path))
          .catch((e) => console.error("getPath failed", e))
          .finally(() => pendingRef.current.delete(p.id));
      }
    });
  }, [fullscreen, index, displayPhotos, photoPaths, setPathIfNotExists]);

  // initial small prefetch so first viewport is fast
  useEffect(() => {
    const t = setTimeout(() => {
      const initial = Math.min(24, displayPhotos.length);
      for (let i = 0; i < initial; i++) {
        const p = displayPhotos[i];
        if (p && !photoPaths[p.id]) queueRef.current.add(p.id);
      }
      scheduleFlush();
    }, 40);
    return () => clearTimeout(t);
  }, [displayPhotos, photoPaths, scheduleFlush]);

  // UI handlers
  const handleFullscreenOpen = (photo) => {
    const i = displayPhotos.findIndex((p) => p.id === photo.id);
    setIndex(i >= 0 ? i : 0);
    setFullscreen(true);
  };
  const handleFullscreenClose = async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  };

  const handleOpen = (photo) => {
    setCurrent({ ...photo });
    setOpen(true);
    // priority prefetch for dialog preview
    if (photo && !photoPaths[photo.id] && !pendingRef.current.has(photo.id)) {
      pendingRef.current.add(photo.id);
      window.photoAPI
        .getPath(photo.owner, photo.filename)
        .then((p) => setPathIfNotExists(photo.id, p))
        .catch((e) => console.error("getPath failed", e))
        .finally(() => pendingRef.current.delete(photo.id));
    }
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
      if (!alreadyFullscreen) {
        await window.windowAPI.setFullscreen(true);
        setSliderForcedFullscreen(true);
      }
    } else {
      if (sliderForcedFullscreen) {
        await window.windowAPI.setFullscreen(false);
        setSliderForcedFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreen) return;
      if (e.key === "ArrowLeft") setIndex((p) => Math.max(p - 1, 0));
      if (e.key === "ArrowRight")
        setIndex((p) => Math.min(p + 1, displayPhotos.length - 1));
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, displayPhotos.length]);

  // IPC context menu listeners
  useEffect(() => {
    const { ipcRenderer } = window.electron || {};
    if (!ipcRenderer) return;
    ipcRenderer.removeAllListeners?.("photo:download");
    ipcRenderer.removeAllListeners?.("photo:open");
    ipcRenderer.removeAllListeners?.("photo:delete");
    ipcRenderer.removeAllListeners?.("photo:meta-response");

    ipcRenderer.on("photo:download", (_, photo) => {
      ipcRenderer.send("photo:download", photo);
    });
    ipcRenderer.on("photo:open", (_, id) => handleOpen(id));
    ipcRenderer.on("photo:delete", (_, id) => {
      if (confirm("Удалить фото?")) {
        window.photoAPI.delete(personId, id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    });
    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      setMeta(receivedMeta);
      setOpenDialog(true);
    });

    return () => {
      ipcRenderer.removeAllListeners?.("photo:download");
      ipcRenderer.removeAllListeners?.("photo:open");
      ipcRenderer.removeAllListeners?.("photo:delete");
      ipcRenderer.removeAllListeners?.("photo:meta-response");
    };
  }, [personId]);

  const quntityPhoto = displayPhotos?.length;

  // sizing
  const columns = isSmall ? 3 : 4;
  const columnGap = 8;
  const containerHeight = Math.max(300, window.innerHeight - 220);
  const baseWidth = Math.max(300, Math.floor(window.innerWidth * 0.9));
  const rowHeight =
    viewMode === "square"
      ? Math.floor(baseWidth / columns)
      : Math.floor((baseWidth / columns) * 1.15);

  // actions
  const onDownload = (photo) =>
    window.electron?.ipcRenderer.send("photo:download", photo);
  const onEdit = (photo) => handleOpen(photo);
  const onDelete = (photo) => {
    if (confirm("Удалить фото?")) {
      window.photoAPI.delete(personId, photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setPhotoPaths((prev) => {
        const copy = { ...prev };
        delete copy[photo.id];
        return copy;
      });
    }
  };
  const onOpen = (photo) => handleFullscreenOpen(photo);

  if (!displayPhotos.length) {
    return (
      <>
        <NameSection title="Фотогалерея" icon={PhotoLibraryIcon} />
        <Stack direction="row" gap={1} justifyContent="flex-end" mb={1}>
          <Button
            startIcon={<AddPhotoAlternateIcon />}
            variant="outlined"
            onClick={() => setUploadOpen(true)}
          >
            Добавить фото
          </Button>
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
      <NameSection title="Фотогалерея" icon={PhotoLibraryIcon} />
      <Box
        display="flex"
        gap={1}
        justifyContent="flex-end"
        sx={{ width: "100%", mb: 2 }}
      >
        <Button
          startIcon={<AddPhotoAlternateIcon />}
          variant="outlined"
          onClick={() => setUploadOpen(true)}
        >
          Добавить фото
        </Button>
        <Button
          startIcon={<CalendarTodayIcon />}
          variant="outlined"
          onClick={() => setSortState((s) => (s + 1) % 3)}
        >
          Сортировать по дате
        </Button>
        <ToggleButtonGroup
          value={viewMode}
          size="small"
          onChange={(e, v) => v && setViewMode(v)}
        >
          <ToggleButton value="square">Квадрат</ToggleButton>
          <ToggleButton value="natural">Пропорции</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <PhotoUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        personId={personId}
        currentUserId={personId}
        onPhotoAdded={() => setRefreshPhotos((r) => r + 1)}
      />

      <Paper
        style={{
          width: "100%",
          marginBottom: 8,
          padding: 15,
          borderRadius: 15,
          position: "relative", // Обязательно для позиционирования оверлеев
          overflow: "hidden", // Чтобы блюр не вылезал за границы скругления
        }}
      >
        {/* Верхний блюр */}
        <div
          style={{
            position: "absolute",
            top: 15, // Учитываем padding родителя (Paper padding=15)
            left: 15,
            right: 15,
            height: 8, // Высота зоны размытия
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0))", // Опционально: легкий градиент
            backdropFilter: "blur(6px)", // Само размытие
            zIndex: 2,
            pointerEvents: "none", // ВАЖНО: чтобы клики и скролл проходили сквозь блюр
            // borderTopLeftRadius: 15, // Если нужно совпадение с Paper
            // borderTopRightRadius: 15,
          }}
        />

        <GridByRowsNoDeps
          items={displayPhotos}
          columns={columns}
          rowHeight={rowHeight}
          height={containerHeight}
          columnGap={columnGap}
          overscan={3}
          onVisibleRange={handleVisibleRange}
          renderCell={(item, idx) => (
            <PhotoCell
              key={item.id}
              photo={item}
              path={photoPaths[item.id]}
              onDownload={onDownload}
              onEdit={onEdit}
              onDelete={onDelete}
              onOpen={onOpen}
              rowHeight={rowHeight}
              isDark={isDark}
              personId={personId}
            />
          )}
        />

        {/* Нижний блюр */}
        <div
          style={{
            position: "absolute",
            bottom: 15, // Учитываем padding родителя
            left: 15,
            right: 15,
            height: 8,
            background:
              "linear-gradient(to top, rgba(255,255,255,0.5), rgba(255,255,255,0))",
            backdropFilter: "blur(6px)",
            zIndex: 2,
            pointerEvents: "none", // ВАЖНО
            // borderBottomLeftRadius: 15,
            // borderBottomRightRadius: 15,
          }}
        />
      </Paper>

      {/* Edit dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "15px",
          },
        }}
      >
        <DialogContent
          sx={{
            // bgcolor: isDark ? "#1e1e1e" : "#fff",
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
              onClick={() => setDatePickerOpen(true)}
              size="small"
              fullWidth
              placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ"
              InputProps={{ readOnly: true }}
            />
            <CustomDatePickerDialog
              open={datePickerOpen}
              onClose={() => setDatePickerOpen(false)}
              initialDate={current?.datePhoto}
              format="YYYY-MM-DD" // или  "DD.MM.YYYY"
              showTime={true} // включить выбор времени
              onSave={(newDate) => {
                setCurrent({ ...current, datePhoto: newDate });
                setDatePickerOpen(false);
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px" }}>
          <Button onClick={handleClose}> Отмена</Button>
          <Button variant="contained" onClick={handleSave}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen */}
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
            }}
          >
            <CloseIcon />
          </IconButton>

          <IconButton
            onClick={handlMaximazeWindow}
            sx={{
              position: "absolute",
              top: 8,
              left: 56,
              zIndex: 1000,
              color: isDark ? "#fff" : "#000",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
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
            <Typography>{`${index + 1} / ${quntityPhoto}`}</Typography>
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
              zIndex: 10,
              borderRadius: "50%",
            }}
          >
            <ArrowForwardIosIcon />
          </IconButton>

          <SwipeableViews
            index={index}
            onChangeIndex={(i) => setIndex(i)}
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
                      sx={{ color: isDark ? "#fff" : "#000" }}
                    >
                      {allPeople.find((p) => p.id === photo.owner)?.gender ===
                      "male"
                        ? "👤 Добавил: "
                        : "👤 Добавила: "}
                      {allPeople.find((p) => p.id === photo.owner)?.firstName ||
                        "Неизвестно"}{" "}
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
