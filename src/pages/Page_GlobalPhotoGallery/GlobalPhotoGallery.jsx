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
  Typography,
  CircularProgress,
  Chip,
  Fab,
  Zoom,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { GroupedVirtuoso } from "react-virtuoso";
import { alpha } from "@mui/material/styles";
import ManIcon from "@mui/icons-material/Man";
import WomanIcon from "@mui/icons-material/Woman";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import PhotoMetaUpdateDialog from "../../components/PhotoMetaUpdateDialog";
import PhotoCell from "../../components/PhotoCell";
import onDownload from "../utils/onDownload";

const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

export default function GlobalPhotoGallery({
  search,
  selectedPeople,
  groupBy,
  sortBy = "date", // Значения по умолчанию
  sortDir = "desc",
  photos, // Получаем из MainLayout
  allPeople, // Получаем из MainLayout
  refresh, // Функция обновления из MainLayout
  isLoading, // Статус загрузки из MainLayout
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const virtuosoRef = useRef(null);

  // --- Убираем локальные стейты photos и allPeople! ---
  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });

  // Состояния слайдера и окон
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);

  const [openDialogUpdate, setOpenDialogUpdate] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  // const [openDialog, setOpenDialog] = useState(false);
  // const [meta, setMeta] = useState(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const pendingRef = useRef(new Set());

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getOwnerName = useCallback(
    (ownerId) => {
      const u = allPeople.find((x) => x.id === ownerId);
      if (!u) return "Неизвестно";
      return `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim();
    },
    [allPeople],
  );

  // 1. Базовая фильтрация и сортировка (используем пропсы)
  const sortedBase = useMemo(() => {
    if (!photos) return [];

    let result = photos.filter((p) => {
      const txt =
        `${p.title || ""} ${p.description || ""} ${p.fileName || ""}`.toLowerCase();
      const matchSearch = txt.includes(search.toLowerCase());
      const matchPeople =
        selectedPeople.length === 0 ||
        selectedPeople.some(
          (person) =>
            p.owner === person.id || (p.people && p.people.includes(person.id)),
        );
      return matchSearch && matchPeople;
    });

    return result.sort((a, b) => {
      let valA, valB;
      if (sortBy === "date") {
        valA = Date.parse(a.date) || 0;
        valB = Date.parse(b.date) || 0;
      } else if (sortBy === "datePhoto") {
        valA = normalizePhotoDate(a.datePhoto) || 0;
        valB = normalizePhotoDate(b.datePhoto) || 0;
      } else if (sortBy === "name") {
        valA = getOwnerName(a.owner).toLowerCase();
        valB = getOwnerName(b.owner).toLowerCase();
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [photos, search, selectedPeople, sortBy, sortDir, getOwnerName]);

  // 2. Группировка
  const {
    displayList,
    groupCounts,
    photoCountsPerGroup,
    flattenedRows,
    headers,
    columnsCount,
  } = useMemo(() => {
    const groupsMap = new Map();
    const cols = windowWidth < 1200 ? 3 : windowWidth < 1600 ? 4 : 5;

    // Группируем фотографии
    sortedBase.forEach((p) => {
      let key = null;
      if (groupBy === "owner") {
        key = getOwnerName(p.owner);
      } else if (groupBy === "date") {
        key = p.date?.split("T")[0] || "Без даты";
      } else if (groupBy === "datePhoto") {
        key = p.datePhoto || "Без даты";
      }

      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(p);
    });

    // Сортируем ключи групп
    const sortedGroupKeys = Array.from(groupsMap.keys()).sort((a, b) => {
      if (a === b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      if (groupBy === "date" || groupBy === "datePhoto") {
        // Для дат: если это "Без даты", кидаем в конец
        if (a === "Без даты") return 1;
        if (b === "Без даты") return -1;

        // Инвертируем порядок в зависимости от sortDir
        // Обычно для дат в группах логично: новые сверху (desc)
        return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
      }

      // Для имен (owner)
      return a.localeCompare(b);
    });

    const finalOrderedList = [];
    const groupRowsCount = [];
    const pCounts = [];
    const rows = [];
    const labels = [];

    sortedGroupKeys.forEach((key) => {
      const items = groupsMap.get(key);
      // Название группы для заголовка
      labels.push(key || "Все фотографии");

      // Сохраняем плоский список для слайдера (важно, чтобы порядок совпадал с отображением)
      finalOrderedList.push(...items);
      pCounts.push(items.length);

      let addedRows = 0;
      for (let i = 0; i < items.length; i += cols) {
        rows.push(items.slice(i, i + cols));
        addedRows++;
      }
      groupRowsCount.push(addedRows);
    });

    return {
      displayList: finalOrderedList,
      groupCounts: groupRowsCount,
      photoCountsPerGroup: pCounts,
      flattenedRows: rows,
      headers: labels,
      columnsCount: cols,
    };
  }, [sortedBase, groupBy, getOwnerName, windowWidth, sortDir]); // Добавлен sortDir в зависимости

  // Управление полноэкранным режимом
  const handleFullscreenClose = useCallback(async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen && window.windowAPI) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  }, [sliderForcedFullscreen]);

  const handleMaximizeWindow = useCallback(async () => {
    const wantFullscreen = !hideLabels;
    setHideLabels(wantFullscreen);
    if (window.windowAPI) {
      const isNow = await window.windowAPI.isFullscreen();
      if (wantFullscreen && !isNow) {
        await window.windowAPI.setFullscreen(true);
        setSliderForcedFullscreen(true);
      } else if (!wantFullscreen && sliderForcedFullscreen) {
        await window.windowAPI.setFullscreen(false);
        setSliderForcedFullscreen(false);
      }
    }
  }, [hideLabels, sliderForcedFullscreen]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1 < displayList.length ? prev + 1 : prev));
  }, [displayList.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

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

  const setPath = useCallback((id, path, version = "thumbs") => {
    setPhotoPaths((prev) => ({
      ...prev,
      [version]: { ...prev[version], [id]: path },
    }));
  }, []);

  // Информация для слайдера
  const currentPhotoInfo = useMemo(() => {
    const photo = displayList[index];
    if (!photo) return null;
    const owner = allPeople.find((p) => p.id === photo.owner);
    const ownerText = owner
      ? `👤 ${owner.gender === "male" ? "Добавил" : "Добавила"}: ${owner.firstName}`
      : "👤 Неизвестно";
    const peopleText = (photo.people || [])
      .map((id) => {
        const p = allPeople.find((x) => x.id === id);
        return p ? `${p.firstName} ${p.lastName || ""}`.trim() : id;
      })
      .join(", ");
    return { ...photo, ownerText, peopleText };
  }, [index, displayList, allPeople]);

  // Подгрузка путей
  const fetchThumb = useCallback(
    async (p) => {
      if (photoPaths.thumbs[p.id] || pendingRef.current.has(p.id)) return;
      pendingRef.current.add(p.id);
      try {
        const path = await window.photoAPI.getPath(
          p.owner,
          p.filename,
          "thumbs",
        );
        if (path) setPath(p.id, path, "thumbs");
      } finally {
        pendingRef.current.delete(p.id);
      }
    },
    [photoPaths.thumbs, setPath],
  );

  useEffect(() => {
    if (!fullscreen || !displayList[index]) return;
    const p = displayList[index];
    if (!photoPaths.full[p.id] && !pendingRef.current.has(p.id + "_full")) {
      pendingRef.current.add(p.id + "_full");
      window.photoAPI
        .getPath(p.owner, p.filename, "webp")
        .then((path) => {
          if (path) setPath(p.id, path, "full");
        })
        .finally(() => pendingRef.current.delete(p.id + "_full"));
    }
  }, [fullscreen, index, displayList, photoPaths.full, setPath]);

  // Синхронизация прокрутки списка с текущим фото в слайдере
  useEffect(() => {
    if (fullscreen && virtuosoRef.current) {
      // Нам нужно найти, в какой СТРОКЕ (row) находится текущее фото.
      // flattenedRows — это массив массивов фотографий.
      const photoId = displayList[index]?.id;

      if (photoId) {
        const rowIndex = flattenedRows.findIndex((row) =>
          row.some((photo) => photo.id === photoId),
        );

        if (rowIndex !== -1) {
          // Мы используем scrollToIndex для строк.
          // behavior: 'auto' — чтобы скролл был мгновенным и не мешал анимации слайдера.
          // align: 'center' — чтобы строка с фото была посередине экрана.
          virtuosoRef.current.scrollToIndex({
            index: rowIndex,
            align: "center",
            behavior: "auto",
          });
        }
      }
    }
  }, [index, fullscreen, displayList, flattenedRows]);

  // Загрузка
  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

  const rowHeight = Math.floor((windowWidth * 0.9) / columnsCount);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        // height: "100vh",
        height: "calc(100vh - 96px)",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ flexGrow: 1 }}>
        <GroupedVirtuoso
          ref={virtuosoRef}
          style={{ height: "100%" }}
          groupCounts={groupCounts}
          groupContent={(idx) => {
            const label = headers[idx];
            let Icon = <PhotoLibraryIcon />;
            if (groupBy === "owner") {
              const person = allPeople.find(
                (p) => getOwnerName(p.id) === label,
              );
              if (person?.gender === "male")
                Icon = <ManIcon sx={{ color: "#1976d2" }} />;
              else if (person?.gender === "female")
                Icon = <WomanIcon sx={{ color: "#dc004e" }} />;
            } else if (groupBy === "date" || groupBy === "datePhoto") {
              Icon = <CalendarMonthIcon sx={{ color: "text.secondary" }} />;
            }

            return (
              <Box
                sx={{
                  py: 1,
                  px: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: isDark
                    ? alpha("#121212", 0.9)
                    : alpha("#f5f5f5", 0.9),
                  backdropFilter: "blur(8px)",
                  borderBottom: "1px solid divider",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {Icon}
                  <Typography variant="subtitle2" fontWeight="bold">
                    {label}
                  </Typography>
                </Stack>
                <Chip
                  label={photoCountsPerGroup[idx]}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              </Box>
            );
          }}
          itemContent={(idx) => {
            const rowItems = flattenedRows[idx];
            return (
              <Stack direction="row" spacing={1} sx={{ px: 2, py: 0.5 }}>
                {rowItems.map((item) => {
                  if (!photoPaths.thumbs[item.id]) fetchThumb(item);
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        width: `${100 / columnsCount}%`,
                        height: rowHeight,
                      }}
                    >
                      <PhotoCell
                        photo={item}
                        path={photoPaths.thumbs[item.id]}
                        onOpen={() => {
                          setIndex(
                            displayList.findIndex((p) => p.id === item.id),
                          );
                          setFullscreen(true);
                        }}
                        onDownload={onDownload}
                        onEdit={(p) => {
                          setEditingPhoto(p);
                          setOpenDialogUpdate(true);
                        }}
                        rowHeight={rowHeight}
                        isDark={isDark}
                        allPeople={allPeople}
                      />
                    </Box>
                  );
                })}
              </Stack>
            );
          }}
        />
      </Box>

      <PhotoFullscreenViewer
        open={fullscreen}
        index={index}
        photos={displayList}
        photoPaths={photoPaths.full}
        thumbPaths={photoPaths.thumbs}
        direction={direction}
        hideLabels={hideLabels}
        onClose={handleFullscreenClose}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleMaximize={handleMaximizeWindow}
        currentPhotoInfo={currentPhotoInfo}
      />

      <PhotoMetaUpdateDialog
        open={openDialogUpdate}
        meta={editingPhoto}
        onClose={async () => {
          setOpenDialogUpdate(false);
          await refresh(); // Обновляем MainLayout!
        }}
        allPeople={allPeople}
      />

      <Zoom in={true}>
        <Fab
          color="primary"
          size="small"
          sx={{ position: "fixed", bottom: 20, right: 20 }}
          onClick={() =>
            virtuosoRef.current.scrollToIndex({ index: 0, behavior: "smooth" })
          }
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>
    </Box>
  );
}
