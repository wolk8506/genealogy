import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { Typography, Box, Stack, CircularProgress, Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { GroupedVirtuoso } from "react-virtuoso";

// Иконки
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import PersonPinCircleIcon from "@mui/icons-material/PersonPinCircle";

// Компоненты и утилиты
import onDownload from "../../../utils/onDownload";
import PhotoFullscreenViewer from "../../../components/PhotoFullscreenViewer";
import PhotoCell from "../../../components/PhotoCell";
import PhotoMetaUpdateDialog from "../../../components/Dialog/PhotoMetaUpdateDialog";
import PhotoUploadDialog from "../../../components/Dialog/PhotoUploadDialog";
import PhotoMetaDialog from "../../../components/Dialog/PhotoMetaDialog";
import { ButtonScrollTop } from "../../../components/ButtonScrollTop";

const normalizePhotoDate = (dp) => {
  if (!dp) return null;
  let s = dp.trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
};

export default function PhotoGallery({
  personId,
  allPeople,
  refresh,

  search,
  groupBy,
  sortDir,
  uploadTrigger,
  activeElement,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const virtuosoRef = useRef(null);
  const pendingRef = useRef(new Set());

  // Состояния данных
  const [photos, setPhotos] = useState([]);
  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Состояния слайдера и диалогов
  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [openInfo, setOpenInfo] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const lastTriggerRef = useRef(uploadTrigger);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    // Проверяем: изменилось ли значение по сравнению с прошлым разом
    // И что оно не равно 0 (сброс)
    if (uploadTrigger > lastTriggerRef.current && uploadTrigger !== 0) {
      setUploadOpen(true);
    }
    // Обновляем реф текущим значением
    lastTriggerRef.current = uploadTrigger;
  }, [uploadTrigger]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!personId) return; // Убрали !openMain
    // setIsLoading(true);
    if (refreshTrigger === 0) {
      setIsLoading(true);
    }
    window.photoAPI.getAll(personId).then((list) => {
      setPhotos(list || []);
      setIsLoading(false);
    });
  }, [personId, refreshTrigger]); // Убрали openMain из зависимостей

  // 1. Фильтрация и сортировка (Упрощена)
  const sortedBase = useMemo(() => {
    const result = photos.filter((p) => {
      const txt =
        `${p.id || ""} ${p.title || ""} ${p.description || ""} ${p.fileName || ""}`.toLowerCase();
      return txt.includes(search.toLowerCase());
    });

    return result.sort((a, b) => {
      const valA = normalizePhotoDate(a.datePhoto) || 0;
      const valB = normalizePhotoDate(b.datePhoto) || 0;
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [photos, search, sortDir]);

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

    sortedBase.forEach((p) => {
      let key = "Без даты";
      if (groupBy === "date") {
        key = p.date?.split("T")[0] || "Без даты";
      } else if (groupBy === "datePhoto") {
        key = p.datePhoto || "Без даты";
      } else if (groupBy === "byType") {
        key =
          String(p.owner) === String(personId) ? "Мои фотографии" : "Я на фото";
      } else if (groupBy === "none") {
        key = "Все фотографии";
      }

      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(p);
    });

    const sortedGroupKeys = Array.from(groupsMap.keys()).sort((a, b) => {
      if (groupBy === "byType") {
        if (a === "Мои фотографии") return -1;
        if (b === "Мои фотографии") return 1;
      }
      if (a === b) return 0;
      if (a === "Без даты") return 1;
      if (b === "Без даты") return -1;
      return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    });

    const finalOrderedList = [];
    const groupRowsCount = [];
    const pCounts = [];
    const rows = [];
    const labels = [];

    sortedGroupKeys.forEach((key) => {
      const items = groupsMap.get(key);
      labels.push(key);
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
  }, [sortedBase, groupBy, windowWidth, sortDir, personId]);

  // Загрузка путей (Thumbs)
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
        if (path) {
          setPhotoPaths((prev) => ({
            ...prev,
            thumbs: { ...prev.thumbs, [p.id]: path },
          }));
        }
      } finally {
        pendingRef.current.delete(p.id);
      }
    },
    [photoPaths.thumbs],
  );

  // Загрузка Full
  useEffect(() => {
    if (!fullscreen || !displayList[index]) return;
    const p = displayList[index];
    if (!photoPaths.full[p.id] && !pendingRef.current.has(p.id + "_full")) {
      pendingRef.current.add(p.id + "_full");
      window.photoAPI
        .getPath(p.owner, p.filename, "webp")
        .then((path) => {
          if (path) {
            setPhotoPaths((prev) => ({
              ...prev,
              full: { ...prev.full, [p.id]: path },
            }));
          }
        })
        .finally(() => pendingRef.current.delete(p.id + "_full"));
    }
  }, [fullscreen, index, displayList, photoPaths.full]);

  // Скролл
  useEffect(() => {
    if (fullscreen && virtuosoRef.current) {
      const photoId = displayList[index]?.id;
      if (photoId) {
        const rowIndex = flattenedRows.findIndex((row) =>
          row.some((p) => p.id === photoId),
        );
        if (rowIndex !== -1) {
          virtuosoRef.current.scrollToIndex({
            index: rowIndex,
            align: "center",
            behavior: "auto",
          });
        }
      }
    }
  }, [index, fullscreen, displayList, flattenedRows]);

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

  // -------------------------------------------------------------------------

  // IPC context menu listeners
  useEffect(() => {
    const { ipcRenderer } = window.electron || {};
    if (!ipcRenderer) return;
    ipcRenderer.removeAllListeners?.("photo:open");
    ipcRenderer.removeAllListeners?.("photo:delete");
    ipcRenderer.removeAllListeners?.("photo:meta-response");

    ipcRenderer.on("photo:open", (_, id) => {
      setEditingPhoto(id);
      setOpenEdit(true);
    });
    ipcRenderer.on("photo:delete", (_, id) => {
      if (confirm("Удалить фото?")) {
        window.photoAPI.delete(personId, id);
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      }
    });
    ipcRenderer.on("photo:meta-response", (_, receivedMeta) => {
      setMetaInfo(receivedMeta);
      setOpenInfo(true);
    });

    return () => {
      ipcRenderer.removeAllListeners?.("photo:open");
      ipcRenderer.removeAllListeners?.("photo:delete");
      ipcRenderer.removeAllListeners?.("photo:meta-response");
    };
  }, [personId]);

  const handleDelete = useCallback(
    async (photo) => {
      if (!window.confirm("Вы уверены, что хотите удалить это фото?")) return;
      try {
        const success = await window.photoAPI.delete(personId, photo.id);
        if (success) {
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          setPhotoPaths((prev) => {
            const nt = { ...prev.thumbs };
            const nf = { ...prev.full };
            delete nt[photo.id];
            delete nf[photo.id];
            return { thumbs: nt, full: nf };
          });
        }
        addNotification({
          title: "Фото удалено",
          message: `Файл "${photo.filename}" успешно удален. Владелец ID: ${personId}`,
          type: "warning",
          category: "photo",
        });
      } catch (e) {
        console.error(e);
        addNotification({
          title: "Ошибка удаления",
          message: e || "Не удалось удалить фото",
          type: "error",
          category: "photo",
        });
      }
    },
    [personId],
  );

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

  const rowHeight = Math.floor((windowWidth * 0.9) / columnsCount);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 60px)", // ЗАДАЙТЕ ВЫСОТУ ТУТ (например, 700 или 80vh)
          width: "100%",
          // position: "relative",
        }}
      >
        <Box
          sx={{ flex: 1, bgcolor: "background.default", position: "relative" }}
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
              style={{ height: "100%", width: "100%" }}
              groupCounts={groupCounts}
              groupContent={(idx) => (
                <Box
                  sx={{
                    py: 1,
                    px: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: isDark
                      ? alpha("#121212", 0.9)
                      : alpha("#fff", 0.9),
                    backdropFilter: "blur(8px)",
                    borderBottom: "1px solid divider",
                    zIndex: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {groupBy === "byType" ? (
                      <PersonPinCircleIcon fontSize="small" color="primary" />
                    ) : (
                      <CalendarMonthIcon fontSize="small" color="action" />
                    )}
                    <Typography variant="subtitle2" fontWeight="bold">
                      {headers[idx]}
                    </Typography>
                  </Stack>
                  <Chip
                    label={photoCountsPerGroup[idx]}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20 }}
                  />
                </Box>
              )}
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
                            scope={"personal_gallery"}
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
                              setOpenEdit(true);
                            }}
                            onDelete={() => handleDelete(item)}
                            rowHeight={rowHeight}
                            isDark={isDark}
                            allPeople={allPeople}
                            personId={personId}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                );
              }}
            />
          )}
          <ButtonScrollTop targetRef={virtuosoRef} scrollOffset={scrollTop} />
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
          onDownload={onDownload}
        />

        <PhotoMetaDialog
          openDialog={openInfo}
          meta={metaInfo}
          onClose={() => setOpenInfo(false)}
        />

        <PhotoMetaUpdateDialog
          open={openEdit}
          meta={editingPhoto}
          onClose={async () => {
            setOpenEdit(false);
            setRefreshTrigger((r) => r + 1);
            if (refresh) refresh();
          }}
          allPeople={allPeople}
          mode="personal"
        />

        <PhotoUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          personId={personId}
          currentUserId={personId}
          onPhotoAdded={() => setRefreshTrigger((r) => r + 1)}
        />
      </Box>
    </>
  );
}
