import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
import PhotoFacesDialog from "../../../components/Dialog/PhotoFacesDialog";
import PhotoPreviewDialog from "../../../components/Dialog/PhotoPreviewDialog";
import PhotoUploadDialog from "../../../components/Dialog/PhotoUploadDialog";
import PhotoMetaDialog from "../../../components/Dialog/PhotoMetaDialog";
import { buildPhotoAttendeesText } from "../../../utils/photoFaces";
import { usePhotoInspectorStore } from "../../../store/usePhotoInspectorStore";
import { useLayoutStore } from "../../../store/useLayoutStore";
import {
  DRAWER_EXPANDED_EXTRA,
  DRAWER_HEADER_HEIGHT,
} from "../../../layout/AppDrawer";
import ConfirmDialog from "../../../components/Dialog/ConfirmDialog";
import TimelineScrubber from "../../../components/TimelineScrubber";
import {
  useGalleryLayout,
  useGroupFirstPhotos,
} from "../../../features/photoGallery/useGalleryLayout";
import { useGalleryViewer } from "../../../features/photoGallery/useGalleryViewer";
import { useGalleryScrubber } from "../../../features/photoGallery/useGalleryScrubber";
import { useGalleryDelete } from "../../../features/photoGallery/useGalleryDelete";
import { INSPECTOR_PANEL_WIDTH } from "../../../layout/inspectorPanelTransition";

const MY_PHOTOS_GROUP = "Мои фотографии";

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
  const virtuosoRef = useRef(null);

  // Состояния данных
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Диалоги
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);
  const [facesDialogOpen, setFacesDialogOpen] = useState(false);
  const [facesDialogPhoto, setFacesDialogPhoto] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDialogPhoto, setPreviewDialogPhoto] = useState(null);
  const galleryRef = useRef(null);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const lastTriggerRef = useRef(uploadTrigger);
  const [allExternal, setAllExternal] = useState([]);

  // Правая панель-инспектор (общая с глобальной галереей).
  const selectedId = usePhotoInspectorStore((s) => s.selectedId);
  const photoPanelOpen = usePhotoInspectorStore((s) => s.open);
  const drawerOpen = useLayoutStore((s) => s.drawerOpen);
  const selectPhoto = usePhotoInspectorStore((s) => s.select);
  const clearSelection = usePhotoInspectorStore((s) => s.clearSelection);
  const setInspectorActions = usePhotoInspectorStore((s) => s.setActions);
  const registerSource = usePhotoInspectorStore((s) => s.registerSource);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // При входе — чистим состояние панели, затем регистрируем список фото.
  useEffect(() => {
    usePhotoInspectorStore.getState().reset();
  }, []);
  useEffect(() => {
    registerSource({ photos, setPhotos });
  }, [photos, registerSource]);

  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
  }, [refreshTrigger]);

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
    const node = galleryRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      setGalleryWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Ширину берём у самой галереи: при открытом инспекторе она уже окна.
  const layoutWidth = galleryWidth || Math.max(320, window.innerWidth - 80);

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

  // Группировка «мои / я на фото» — единственное, чем персональная сетка
  // отличается от глобальной; остальное считает общее ядро.
  const groupKey = useCallback(
    (photo, key) =>
      key === "byType"
        ? String(photo.owner) === String(personId)
          ? MY_PHOTOS_GROUP
          : "Я на фото"
        : undefined,
    [personId],
  );

  const {
    displayList,
    groupCounts,
    photoCountsPerGroup,
    flattenedRows,
    headers,
    columnsCount,
    groupOffsets,
    rowHeight,
  } = useGalleryLayout({
    photos,
    search,
    groupBy,
    sortDir,
    layoutWidth,
    chromeInset:
      (drawerOpen ? DRAWER_EXPANDED_EXTRA : 0) +
      (photoPanelOpen ? INSPECTOR_PANEL_WIDTH : 0),
    groupKey,
    firstGroupKey: groupBy === "byType" ? MY_PHOTOS_GROUP : undefined,
  });

  const {
    photoPaths,
    setPhotoPaths,
    dropPaths,
    fetchThumb,
    fullscreen,
    index,
    direction,
    hideLabels,
    openAt,
    close: handleFullscreenClose,
    next: handleNext,
    prev: handlePrev,
    toggleMaximize: handleMaximizeWindow,
  } = useGalleryViewer({ displayList, flattenedRows, virtuosoRef });

  const { canDelete, requestDelete, confirmProps } = useGalleryDelete({
    viewerId: personId,
    setPhotos,
    dropPaths,
  });

  const { activeGroupIndex, handleRangeChanged, scrubberMode } =
    useGalleryScrubber({ groupBy, groupCounts });

  const groupFirstPhotos = useGroupFirstPhotos(
    displayList,
    photoCountsPerGroup,
  );

  // -------------------------------------------------------------------------

  // IPC context menu listeners
  useEffect(() => {
    const { ipcRenderer } = window.electron || {};
    if (!ipcRenderer) return undefined;
    ipcRenderer.removeAllListeners?.("photo:open");
    ipcRenderer.removeAllListeners?.("photo:delete");
    ipcRenderer.removeAllListeners?.("photo:meta-response");

    ipcRenderer.on("photo:open", (_, payload) => {
      const id =
        payload && typeof payload === "object" ? payload.id : payload;
      const p = photosRef.current?.find((x) => x.id === id);
      if (p) selectPhoto(p);
    });
    // Удаление из контекстного меню окна идёт через то же подтверждение,
    // что и кнопка на карточке.
    ipcRenderer.on("photo:delete", (_, id) => {
      const p = photosRef.current?.find((x) => x.id === id);
      if (p) requestDelete(p);
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
  }, [requestDelete]);

  // Действия панели-инспектора для выбранного фото.
  useEffect(() => {
    setInspectorActions({
      openFullscreen: openAt,
      openFaces: (photo) => {
        setFacesDialogPhoto(photo);
        setFacesDialogOpen(true);
      },
      openPreview: (photo) => {
        setPreviewDialogPhoto(photo);
        setPreviewDialogOpen(true);
      },
      onSaved: (photo, { ownerChanged, filenameChanged } = {}) => {
        if (ownerChanged || filenameChanged) dropPaths(photo.id);
        setRefreshTrigger((r) => r + 1);
        if (refresh) refresh();
      },
    });
  }, [openAt, dropPaths, setInspectorActions, refresh]);

  const currentPhotoInfo = useMemo(() => {
    const photo = displayList[index];
    if (!photo) return null;
    const owner = allPeople.find((p) => p.id === photo.owner);
    const ownerText = owner
      ? `${owner.gender === "male" ? "Добавил" : "Добавила"}: ${owner.firstName}`
      : "Неизвестно";
    const peopleText = buildPhotoAttendeesText(photo, allPeople, allExternal);
    return { ...photo, ownerText, peopleText };
  }, [index, displayList, allPeople, allExternal]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          // Та же высота, что и в общей галерее: до нижнего окна только шапка.
          height: `calc(100vh - ${DRAWER_HEADER_HEIGHT}px)`,
          width: "100%",
          // position: "relative",
        }}
      >
        <Box
          ref={galleryRef}
          onClick={(event) => {
            // Клик по пустому месту галереи снимает выделение,
            // клики по самим фото и их кнопкам — нет.
            if (event.target.closest("[data-photo-cell]")) return;
            clearSelection();
          }}
          sx={{
            flex: 1,
            // Полоса справа под колонку годов — та же ширина сетки, что и в
            // общей галерее.
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
            bgcolor: "transparent",
            position: "relative",
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
              style={{ height: "100%", width: "100%" }}
              groupCounts={groupCounts}
              rangeChanged={handleRangeChanged}
              groupContent={(idx) => (
                <Box
                  sx={{
                    py: 1,
                    px: 2,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: alpha(theme.palette.background.default, 0.9),
                    backdropFilter: "blur(6px)",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    zIndex: 1,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    {groupBy === "byType" ? (
                      <PersonPinCircleIcon fontSize="small" color="primary" />
                    ) : (
                      <CalendarMonthIcon fontSize="small" color="action" />
                    )}
                    <Typography variant="subtitle2" sx={{
                      fontWeight: "bold"
                    }}>
                      {headers[idx]}
                    </Typography>
                  </Stack>
                  <Chip
                    label={photoCountsPerGroup[idx]}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, mr: 5 }}
                  />
                </Box>
              )}
              itemContent={(idx) => {
                const rowItems = flattenedRows[idx];
                return (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                      gap: 1,
                      py: 0.5,
                    }}
                  >
                    {rowItems.map((item) => {
                      if (!photoPaths.thumbs[item.id]) fetchThumb(item);

                      return (
                        <Box
                          key={item.id}
                          data-photo-cell
                          sx={{ minWidth: 0, height: rowHeight }}
                        >
                          <PhotoCell
                            scope={"personal_gallery"}
                            photo={item}
                            path={photoPaths.thumbs[item.id]}
                            onOpen={() => openAt(item)}
                            onDownload={onDownload}
                            onSelect={(p) => selectPhoto(p, { open: false })}
                            selected={selectedId === item.id}
                            onEdit={(p) => selectPhoto(p)}
                            canDelete={canDelete(item)}
                            onDelete={requestDelete}
                            rowHeight={rowHeight}
                            isDark={isDark}
                            allPeople={allPeople}
                            allExternal={allExternal}
                            personId={personId}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                );
              }}
            />
          )}
        </Box>

        {/* Колонка годов — как в общей галерее: плотность по группам и прыжок
            к группе по клику или перетаскиванию. */}
        <TimelineScrubber
          headers={headers}
          groupOffsets={groupOffsets}
          groupCounts={groupCounts}
          groupWeights={photoCountsPerGroup}
          activeGroupIndex={activeGroupIndex}
          mode={scrubberMode}
          anchorRef={galleryRef}
          virtuosoRef={virtuosoRef}
          getPreviewUrl={(i) => {
            const p = groupFirstPhotos[i];
            return p ? photoPaths.thumbs[p.id] : null;
          }}
          showCrosshairLine={false}
          rightOffset={photoPanelOpen ? INSPECTOR_PANEL_WIDTH : 0}
        />

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
          onSaved={() => {
            setRefreshTrigger((r) => r + 1);
            if (refresh) refresh();
          }}
        />

        <PhotoPreviewDialog
          open={previewDialogOpen}
          meta={previewDialogPhoto}
          onClose={() => setPreviewDialogOpen(false)}
          setPhotoPaths={setPhotoPaths}
        />

        <ConfirmDialog {...confirmProps} />

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
