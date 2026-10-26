import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Avatar,
  Box,
  Button,
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
import AddIcon from "@mui/icons-material/Add";
import ManIcon from "@mui/icons-material/Man";
import WomanIcon from "@mui/icons-material/Woman";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
// import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import TimelineScrubber from "../../components/TimelineScrubber";
import PhotoFacesDialog from "../../components/Dialog/PhotoFacesDialog";
import PhotoPreviewDialog from "../../components/Dialog/PhotoPreviewDialog";
import PhotoCell from "../../components/PhotoCell";
import onDownload from "../../utils/onDownload";
import PhotoMetaDialog from "../../components/Dialog/PhotoMetaDialog";
import PhotoUploadDialog from "../../components/Dialog/PhotoUploadDialog";
import { buildPhotoAttendeesText } from "../../utils/photoFaces";
import { normalizePhotoDate } from "../../utils/photoDates";
import { useModalStore } from "../../store/useModalStore";
import { usePhotoInspectorStore } from "../../store/usePhotoInspectorStore";
import { useLocation } from "react-router-dom";
import appIcon from "../../img/app_icon.png";

export default function GlobalPhotoGallery({
  search,
  selectedPeople,
  groupBy,
  sortDir = "desc",
  photos,
  allPeople,
  refresh,
  setPhotos,
  isLoading,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const virtuosoRef = useRef(null);

  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const pendingRef = useRef(new Set());

  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);
  const [facesDialogOpen, setFacesDialogOpen] = useState(false);
  const [facesDialogPhoto, setFacesDialogPhoto] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDialogPhoto, setPreviewDialogPhoto] = useState(null);

  const [openInfo, setOpenInfo] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const scrollAreaRef = useRef(null);

  const [allExternal, setAllExternal] = useState([]);

  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
  }, [photos]);

  const isOpen = useModalStore((state) => state.isGlobalPhotoUploadOpen);
  const closeUpload = useModalStore((state) => state.closeGlobalPhotoUpload);
  const selectedId = usePhotoInspectorStore((state) => state.selectedId);
  const photoPanelOpen = usePhotoInspectorStore((state) => state.open);
  const selectPhoto = usePhotoInspectorStore((state) => state.select);
  const setInspectorActions = usePhotoInspectorStore(
    (state) => state.setActions,
  );
  const registerSource = usePhotoInspectorStore((state) => state.registerSource);

  // При входе в галерею — чистим состояние панели, затем регистрируем список.
  useEffect(() => {
    usePhotoInspectorStore.getState().reset();
  }, []);
  useEffect(() => {
    registerSource({ photos, setPhotos });
  }, [photos, setPhotos, registerSource]);
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

    // Сравнение фото по ключу текущей группировки.
    // Порядок групп задаётся sortedKeys, порядок внутри групп — тем же sortDir.
    const comparePhotos = (a, b) => {
      const datePhotoOf = (p) => normalizePhotoDate(p.datePhoto) || 0;
      const dateOf = (p) => Date.parse(p.date) || 0;
      let r = 0;
      if (groupBy === "owner" || groupBy === "datePhoto") {
        r =
          datePhotoOf(a) - datePhotoOf(b) ||
          dateOf(a) - dateOf(b);
      } else {
        // date + none: по дате загрузки
        r = dateOf(a) - dateOf(b);
      }
      if (r === 0) r = (a.id || 0) - (b.id || 0);
      return sortDir === "asc" ? r : -r;
    };

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
      const items = [...groupsMap.get(key)];
      items.sort(comparePhotos);
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
    sortDir,
    getOwnerName,
    windowWidth,
  ]);

  const handleRangeChanged = useCallback(
    (range) => {
      let curIdx = 0,
        acc = 0;
      for (let i = 0; i < groupCounts.length; i++) {
        acc += groupCounts[i];
        if (range.startIndex < acc) {
          curIdx = i;
          break;
        }
      }
      setActiveGroupIndex(curIdx);
    },
    [groupCounts],
  );

  const groupFirstPhotos = useMemo(() => {
    const result = [];
    let idx = 0;
    for (let g = 0; g < photoCountsPerGroup.length; g++) {
      result.push(displayList[idx] || null);
      idx += photoCountsPerGroup[g] || 0;
    }
    return result;
  }, [displayList, photoCountsPerGroup]);

  const scrubberMode =
    groupBy === "date" || groupBy === "datePhoto" ? "date" : "index";

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

  // Действия правой панели-инспектора для выбранного фото.
  useEffect(() => {
    setInspectorActions({
      openFullscreen: (photo) => {
        const i = displayList.findIndex((x) => x.id === photo.id);
        if (i === -1) return;
        setDirection(0);
        setIndex(i);
        setFullscreen(true);
      },
      openFaces: (photo) => {
        setFacesDialogPhoto(photo);
        setFacesDialogOpen(true);
      },
      openPreview: (photo) => {
        setPreviewDialogPhoto(photo);
        setPreviewDialogOpen(true);
      },
      onSaved: (photo, { ownerChanged, filenameChanged } = {}) => {
        if (ownerChanged || filenameChanged) {
          setPhotoPaths((prev) => {
            const copy = { ...prev };
            if (copy.thumbs) delete copy.thumbs[photo.id];
            if (copy.full) delete copy.full[photo.id];
            delete copy[photo.id];
            return { ...copy };
          });
        }
        refresh();
      },
    });
  }, [displayList, setInspectorActions, refresh]);

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

    ipcRenderer.on("photo:open", (_, payload) => {
      const id =
        payload && typeof payload === "object" ? payload.id : payload;
      const photo = displayList.find((p) => p.id === id);
      if (photo) selectPhoto(photo);
    });

    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      setMetaInfo(receivedMeta);
      setOpenInfo(true);
    });

    return () => {
      ipcRenderer.removeAllListeners?.("photo:open");
      ipcRenderer.removeAllListeners?.("photo:meta-response");
    };
  }, [displayList, selectPhoto]);

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
        ref={scrollAreaRef}
        sx={{
          flexGrow: 1,
          mr: 4.5,
          ...(groupBy === "datePhoto" && {
            "& > div": {
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            },
            "& > div::-webkit-scrollbar": {
              display: "none",
              width: 0,
              height: 0,
            },
          }),
        }}
      >
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : displayList.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 3,
              pb: 2,
            }}
          >
            <Box
              sx={{
                p: { xs: 4, md: 6 },
                width: "100%",
                maxWidth: 500,
                borderRadius: "24px",
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                border: "1px solid",
                borderColor: "divider",
                backdropFilter: "blur(10px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                textAlign: "center",
              }}
            >
              <Stack spacing={3} alignItems="center">
                <Box sx={{ position: "relative" }}>
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: theme.palette.primary.main,
                      filter: "blur(25px)",
                      opacity: 0.15,
                      borderRadius: "50%",
                    }}
                  />
                  <Avatar
                    src={appIcon}
                    sx={{
                      width: 100,
                      height: 100,
                      border: "4px solid",
                      borderColor: "background.paper",
                      boxShadow: theme.shadows[4],
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Фотогалерея
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ color: "text.secondary", maxWidth: 350, mx: "auto" }}
                  >
                    {(photos || []).length > 0
                      ? "Ничего не найдено по выбранным фильтрам."
                      : "Фотогалерея пока пуста. Добавьте первые фотографии, чтобы они появились здесь."}
                  </Typography>
                </Box>

                {(photos || []).length === 0 && (
                  <Stack spacing={2} sx={{ width: "100%", mt: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AddIcon />}
                      onClick={openUpload}
                      sx={{
                        height: 32,
                        borderRadius: "999px",
                        px: 2,
                        py: 0,
                        textTransform: "none",
                        fontSize: "0.8125rem",
                        lineHeight: 1.2,
                        fontWeight: 700,
                        boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                        "& .MuiButton-startIcon": {
                          mr: 0.5,
                          ml: 0,
                          "& > *:nth-of-type(1)": { fontSize: 16 },
                        },
                      }}
                    >
                      Добавить фотографии
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Box>
        ) : (
          <GroupedVirtuoso
            ref={virtuosoRef}
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
                  Icon = (
                    <ManIcon sx={{ color: theme.palette.accents.blue }} />
                  );
                else if (person?.gender === "female")
                  Icon = (
                    <WomanIcon sx={{ color: theme.palette.accents.pink }} />
                  );
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
                    bgcolor: alpha(theme.palette.background.default, 0.9),
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
                        selected={selectedId === item.id}
                        onSelect={(p) => selectPhoto(p, { open: false })}
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
                        onEdit={(p) => selectPhoto(p)}
                        onDownload={onDownload}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          />
        )}
      </Box>

      {/* ТАЙМЛАЙН-СКРАББЕР в стиле Google Photos */}
      <TimelineScrubber
        headers={headers}
        groupOffsets={groupOffsets}
        groupCounts={groupCounts}
        groupWeights={photoCountsPerGroup}
        activeGroupIndex={activeGroupIndex}
        mode={scrubberMode}
        anchorRef={scrollAreaRef}
        virtuosoRef={virtuosoRef}
        getPreviewUrl={(i) => {
          const p = groupFirstPhotos[i];
          return p ? photoPaths.thumbs[p.id] : null;
        }}
        showCrosshairLine={false}
        rightOffset={photoPanelOpen ? 340 : 0}
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

      <PhotoFacesDialog
        open={facesDialogOpen}
        meta={facesDialogPhoto}
        onClose={() => setFacesDialogOpen(false)}
        allPeople={allPeople}
        photoPaths={photoPaths}
        setPhotos={setPhotos}
        onSaved={() => refresh()}
      />

      <PhotoPreviewDialog
        open={previewDialogOpen}
        meta={previewDialogPhoto}
        onClose={() => setPreviewDialogOpen(false)}
        setPhotoPaths={setPhotoPaths}
      />

      <PhotoUploadDialog
        open={isOpen}
        onClose={closeUpload}
        onPhotoAdded={handlePhotoAdded}
      />
    </Box>
  );
}
