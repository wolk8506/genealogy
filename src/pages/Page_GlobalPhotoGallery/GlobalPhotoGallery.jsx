// GlobalPhotoGallery.jsx
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
  ImageListItem,
  IconButton,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  Paper,
  Chip,
  Fab,
  Zoom,
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
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PhotoMetaDialog from "../../components/PhotoMetaDialog";
import PhotoMetaUpdateDialog from "./PhotoMetaUpdateDialog";

// normalize datePhoto -> timestamp or null
const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

// -------------------- GridByRowsNoDeps --------------------
function GridByRowsNoDeps({
  items = [],
  columns = 4,
  rowHeight = 200,
  height = 600,
  columnGap = 8,
  overscan = 3,
  renderCell,
  onVisibleRange,
}) {
  const containerRef = useRef(null);
  const rAFRef = useRef(null);
  const scrollTopRef = useRef(0);
  const [, force] = React.useReducer((s) => s + 1, 0);
  const itemsLen = items.length;
  const rowCount = Math.max(1, Math.ceil(itemsLen / columns));
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
          const { start, visible } = compute();
          if (typeof onVisibleRange === "function") {
            const fromIndex = start * columns;
            const toIndex = Math.min(
              itemsLen - 1,
              fromIndex + visible * columns - 1,
            );
            try {
              onVisibleRange({ fromIndex, toIndex });
            } catch {}
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

  useEffect(() => {
    const t = setTimeout(() => {
      const { start, visible } = compute();
      if (typeof onVisibleRange === "function") {
        const fromIndex = start * columns;
        const toIndex = Math.min(
          itemsLen - 1,
          fromIndex + visible * columns - 1,
        );
        try {
          onVisibleRange({ fromIndex, toIndex });
        } catch {}
      }
      force();
    }, 20);
    return () => clearTimeout(t);
  }, [compute, columns, itemsLen, onVisibleRange]);

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
        <div key={idx} style={{ width: cellWidth, height: rowHeight }}>
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
export default function GlobalPhotoGallery() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // --- State ---
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({});
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [viewMode, setViewMode] = useState("square");
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogUpdate, setOpenDialogUpdate] = useState(false);

  const [editingPhoto, setEditingPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- Refs ---
  const pendingRef = useRef(new Set());
  const queueRef = useRef(new Set());
  const timerRef = useRef(null);

  // --- Derived values (must be BEFORE any usage) ---
  const filtered = useMemo(() => {
    return photos.filter((p) => {
      const txt = `${p.title || ""} ${p.description || ""}`.toLowerCase();
      const okText = txt.includes(search.toLowerCase());
      const okPeople =
        !selectedPeople.length ||
        selectedPeople.some((sp) =>
          [p.owner, ...(p.people || [])].includes(sp.id),
        );
      return okText && okPeople;
    });
  }, [photos, search, selectedPeople]);

  const stats = useMemo(() => {
    const total = photos.length;
    const owners = new Set(photos.map((p) => p.owner)).size;
    const dates = photos
      .map((p) => normalizePhotoDate(p.datePhoto))
      .filter((t) => t != null)
      .sort((a, b) => a - b);
    const earliest = dates[0] && new Date(dates[0]).getFullYear();
    const latest =
      dates[dates.length - 1] &&
      new Date(dates[dates.length - 1]).getFullYear();
    return { total, owners, earliest, latest };
  }, [photos]);

  const sortedList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ka =
        sortBy === "date"
          ? Date.parse(a.date)
          : normalizePhotoDate(a.datePhoto);
      const kb =
        sortBy === "date"
          ? Date.parse(b.date)
          : normalizePhotoDate(b.datePhoto);
      if (ka === kb) return 0;
      if (ka == null) return 1;
      if (kb == null) return -1;
      return sortDir === "asc" ? ka - kb : kb - ka;
    });
  }, [filtered, sortBy, sortDir]);

  const getOwnerKey = useCallback(
    (ownerId) => {
      const u = allPeople.find((x) => x.id === ownerId);
      if (!u) return "\uffff";
      let last = u.lastName?.trim();
      if (!last && u.maidenName)
        last = u.maidenName.replace(/[()]/g, "").trim();
      if (!last) return "\uffff";
      const first = u.firstName?.trim() || "";
      return (last + " " + first).toLowerCase();
    },
    [allPeople],
  );

  const grouped = useMemo(() => {
    if (groupBy === "owner") {
      const owners = allPeople
        .filter((u) => sortedList.some((p) => p.owner === u.id))
        .sort((a, b) => getOwnerKey(a.id).localeCompare(getOwnerKey(b.id)));
      return owners.map((u) => ({
        label:
          getOwnerKey(u.id) === "\uffff"
            ? "(Без фамилии)"
            : `${u.lastName || u.maidenName?.replace(/[()]/g, "") || ""} ${
                u.firstName || ""
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
    if (groupBy === "datePhoto") {
      const map = {};
      for (const p of sortedList) {
        const d = p.datePhoto?.split("T")[0] || "Без даты";
        map[d] = map[d] || [];
        map[d].push(p);
      }
      return Object.entries(map)
        .sort(([da], [db]) => {
          if (da === "Без даты") return 1;
          if (db === "Без даты") return -1;
          return da > db ? -1 : da < db ? 1 : 0;
        })
        .map(([label, items]) => ({ label, items }));
    }
    return [{ label: null, items: sortedList }];
  }, [groupBy, allPeople, sortedList, getOwnerKey]);

  const availablePeople = useMemo(
    () =>
      allPeople.filter((u) =>
        filtered.some(
          (p) => p.owner === u.id || (p.people || []).includes(u.id),
        ),
      ),
    [allPeople, filtered],
  );

  // --- Callbacks (safe: they use derived values declared above) ---
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
    [photoPaths, setPathIfNotExists],
  );

  const flushQueue = useCallback(async () => {
    const ids = Array.from(queueRef.current);
    if (!ids.length) return;
    queueRef.current.clear();
    const toFetch = ids
      .map((id) => photos.find((p) => p.id === id))
      .filter(Boolean);
    await Promise.allSettled(toFetch.map((p) => fetchPath(p)));
  }, [photos, fetchPath]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushQueue();
    }, 80);
  }, [flushQueue]);

  const handleVisibleRange = useCallback(
    ({ fromIndex, toIndex }) => {
      const margin = 8;
      const start = Math.max(0, fromIndex - margin);
      const end = Math.min(sortedList.length - 1, toIndex + margin);
      for (let i = start; i <= end; i++) {
        const p = sortedList[i];
        if (!p) continue;
        if (photoPaths[p.id]) continue;
        if (pendingRef.current.has(p.id)) continue;
        queueRef.current.add(p.id);
      }
      scheduleFlush();
    },
    [sortedList, photoPaths, scheduleFlush],
  );

  const openEditDialog = useCallback((photo) => {
    // console.log("openEditDialog", photo);
    if (!photo) return;
    setEditingPhoto(photo);
    setMeta({
      id: photo.id,
      title: photo.title || "",
      description: photo.description || "",
      datePhoto: photo.datePhoto || "",
      owner: photo.owner,
      people: photo.people ? [...photo.people] : [],
      filename: photo.filename,
      aspectRatio: photo.aspectRatio || "",
    });
    setOpenDialogUpdate(true);
  }, []);

  const handleDelete = useCallback(async (photo) => {
    console.log("photo", photo);
    if (!photo) return;
    if (!confirm("Удалить фото?")) return;

    setSaving(true); // опционально: показать индикатор, если есть
    try {
      const owner = photo.owner;
      const filename = photo.filename;

      // 1) Попытка удалить файл на диске (несколько вариантов API)
      let fileDeleted = false;
      try {
        // prefer explicit deleteFile(owner, filename)
        if (window.fileAPI?.deleteFile) {
          await window.fileAPI.deleteFile(owner, filename);
          fileDeleted = true;
        } else if (window.fileAPI?.moveToTrash) {
          // если есть moveToTrash(owner, filename)
          await window.fileAPI.moveToTrash(owner, filename);
          fileDeleted = true;
        } else if (window.fileAPI?.moveFile) {
          // fallback: переместить в специальную папку trash (если у вас такая логика)
          // здесь 'trash' — пример; замените на реальную папку, если нужно
          try {
            await window.fileAPI.moveFile(owner, "trash", filename, filename);
            fileDeleted = true;
          } catch (e) {
            // ignore, попробуем другие варианты ниже
          }
        }
      } catch (fileErr) {
        console.warn("file delete failed", fileErr);
        // не прерываем — попробуем удалить JSON и обновить UI
      }

      // 2) Удалить запись через photoAPI (глобально)
      // В коде IPC вызывался window.photoAPI.delete(id) — используйте реальную сигнатуру
      try {
        if (window.photoAPI?.delete?.length === 1) {
          // если delete(id)
          await window.photoAPI.delete(photo.id);
        } else if (window.photoAPI?.delete?.length === 2) {
          // если delete(owner, id)
          await window.photoAPI.delete(owner, photo.id);
        } else {
          // универсальный вызов: попробуем оба варианта
          try {
            await window.photoAPI.delete(photo.id);
          } catch (e) {}
          try {
            await window.photoAPI.delete(owner, photo.id);
          } catch (e) {}
        }
      } catch (apiErr) {
        console.warn("photoAPI.delete failed", apiErr);
        // продолжаем — ниже удалим из локального стейта
      }

      // 3) Попытка удалить запись из owner JSON (если photoAPI.delete не делает этого)
      try {
        if (window.photoAPI?.removeFromOwnerJson) {
          await window.photoAPI.removeFromOwnerJson(owner, {
            filename,
            id: photo.id,
          });
        }
      } catch (remErr) {
        console.warn("removeFromOwnerJson warning", remErr);
      }

      // 4) Обновить локальный стейт и кэш путей
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setPhotoPaths((prev) => {
        const copy = { ...prev };
        delete copy[photo.id];
        return copy;
      });

      // 5) Если файл не удалился и есть fallback-логика (например, удаление через electron ipc)
      if (!fileDeleted && window.electron?.ipcRenderer) {
        try {
          window.electron.ipcRenderer.send("photo:delete-file", {
            owner,
            filename,
            id: photo.id,
          });
        } catch (e) {
          console.warn("ipc delete-file send failed", e);
        }
      }
    } catch (e) {
      console.error("Failed to delete photo", e);
      alert("Не удалось удалить фото: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }, []);

  const handleMetaSave = useCallback(
    async (updatedMeta) => {
      if (!editingPhoto) return;
      setSaving(true);
      try {
        const oldOwner = editingPhoto.owner;
        const newOwner = updatedMeta.owner ?? oldOwner;
        const oldFilename = editingPhoto.filename;
        const newFilename = updatedMeta.filename ?? oldFilename;
        const ownerChanged = String(newOwner) !== String(oldOwner);
        const filenameChanged = String(newFilename) !== String(oldFilename);

        // 1) если переименование и файл не перемещается — переименовать на месте
        if (!ownerChanged && filenameChanged) {
          // переименование в той же папке
          await window.fileAPI.renameFile?.(oldOwner, oldFilename, newFilename);
        }

        // 2) если сменился владелец — переместить (и при необходимости переименовать в процессе)
        if (ownerChanged) {
          // если одновременно переименование — передаём новое имя в moveFile
          await window.fileAPI.moveFile(
            oldOwner,
            newOwner,
            oldFilename,
            newFilename,
          );
        }

        // 3) обновить JSON: удалить у старого владельца
        try {
          await window.photoAPI.removeFromOwnerJson(oldOwner, {
            filename: oldFilename,
            id: editingPhoto.id,
          });
        } catch (remErr) {
          console.warn("removeFromOwnerJson warning", remErr);
        }

        // 4) добавить/обновить запись у нового владельца
        const newEntry = {
          ...editingPhoto,
          ...updatedMeta,
          owner: newOwner,
          filename: newFilename,
        };
        await window.photoAPI.addOrUpdateOwnerJson(newOwner, newEntry);

        // 5) обновить локальный стейт photos
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === editingPhoto.id ? { ...p, ...newEntry } : p,
          ),
        );

        // 6) сбросить кеш пути (если имя или владелец изменились)
        setPhotoPaths((prev) => {
          const copy = { ...prev };
          delete copy[editingPhoto.id];
          return copy;
        });
      } catch (e) {
        console.error("Failed to save photo meta", e);
        alert("Не удалось сохранить метаданные: " + (e.message || e));
      } finally {
        setSaving(false);
        setOpenDialogUpdate(false);
        setEditingPhoto(null);
      }
    },
    [editingPhoto],
  );

  const handleMetaClose = useCallback(() => {
    setOpenDialogUpdate(false);
    setEditingPhoto(null);
  }, []);

  const makeHandleVisibleRangeForGroup = useCallback(
    (itemsArray) =>
      ({ fromIndex, toIndex }) => {
        const margin = 8;
        const start = Math.max(0, fromIndex - margin);
        const end = Math.min(itemsArray.length - 1, toIndex + margin);
        for (let i = start; i <= end; i++) {
          const p = itemsArray[i];
          if (!p) continue;
          if (photoPaths[p.id]) continue;
          if (pendingRef.current.has(p.id)) continue;
          queueRef.current.add(p.id);
        }
        scheduleFlush();
      },
    [photoPaths, scheduleFlush],
  );

  // --- Effects (safe: they can use sortedList now) ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [people, list] = await Promise.all([
          window.peopleAPI.getAll(),
          window.photoAPI.getAllGlobal(),
        ]);
        if (!mounted) return;
        setAllPeople(people || []);
        setPhotos(list || []);

        const initialCount = Math.min(24, (list || []).length);
        const paths = {};
        for (let i = 0; i < initialCount; i++) {
          const p = list[i];
          try {
            paths[p.id] = await window.photoAPI.getPath(p.owner, p.filename);
          } catch {}
        }
        setPhotoPaths((prev) => ({ ...paths, ...prev }));
      } catch (e) {
        console.error("data load failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fullscreen) setHideLabels(false);
  }, [fullscreen]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

    ipcRenderer.on("photo:open", (_, id) => {
      openEditDialog(id);
    });

    ipcRenderer.on("photo:delete", (_, photo) => {
      handleDelete(photo);
    });

    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      if (receivedMeta?.id) {
        const p = photos.find((x) => x.id === receivedMeta.id);
        if (p) setEditingPhoto(p);
      }
      setMeta(receivedMeta);
      setOpenDialog(true);
    });

    return () => {
      ipcRenderer.removeAllListeners?.("photo:download");
      ipcRenderer.removeAllListeners?.("photo:open");
      ipcRenderer.removeAllListeners?.("photo:delete");
      ipcRenderer.removeAllListeners?.("photo:meta-response");
    };
  }, [photos, sortedList]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreen) return;
      if (e.key === "ArrowLeft") setIndex((prev) => Math.max(prev - 1, 0));
      if (e.key === "ArrowRight")
        setIndex((prev) => Math.min(prev + 1, sortedList.length - 1));
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, sortedList.length]);

  useEffect(() => {
    const t = setTimeout(() => {
      const initial = Math.min(24, sortedList.length);
      for (let i = 0; i < initial; i++) {
        const p = sortedList[i];
        if (p && !photoPaths[p.id]) queueRef.current.add(p.id);
      }
      scheduleFlush();
    }, 40);
    return () => clearTimeout(t);
  }, [sortedList, photoPaths, scheduleFlush]);

  useEffect(() => {
    if (!fullscreen) return;
    const ids = [index - 1, index, index + 1].filter(
      (i) => i >= 0 && i < sortedList.length,
    );
    const toLoad = ids.map((i) => sortedList[i]).filter(Boolean);
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
  }, [fullscreen, index, sortedList, photoPaths, setPathIfNotExists]);

  // --- UI helpers & layout ---
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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

  const handleFullscreenClose = async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  };

  // --- Early return AFTER all hooks/derived ---
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

  // --- Tile renderer ---
  const renderTile = (photo) => {
    const idx = sortedList.findIndex((p) => p.id === photo.id);
    return (
      <ImageListItem
        key={photo.id}
        onClick={() => {
          setIndex(idx);
          setFullscreen(true);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          window.contextAPI?.showPhotoMenu?.(
            photo,
            { x: e.clientX, y: e.clientY },
            "lite",
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
          "&:hover .overlay": { opacity: 1 },
        }}
      >
        {photoPaths[photo.id] ? (
          <img
            src={photoPaths[photo.id]}
            alt={photo.title}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 4,
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "gray",
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(photo);
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
            // console.log("Edit clicked", photo.id);
            openEditDialog(photo);
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
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(photo);
          }}
          sx={{
            zIndex: 1000,
            position: "absolute",
            bottom: 6,
            left: 6,
            backgroundColor: "rgba(255,0,0,0.4)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(255,0,0,0.6)" },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>

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
                  ? `${person.firstName || ""} ${person.lastName || ""}`.trim()
                  : `ID ${id}`;
              })
              .join(", ")}
          </Typography>
        </Box>
      </ImageListItem>
    );
  };

  // --- Layout sizes ---
  const columns = 4;
  const columnGap = 8;
  const containerHeight = Math.max(300, window.innerHeight - 220);
  const baseWidth = Math.max(300, Math.floor(window.innerWidth * 0.9));
  const rowHeight =
    viewMode === "square"
      ? Math.floor(baseWidth / columns)
      : Math.floor((baseWidth / columns) * 1.15);
  const quntityPhoto = sortedList?.length;

  // --- Render ---
  return (
    <>
      <Paper
        elevation={1}
        sx={{
          p: 1,
          mb: 1,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          borderRadius: 3,
        }}
      >
        <Chip icon={<InsertPhotoIcon />} label={`Всего фото: ${stats.total}`} />
        <Chip
          icon={<InsertPhotoIcon />}
          label={`Выбрано фото: ${quntityPhoto}`}
        />
        <Chip
          icon={<PhotoLibraryIcon />}
          label={`Владельцев: ${stats.owners}`}
          color="secondary"
        />
        {stats.earliest && stats.latest && (
          <Chip
            label={`Годы: ${stats.earliest}–${stats.latest}`}
            variant="outlined"
          />
        )}
      </Paper>

      <Paper
        elevation={1}
        sx={{
          position: "sticky",
          top: { xs: 56, sm: 64 },
          backgroundColor: theme.palette.background.paper,
          p: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 1100,
          borderRadius: 3,
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
              <MenuItem value="datePhoto">По дате фотографии</MenuItem>
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
            onClick={() => window.photoExport?.exportZip(filtered)}
          >
            в ZIP
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.photoExport?.exportPDF(filtered)}
          >
            в PDF
          </Button>
        </Stack>
      </Paper>

      {grouped.map((grp, gi) => (
        <Box key={gi} sx={{ mb: 1, mt: 1 }}>
          {grp.label && (
            <Typography variant="h6" sx={{ mb: 1 }}>
              {grp.label}
            </Typography>
          )}
          <GridByRowsNoDeps
            items={grp.items}
            columns={columns}
            rowHeight={rowHeight}
            height={containerHeight}
            columnGap={columnGap}
            overscan={3}
            onVisibleRange={makeHandleVisibleRangeForGroup(grp.items)}
            renderCell={(item, idx) => (
              <PhotoTileWrapper
                key={item.id}
                photo={item}
                photoPaths={photoPaths}
                renderTile={renderTile}
              />
            )}
          />
        </Box>
      ))}

      {/* Fullscreen slider */}
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

      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={scrollToTop}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>

      <PhotoMetaDialog
        openDialog={openDialog}
        meta={meta}
        onClose={() => setOpenDialog(false)}
      />
      <PhotoMetaUpdateDialog
        openDialog={openDialogUpdate}
        meta={meta}
        onClose={handleMetaClose}
        onSave={handleMetaSave}
        saving={saving}
        allPeople={allPeople}
      />
    </>
  );
}

function PhotoTileWrapper({ photo, photoPaths, renderTile }) {
  return renderTile(photo);
}

async function handleDownload(photo) {
  try {
    const url =
      photo &&
      window.photoAPI &&
      (await window.photoAPI.getPath(photo.owner, photo.filename));
    if (!url) throw new Error("no url");
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
