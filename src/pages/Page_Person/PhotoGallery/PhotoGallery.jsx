//PhotoGallery.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Dialog,
  Typography,
  IconButton,
  Button,
  Box,
  // useMediaQuery,
  Paper,
  Slide,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PhotoUploadDialog from "./PhotoUploadDialog";
import PhotoMetaDialog from "../../../components/PhotoMetaDialog";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

import onDownload from "../../utils/onDownload";
import PhotoFullscreenViewer from "../../../components/PhotoFullscreenViewer";
// import PhotoEditDialog from "./PhotoEditDialog";
import PhotoCell from "../../../components/PhotoCell";
import PhotoMetaUpdateDialog from "../../../components/PhotoMetaUpdateDialog";
// Анимация появления как в биографии
const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

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
  photoPaths,
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
      Math.ceil(height / rowFullHeight) + overscan * 2,
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
              fromIndex + visible * columns - 1,
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
  // Внутри функции GridByRowsNoDeps
  useEffect(() => {
    const t = setTimeout(() => {
      const { start, visible } = compute();
      if (typeof onVisibleRange === "function") {
        const fromIndex = start * columns;
        // Используем itemsLen (он объявлен в начале функции через items.length)
        const toIndex = Math.min(
          itemsLen - 1,
          fromIndex + visible * columns - 1,
        );
        try {
          onVisibleRange({ fromIndex, toIndex });
        } catch (e) {}
      }
      force();
    }, 100); // Небольшая задержка, чтобы DOM успел отрисоваться
    return () => clearTimeout(t);
  }, [compute, columns, itemsLen, onVisibleRange]);

  // render derived from scrollTopRef synchronously
  const { start, visible } = compute();

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
        </div>,
      );
    }
    rows.push(
      <div
        key={rowIndex}
        style={{ display: "flex", gap: `${columnGap}px`, width: "100%" }}
      >
        {cells}
      </div>,
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

export default function PhotoGallery({ personId, allPeople, refresh }) {
  const [openMain, setOpenMain] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // states
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });
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
  const [direction, setDirection] = useState(0); // 1 - вперед, -1 - назад
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Эффект для отслеживания изменения размера окна
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayPhotos = useMemo(() => {
    // 1. ФИЛЬТРАЦИЯ:
    // Фото проходит, если человек является владельцем ИЛИ он в списке отмеченных
    const filtered = photos.filter((p) => {
      const isOwner = String(p.owner) === String(personId);
      const isTagged = p.people && p.people.includes(personId);
      return isOwner || isTagged;
    });

    // 2. СОРТИРОВКА ПО ДАТЕ ДОБАВЛЕНИЯ (базовая)
    const arr = [...filtered].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date),
    );

    // 3. ДОПОЛНИТЕЛЬНАЯ СОРТИРОВКА (если выбрана пользователем)
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

  useEffect(() => {
    if (!personId) return;
    let mounted = true;

    // Запрашиваем ВСЕ фото, связанные с этим человеком через API
    window.photoAPI.getAll(personId).then((list) => {
      if (!mounted) return;

      // УБИРАЕМ ЖЕСТКИЙ ФИЛЬТР
      // Просто сохраняем всё, что прислал API для этого personId
      console.log(`Загружено для ${personId}: ${list.length} фото`);

      setPhotos(list);
    });

    return () => {
      mounted = false;
    };
  }, [personId, refreshPhotos]);

  // Path loader controller (queue + pending)
  const pendingRef = useRef(new Set());
  const queueRef = useRef(new Set());
  const timerRef = useRef(null);

  const setPath = useCallback((id, path, version) => {
    setPhotoPaths((prev) => ({
      ...prev,
      [version]: { ...prev[version], [id]: path },
    }));
  }, []);

  const fetchPath = useCallback(
    async (photo, version = "thumbs") => {
      if (!photo || pendingRef.current.has(`${version}-${photo.id}`)) return;

      // Проверяем наличие в конкретном буфере
      if (photoPaths[version] && photoPaths[version][photo.id]) return;

      pendingRef.current.add(`${version}-${photo.id}`);
      try {
        const requestedVersion = version === "full" ? "webp" : "thumbs";
        // ИСПОЛЬЗУЕМ photo.owner вместо personId для корректного пути к файлу
        const path = await window.photoAPI.getPath(
          photo.owner,
          photo.filename,
          requestedVersion,
        );
        if (path) {
          setPath(photo.id, path, version);
        }
      } catch (e) {
        console.error("Failed to get path", e);
      } finally {
        pendingRef.current.delete(`${version}-${photo.id}`);
      }
    },
    [photoPaths, setPath], // personId убираем из зависимостей, он тут не нужен
  );

  const handleOpen = (photo) => {
    setCurrent({ ...photo });
    setOpen(true);

    // Исправленная проверка для диалога
    if (photo && !photoPaths.full[photo.id]) {
      fetchPath(photo, "full");
    }
  };

  // 1. Сначала определяем вспомогательные функции
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

  // 2. Затем вызываем их в эффектах
  useEffect(() => {
    if (displayPhotos.length > 0) {
      const t = setTimeout(() => {
        const initial = Math.min(24, displayPhotos.length);
        for (let i = 0; i < initial; i++) {
          const p = displayPhotos[i];
          if (p && !photoPaths.thumbs[p.id] && !pendingRef.current.has(p.id)) {
            queueRef.current.add(p.id);
          }
        }
        scheduleFlush(); // Теперь функция точно существует
      }, 150);
      return () => clearTimeout(t);
    }
  }, [displayPhotos, photoPaths.thumbs, scheduleFlush]);

  // called by GridByRowsNoDeps onVisibleRange behavior: we emulate that by calling handleVisibleRange manually
  const handleVisibleRange = useCallback(
    ({ fromIndex, toIndex }) => {
      const margin = 5;
      const start = Math.max(0, fromIndex - margin);
      // ВАЖНО: используем displayPhotos здесь
      const end = Math.min(displayPhotos.length - 1, toIndex + margin);

      for (let i = start; i <= end; i++) {
        const p = displayPhotos[i];
        // Проверяем именно в thumbs
        if (p && !photoPaths.thumbs[p.id] && !pendingRef.current.has(p.id)) {
          queueRef.current.add(p.id);
        }
      }
      scheduleFlush();
    },
    [displayPhotos, photoPaths.thumbs, scheduleFlush],
  );

  // preload neighbors for fullscreen
  useEffect(() => {
    if (!fullscreen) return;

    // Ищем соседей в ОТОБРАЖАЕМОМ массиве
    const ids = [index - 1, index, index + 1].filter(
      (i) => i >= 0 && i < displayPhotos.length,
    );
    const toLoad = ids.map((i) => displayPhotos[i]).filter(Boolean);

    toLoad.forEach((p) => {
      // Используем составной ключ для pending, чтобы не блокировать thumbs
      const loadingKey = `full-${p.id}`;
      if (!photoPaths.full[p.id] && !pendingRef.current.has(loadingKey)) {
        pendingRef.current.add(loadingKey);
        window.photoAPI
          .getPath(p.owner, p.filename, "webp") // p.owner обеспечит правильный путь
          .then((path) => {
            if (path) setPath(p.id, path, "full");
          })
          .catch((e) => console.error("getPath failed", e))
          .finally(() => pendingRef.current.delete(loadingKey));
      }
    });
  }, [fullscreen, index, displayPhotos, photoPaths.full, setPath]);

  // UI handlers
  const handleFullscreenOpen = (photo) => {
    const i = displayPhotos.findIndex((p) => p.id === photo.id);
    setIndex(i >= 0 ? i : 0);
    setFullscreen(true);
  };
  const handleFullscreenClose = useCallback(async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  }, [sliderForcedFullscreen]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1 < displayPhotos.length ? prev + 1 : prev));
  }, [displayPhotos.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

  const handleClose = () => {
    setOpen(false);
    setCurrent(null);
  };

  const handlMaximazeWindow = useCallback(async () => {
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
  }, [hideLabels, sliderForcedFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreen) return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") handleFullscreenClose();
      if (e.key.toLowerCase() === "f") {
        handlMaximazeWindow();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, handleNext, handlePrev, handleFullscreenClose]);

  const currentPhotoInfo = useMemo(() => {
    const photo = displayPhotos[index];
    if (!photo) return null;

    const owner = allPeople.find((p) => p.id === photo.owner);
    const ownerText = owner
      ? `${owner.gender === "male" ? "👤 Добавил: " : "👤 Добавила: "}${owner.firstName || "Неизвестно"}`
      : "👤 Владелец не найден";

    const peopleText = (photo.people || [])
      .map((id) => {
        const person = allPeople.find((p) => p.id === id);
        return person
          ? `${person.firstName || ""} ${person.lastName || ""}`.trim()
          : `ID ${id}`;
      })
      .join(", ");

    return {
      title: photo.title,
      description: photo.description,
      ownerText,
      datePhoto: photo.datePhoto,
      peopleText,
    };
  }, [index, displayPhotos, allPeople]);

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

  // --- Layout sizes (ПЕРЕНЕСИТЕ СЮДА) ---
  // Определяем количество колонок в зависимости от ширины (адаптивность)
  const columns = useMemo(() => {
    if (windowWidth < 1500) return 4;
    if (windowWidth < 1800) return 5;
    if (windowWidth < 2100) return 6;
    return 7;
  }, [windowWidth]);

  const columnGap = 8;
  const baseWidth = Math.max(300, Math.floor(windowWidth * 0.9));
  const containerHeight = Math.max(300, window.innerHeight - 100);

  // Теперь columns определен выше, и ошибки не будет
  const rowHeight = useMemo(() => {
    return viewMode === "square"
      ? Math.floor(baseWidth / columns)
      : Math.floor((baseWidth / columns) * 1.15);
  }, [baseWidth, viewMode, columns]);

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

  return (
    <>
      {/* Кнопка-триггер */}
      <Button
        variant="outlined"
        onClick={() => setOpenMain(true)}
        startIcon={<PhotoLibraryIcon />}
        sx={{ borderRadius: "12px" }}
      >
        Фотогалерея
      </Button>

      {/* Основной диалог */}
      <Dialog
        fullScreen
        open={openMain}
        onClose={() => setOpenMain(false)}
        TransitionComponent={Transition}
      >
        {/* Шапка (стилизована под вашу биографию) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderBottom: "1px solid #444",
            position: "sticky",
            top: 0,
            bgcolor: "#2c2c2c",
            color: "white",
            zIndex: 1100,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 7,
            }}
          >
            <IconButton
              onClick={() => setOpenMain(false)}
              sx={{ color: "white" }}
            >
              <ArrowBackIosIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid",
              // borderRadius: "15px",
              borderColor: "divider",
              borderRadius: 7,
              // bgcolor: "background.paper",
              color: "text.secondary",
              "& svg": {
                m: 1,
              },
            }}
          >
            <Tooltip title="Добавить фото">
              <IconButton
                size="small"
                onClick={() => setUploadOpen(true)}
                sx={{ color: "white" }}
              >
                <AddPhotoAlternateIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Сортировать по дате">
              <IconButton
                size="small"
                onClick={() => setSortState((s) => (s + 1) % 3)}
                sx={{ color: "white" }}
              >
                <CalendarTodayIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box></Box>
        </Box>

        {/* Контент галереи */}
        <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#1e1e1e", p: 1 }}>
          <Paper
            elevation={0}
            sx={{
              maxWidth: 1,
              mx: "auto",
              p: 1,
              bgcolor: "#2c2c2c",
              borderRadius: "15px",
              border: "1px solid #333",
              minHeight: 1,
            }}
          >
            {/* Сюда вставляем вашу сетку GridByRowsNoDeps */}
            {displayPhotos.length ? (
              <>
                <Paper
                  style={{
                    width: "100%",
                    // marginBottom: 8,
                    // padding: 15,
                    borderRadius: 15,
                    position: "relative", // Обязательно для позиционирования оверлеев
                    overflow: "hidden", // Чтобы блюр не вылезал за границы скругления
                  }}
                >
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
                        path={photoPaths.thumbs[item.id]} // ОБЯЗАТЕЛЬНО .thumbs
                        onDownload={onDownload}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onOpen={onOpen}
                        rowHeight={rowHeight}
                        isDark={isDark}
                        personId={personId}
                        allPeople={allPeople}
                      />
                    )}
                  />
                </Paper>

                {/* Edit dialog */}
                <PhotoMetaUpdateDialog
                  open={open} // Используем ваш стейт открытия
                  meta={current} // Объект выбранного фото (у вас он в стейте meta)
                  onClose={handleClose} // Ваша функция закрытия
                  allPeople={allPeople} // Список людей
                  photoPaths={photoPaths} // Кеш путей
                  setPhotos={setPhotos} // Обновит список автоматически
                  setPhotoPaths={setPhotoPaths} // Сбросит кеш картинок автоматически
                  mode="personal" // Разрешаем смену папок
                />

                <PhotoFullscreenViewer
                  open={fullscreen}
                  index={index}
                  photos={displayPhotos} // ИСПРАВЛЕНО: передаем отсортированный массив
                  photoPaths={photoPaths.full}
                  thumbPaths={photoPaths.thumbs}
                  direction={direction}
                  hideLabels={hideLabels}
                  onClose={handleFullscreenClose}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onToggleMaximize={handlMaximazeWindow}
                  currentPhotoInfo={currentPhotoInfo}
                />

                <PhotoMetaDialog
                  openDialog={openDialog}
                  meta={meta}
                  onClose={() => setOpenDialog(false)}
                />
              </>
            ) : (
              <>
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  color="text.secondary"
                  sx={{ mt: 20 }}
                >
                  <AddPhotoAlternateIcon
                    sx={{ fontSize: 64, mb: 2, color: "lightgray" }}
                  />
                  <Typography variant="h6">Фотогалерея пуста</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Добавьте фотографию, чтобы она появилась здесь.
                  </Typography>
                  <Button
                    sx={{ borderRadius: "12px" }}
                    variant="contained"
                    startIcon={<AddPhotoAlternateIcon />}
                    onClick={() => setUploadOpen(true)}
                  >
                    Загрузить фото
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Box>

        {/* Вспомогательные модалки (загрузка, просмотр) */}
        <PhotoUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          personId={personId}
          currentUserId={personId}
          onPhotoAdded={() => setRefreshPhotos((r) => r + 1)}
        />
      </Dialog>
    </>
  );
}
