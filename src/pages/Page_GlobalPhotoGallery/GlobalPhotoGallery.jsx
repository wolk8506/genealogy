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
  // Fab,
  // Zoom,
  // Paper,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { GroupedVirtuoso } from "react-virtuoso";
import ManIcon from "@mui/icons-material/Man";
import WomanIcon from "@mui/icons-material/Woman";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
// import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import TimelineScrubber from "../../components/TimelineScrubber";
import PhotoMetaUpdateDialog from "../../components/Dialog/PhotoMetaUpdateDialog";
import PhotoCell from "../../components/PhotoCell";
import onDownload from "../../utils/onDownload";
import PhotoMetaDialog from "../../components/Dialog/PhotoMetaDialog";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import PhotoUploadDialog from "../../components/Dialog/PhotoUploadDialog";
import { buildPhotoAttendeesText } from "../../utils/photoFaces";
import { useModalStore } from "../../store/useModalStore";
import { useLocation } from "react-router-dom";

const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = String(dp).trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

export default function GlobalPhotoGallery({
  search,
  selectedPeople,
  groupBy,
  sortBy = "date",
  sortDir = "desc",
  photos,
  allPeople,
  refresh,
  isLoading,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const virtuosoRef = useRef(null);
  const scrollTimeout = useRef(null);

  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const pendingRef = useRef(new Set());

  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);
  const [openDialogUpdate, setOpenDialogUpdate] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);

  const [openInfo, setOpenInfo] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);

  const [activeHeader, setActiveHeader] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);

  const [scrollTop, setScrollTop] = useState(0);
  const [allExternal, setAllExternal] = useState([]);

  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
  }, [photos]);

  const isOpen = useModalStore((state) => state.isGlobalPhotoUploadOpen);
  const closeUpload = useModalStore((state) => state.closeGlobalPhotoUpload);
  const location = useLocation();
  const openUpload = useModalStore((state) => state.openGlobalPhotoUpload);

  useEffect(() => {
    // Создаем объект для работы с параметрами URL
    const searchParams = new URLSearchParams(location.search);

    // Если в URL есть ?action=add
    if (searchParams.get("action") === "add") {
      openUpload();

      // Опционально: очистить URL после открытия, чтобы при обновлении
      // страницы модалка не выскакивала снова (чистим историю)
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [location, openUpload]);

  const handlePhotoAdded = (newPhoto) => {
    refresh(); // Обновляем список галереи
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getOwnerName = useCallback(
    (ownerId) => {
      const u = allPeople?.find((x) => x.id === ownerId);
      return u
        ? `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim()
        : "Неизвестно";
    },
    [allPeople],
  );

  // 1. Логика группировки (ИСПРАВЛЕНО: добавлен явный случай "Без группировки")
  const {
    displayList,
    groupCounts,
    photoCountsPerGroup,
    flattenedRows,
    headers,
    columnsCount,
    groupOffsets,
  } = useMemo(() => {
    if (!photos)
      return {
        displayList: [],
        groupCounts: [],
        photoCountsPerGroup: [],
        flattenedRows: [],
        headers: [],
        columnsCount: 4,
        groupOffsets: [],
      };

    const cols = windowWidth < 1200 ? 3 : windowWidth < 1600 ? 4 : 5;

    let filtered = photos.filter((p) => {
      // 1. Подготовка поисковых запросов (разбиваем строку на слова)
      // Убираем лишние пробелы и переводим в нижний регистр
      const searchTerms = search
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      // 2. Если поиск пуст, показываем всё (проверка по людям остается ниже)
      let matchSearch = true;

      if (searchTerms.length > 0) {
        // Собираем всё текстовое содержимое фото для поиска в одну строку
        // Добавляем теги/хештеги из описания или отдельного поля, если оно есть
        const photoContent = `
      ${p.id || ""} 
      ${p.title || ""} 
      ${p.description || ""} 
      ${p.fileName || ""} 
      ${p.hashtags?.join(" ") || ""}
    `.toLowerCase();

        // ФОКУС: Проверяем, что КАЖДОЕ слово из поиска есть в контенте фото
        matchSearch = searchTerms.every((term) => photoContent.includes(term));
      }

      // 3. Логика фильтрации по выбранным людям (остается без изменений)
      const matchPeople =
        selectedPeople.length === 0 ||
        selectedPeople.some(
          (person) => p.owner === person.id || p.people?.includes(person.id),
        );

      return matchSearch && matchPeople;
    });

    filtered.sort((a, b) => {
      let vA, vB;
      if (sortBy === "name") {
        vA = getOwnerName(a.owner).toLowerCase();
        vB = getOwnerName(b.owner).toLowerCase();
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      vA =
        sortBy === "datePhoto"
          ? normalizePhotoDate(a.datePhoto) || 0
          : Date.parse(a.date) || 0;
      vB =
        sortBy === "datePhoto"
          ? normalizePhotoDate(b.datePhoto) || 0
          : Date.parse(b.date) || 0;
      return sortDir === "asc" ? vA - vB : vB - vA;
    });

    const groupsMap = new Map();
    filtered.forEach((p) => {
      let key;
      if (groupBy === "owner") key = getOwnerName(p.owner);
      else if (groupBy === "date") key = p.date?.split("T")[0] || "Без даты";
      else if (groupBy === "datePhoto") key = p.datePhoto || "Без даты";
      else key = "Все фотографии"; // Если groupBy null/undefined

      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(p);
    });

    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
      if (a === "Без даты" || a === "Все фотографии") return 1;
      if (b === "Без даты" || b === "Все фотографии") return -1;
      return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    const fList = [],
      gCounts = [],
      pCounts = [],
      fRows = [],
      labels = [],
      offsets = [];
    let rowAcc = 0;

    sortedKeys.forEach((key) => {
      const items = groupsMap.get(key);
      labels.push(String(key));
      offsets.push(rowAcc);
      fList.push(...items);
      pCounts.push(items.length);
      let added = 0;
      for (let i = 0; i < items.length; i += cols) {
        fRows.push(items.slice(i, i + cols));
        added++;
      }
      gCounts.push(added);
      rowAcc += added;
    });

    return {
      displayList: fList,
      groupCounts: gCounts,
      photoCountsPerGroup: pCounts,
      flattenedRows: fRows,
      headers: labels,
      columnsCount: cols,
      groupOffsets: offsets,
    };
  }, [
    photos,
    search,
    selectedPeople,
    groupBy,
    sortBy,
    sortDir,
    getOwnerName,
    windowWidth,
  ]);

  const handleRangeChanged = useCallback(
    (range) => {
      setIsScrolling(true);
      let curIdx = 0,
        acc = 0;
      for (let i = 0; i < groupCounts.length; i++) {
        acc += groupCounts[i];
        if (range.startIndex < acc) {
          curIdx = i;
          break;
        }
      }
      if (headers[curIdx]) setActiveHeader(headers[curIdx]);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => setIsScrolling(false), 2000);
    },
    [groupCounts, headers],
  );

  //  --- Управление слайдером ---

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreen) return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") handleFullscreenClose();
      if (e.key.toLowerCase() === "f") {
        handleMaximizeWindow();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, handleNext, handlePrev, handleFullscreenClose]);

  // ----------------------------------------------

  // IPC context menu listeners
  useEffect(() => {
    const { ipcRenderer } = window.electron || {};
    if (!ipcRenderer) return;
    ipcRenderer.removeAllListeners?.("photo:open");
    ipcRenderer.removeAllListeners?.("photo:meta-response");

    ipcRenderer.on("photo:open", (_, id) => {
      setOpenDialogUpdate(true);
      setEditingPhoto(id);
    });

    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      setMetaInfo(receivedMeta);
      setOpenInfo(true);
    });

    return () => {
      ipcRenderer.removeAllListeners?.("photo:open");
      ipcRenderer.removeAllListeners?.("photo:meta-response");
    };
  }, []);

  const setPath = useCallback(
    (id, path, ver) =>
      setPhotoPaths((p) => ({ ...p, [ver]: { ...p[ver], [id]: path } })),
    [],
  );

  const fetchThumb = useCallback(
    async (p) => {
      if (photoPaths.thumbs[p.id] || pendingRef.current.has(p.id)) return;
      pendingRef.current.add(p.id);
      const path = await window.photoAPI.getPath(p.owner, p.filename, "thumbs");
      if (path) setPath(p.id, path, "thumbs");
      pendingRef.current.delete(p.id);
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

  useEffect(() => {
    if (fullscreen && virtuosoRef.current) {
      const photoId = displayList[index]?.id;
      if (photoId) {
        const rowIndex = flattenedRows.findIndex((row) =>
          row.some((p) => p.id === photoId),
        );
        if (rowIndex !== -1)
          virtuosoRef.current.scrollToIndex({
            index: rowIndex,
            align: "center",
            behavior: "auto",
          });
      }
    }
  }, [index, fullscreen, displayList, flattenedRows]);

  const currentPhotoInfo = useMemo(() => {
    const photo = displayList[index];
    if (!photo) return null;
    const owner = allPeople.find((p) => p.id === photo.owner);
    const ownerText = owner
      ? `👤 ${owner.gender === "male" ? "Добавил" : "Добавила"}: ${owner.firstName}`
      : "👤 Неизвестно";
    const peopleText = buildPhotoAttendeesText(photo, allPeople, allExternal);
    return { ...photo, ownerText, peopleText };
  }, [index, displayList, allPeople, allExternal]);

  // if (isLoading)
  //   return (
  //     <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
  //       <CircularProgress />
  //     </Box>
  //   );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          mr: 4.5,
        }}
      >
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : displayList.length === 0 ? (
          <Box
            sx={{
              height: "80vh",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: "text.secondary",
            }}
          >
            <PhotoLibraryIcon sx={{ fontSize: 60, opacity: 0.3 }} />
            <Typography>Фотографии не найдены</Typography>
          </Box>
        ) : (
          <GroupedVirtuoso
            ref={virtuosoRef}
            onScroll={(e) => setScrollTop(e.target.scrollTop)}
            style={{ height: "100%" }}
            groupCounts={groupCounts}
            rangeChanged={handleRangeChanged}
            groupContent={(idx) => {
              const label = headers[idx];
              let Icon = <PhotoLibraryIcon />;
              if (groupBy === "owner") {
                const person = allPeople?.find(
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
                    px: 2,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: isDark
                      ? alpha("#121212", 0.9)
                      : alpha("#f5f5f5", 0.9),
                    backdropFilter: "blur(4px)",
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
                    sx={{ height: 20, mr: 5 }}
                  />
                </Box>
              );
            }}
            itemContent={(idx) => (
              <Stack direction="row" spacing={1} sx={{ px: 0, py: 0.5 }}>
                {flattenedRows[idx]?.map((item) => {
                  if (!photoPaths.thumbs[item.id]) fetchThumb(item);
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        width: `${100 / columnsCount}%`,
                        height: Math.floor((windowWidth * 0.9) / columnsCount),
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
                        isDark={isDark}
                        rowHeight={Math.floor(
                          (windowWidth * 0.9) / columnsCount,
                        )}
                        allPeople={allPeople}
                        allExternal={allExternal}
                        onEdit={(p) => {
                          setEditingPhoto(p);
                          setOpenDialogUpdate(true);
                        }}
                        onDownload={onDownload}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          />
        )}
        <ButtonScrollTop targetRef={virtuosoRef} scrollOffset={scrollTop} />
      </Box>

      {/* ТАЙМЛАЙН-СКРАББЕР в стиле Google Photos */}
      <TimelineScrubber
        headers={headers}
        groupOffsets={groupOffsets}
        activeHeader={activeHeader}
        virtuosoRef={virtuosoRef}
        forceVisible={isScrolling}
      />

      {/* ОСТАЛЬНЫЕ КОМПОНЕНТЫ */}
      <PhotoFullscreenViewer
        open={fullscreen}
        index={index}
        photos={displayList}
        photoPaths={photoPaths.full || {}}
        thumbPaths={photoPaths.thumbs || {}}
        direction={direction}
        hideLabels={hideLabels}
        onClose={handleFullscreenClose}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleMaximize={handleMaximizeWindow}
        currentPhotoInfo={currentPhotoInfo}
        onDownload={onDownload}
        allPeople={allPeople}
        allExternal={allExternal}
      />

      <PhotoMetaDialog
        openDialog={openInfo}
        meta={metaInfo}
        onClose={() => setOpenInfo(false)}
      />

      <PhotoMetaUpdateDialog
        open={openDialogUpdate}
        meta={editingPhoto}
        onClose={async () => {
          setOpenDialogUpdate(false);
          await refresh();
        }}
        allPeople={allPeople}
      />

      <PhotoUploadDialog
        open={isOpen}
        onClose={closeUpload}
        onPhotoAdded={handlePhotoAdded}
      />
    </Box>
  );
}
