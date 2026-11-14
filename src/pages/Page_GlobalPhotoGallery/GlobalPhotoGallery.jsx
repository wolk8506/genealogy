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
import { useModalStore } from "../../store/useModalStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { usePhotoInspectorStore } from "../../store/usePhotoInspectorStore";
import { useLayoutStore } from "../../store/useLayoutStore";
import {
  DRAWER_EXPANDED_EXTRA,
  DRAWER_HEADER_HEIGHT,
} from "../../layout/AppDrawer";
import ConfirmDialog from "../../components/Dialog/ConfirmDialog";
import {
  useGalleryLayout,
  useGroupFirstPhotos,
} from "../../features/photoGallery/useGalleryLayout";
import { useGalleryViewer } from "../../features/photoGallery/useGalleryViewer";
import { useGalleryScrubber } from "../../features/photoGallery/useGalleryScrubber";
import { useGalleryDelete } from "../../features/photoGallery/useGalleryDelete";
import { INSPECTOR_PANEL_WIDTH } from "../../layout/inspectorPanelTransition";
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

  const [galleryWidth, setGalleryWidth] = useState(0);
  const [facesDialogOpen, setFacesDialogOpen] = useState(false);
  const [facesDialogPhoto, setFacesDialogPhoto] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewDialogPhoto, setPreviewDialogPhoto] = useState(null);

  const [openInfo, setOpenInfo] = useState(false);
  const [metaInfo, setMetaInfo] = useState(null);

  const scrollAreaRef = useRef(null);

  const [allExternal, setAllExternal] = useState([]);

  // Домашний человек определяет, чьи снимки можно удалять из общей ленты.
  const homePersonId = useSettingsStore(
    (state) => state.appSettings.homePersonId,
  );

  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
  }, [photos]);

  const isOpen = useModalStore((state) => state.isGlobalPhotoUploadOpen);
  const closeUpload = useModalStore((state) => state.closeGlobalPhotoUpload);
  const selectedId = usePhotoInspectorStore((state) => state.selectedId);
  const photoPanelOpen = usePhotoInspectorStore((state) => state.open);
  const drawerOpen = useLayoutStore((state) => state.drawerOpen);
  const selectPhoto = usePhotoInspectorStore((state) => state.select);
  const setInspectorActions = usePhotoInspectorStore(
    (state) => state.setActions,
  );
  const registerSource = usePhotoInspectorStore((state) => state.registerSource);
  const clearSelection = usePhotoInspectorStore(
    (state) => state.clearSelection,
  );

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

  // Ширину берём у самой галереи: при открытой правой панели она уже окна.
  const layoutWidth = galleryWidth || Math.max(320, window.innerWidth - 80);

  useEffect(() => {
    const node = scrollAreaRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      setGalleryWidth((prev) => (Math.abs(prev - width) > 1 ? width : prev));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
    selectedPeople,
    groupBy,
    sortDir,
    layoutWidth,
    chromeInset:
      (drawerOpen ? DRAWER_EXPANDED_EXTRA : 0) +
      (photoPanelOpen ? INSPECTOR_PANEL_WIDTH : 0),
    allPeople,
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

  // Удалять здесь можно снимки домашнего человека — тот же порядок, что и на
  // странице человека, чтобы удаление не зависел от того, откуда смотрят.
  const { canDelete, requestDelete, confirmProps } = useGalleryDelete({
    viewerId: homePersonId,
    setPhotos,
    dropPaths,
  });

  const getOwnerName = useCallback(
    (ownerId) => {
      const person = allPeople?.find((x) => x.id === ownerId);
      if (!person) return "Неизвестно";
      return `${person.lastName || person.maidenName || ""} ${
        person.firstName || ""
      }`.trim();
    },
    [allPeople],
  );

  const { activeGroupIndex, handleRangeChanged, scrubberMode } =
    useGalleryScrubber({ groupBy, groupCounts });

  const groupFirstPhotos = useGroupFirstPhotos(
    displayList,
    photoCountsPerGroup,
  );

  // Действия правой панели-инспектора для выбранного фото.
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
        refresh();
      },
    });
  }, [openAt, dropPaths, setInspectorActions, refresh]);

  // ----------------------------------------------

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
      const photo = displayList.find((p) => p.id === id);
      if (photo) selectPhoto(photo);
    });

    ipcRenderer.on("photo:delete", (_, id) => {
      const photo = displayList.find((p) => p.id === id);
      if (photo) requestDelete(photo);
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
  }, [displayList, selectPhoto, requestDelete]);

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

  // if (isLoading)
  //   return (
  //     <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
  //       <CircularProgress />
  //     </Box>
  //   );

  return (
    <Box
      onClick={(event) => {
        // Клик по пустому месту галереи снимает выделение.
        // Клики по фото и элементам управления его не снимают, а шапка
        // и боковое меню лежат вне этого контейнера и сюда не попадают.
        if (event.target.closest("[data-photo-cell]")) return;
        clearSelection();
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        // От нижнего края окна галерею отделяет только шапка: 60 px давали
        // видимую пустую полосу под последним рядом.
        height: `calc(100vh - ${DRAWER_HEADER_HEIGHT}px)`,
        bgcolor: "transparent",
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
              <Stack spacing={3} sx={{
                alignItems: "center"
              }}>
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
                  <Stack direction="row" spacing={1} sx={{
                    alignItems: "center"
                  }}>
                    {Icon}
                    <Typography variant="subtitle2" sx={{
                      fontWeight: "bold"
                    }}>
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
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                  gap: 1,
                  py: 0.5,
                }}
              >
                {flattenedRows[idx]?.map((item) => {
                  if (!photoPaths.thumbs[item.id]) fetchThumb(item);
                  return (
                    <Box
                      key={item.id}
                      data-photo-cell
                      sx={{ minWidth: 0, height: rowHeight }}
                    >
                      <PhotoCell
                        photo={item}
                        path={photoPaths.thumbs[item.id]}
                        selected={selectedId === item.id}
                        onSelect={(p) => selectPhoto(p, { open: false })}
                        onOpen={() => openAt(item)}
                        isDark={isDark}
                        rowHeight={rowHeight}
                        allPeople={allPeople}
                        allExternal={allExternal}
                        onEdit={(p) => selectPhoto(p)}
                        onDownload={onDownload}
                        canDelete={canDelete(item)}
                        onDelete={requestDelete}
                        personId={homePersonId}
                      />
                    </Box>
                  );
                })}
              </Box>
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
        rightOffset={photoPanelOpen ? INSPECTOR_PANEL_WIDTH : 0}
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

      <ConfirmDialog {...confirmProps} />
    </Box>
  );
}
