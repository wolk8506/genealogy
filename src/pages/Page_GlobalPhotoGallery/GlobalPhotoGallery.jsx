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
  Paper,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { GroupedVirtuoso } from "react-virtuoso";
import ManIcon from "@mui/icons-material/Man";
import WomanIcon from "@mui/icons-material/Woman";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import PhotoMetaUpdateDialog from "../../components/Dialog/PhotoMetaUpdateDialog";
import PhotoCell from "../../components/PhotoCell";
import onDownload from "../utils/onDownload";
import PhotoMetaDialog from "../../components/PhotoMetaDialog";
import { ButtonScrollTop } from "../../components/ButtonScrollTop";
import PhotoUploadDialog from "../../components/Dialog/PhotoUploadDialog";
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

  const [showNav, setShowNav] = useState(false);
  const [hoveredDecade, setHoveredDecade] = useState(null);
  const [activeHeader, setActiveHeader] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);

  const [scrollTop, setScrollTop] = useState(0);

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

  // 2. Дерево навигации
  const navigationTree = useMemo(() => {
    const tree = { decades: {}, noDate: [] };
    if (groupBy !== "datePhoto" && groupBy !== "owner") return tree;

    headers.forEach((h, idx) => {
      const s = String(h);
      const yearMatch = s.match(/^\d{4}/);
      if (groupBy === "datePhoto" && yearMatch) {
        const year = yearMatch[0];
        const decade = year.substring(0, 3) + "0";
        if (!tree.decades[decade]) tree.decades[decade] = {};
        if (!tree.decades[decade][year]) tree.decades[decade][year] = [];
        tree.decades[decade][year].push({ label: s, index: idx });
      } else {
        tree.noDate.push({ label: s, index: idx });
      }
    });
    return tree;
  }, [headers, groupBy]);

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
    const peopleText = (photo.people || [])
      .map((id) => {
        const p = allPeople.find((x) => x.id === id);
        return p ? `${p.firstName} ${p.lastName || ""}`.trim() : id;
      })
      .join(", ");
    return { ...photo, ownerText, peopleText };
  }, [index, displayList, allPeople]);

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );

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
          mr: groupBy === "datePhoto" || groupBy === "owner" ? 6.2 : 0,
        }}
      >
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
                  sx={{ height: 20, mr: 5 }}
                />
              </Box>
            );
          }}
          itemContent={(idx) => (
            <Stack direction="row" spacing={1} sx={{ px: 2, py: 0.5 }}>
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
                      rowHeight={Math.floor((windowWidth * 0.9) / columnsCount)}
                      allPeople={allPeople}
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
        <ButtonScrollTop targetRef={virtuosoRef} scrollOffset={scrollTop} />
      </Box>

      {/* МАШИНА ВРЕМЕНИ (НАВИГАЦИЯ) */}
      {(groupBy === "datePhoto" || groupBy === "owner") && (
        <Box
          onMouseEnter={() => setShowNav(true)}
          onMouseLeave={() => {
            setShowNav(false);
            setHoveredDecade(null);
          }}
          sx={{
            position: "fixed",
            right: 0,
            top: 100,
            bottom: 60,
            width: showNav ? (groupBy === "owner" ? "180px" : "90px") : "75px",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s ease",
            bgcolor: showNav
              ? alpha(theme.palette.background.paper, 0.9)
              : "transparent",
            // backdropFilter: showNav ? "blur(12px)" : "none",
            backdropFilter: "blur(10px)",
            borderLeft: showNav ? "1px solid" : "none",
            borderColor: "divider",
            borderTopLeftRadius: "15px",
            borderBottomLeftRadius: "15px",
          }}
        >
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              py: 1,
              overflow: "hidden",
            }}
          >
            {/* Рендер десятилетий */}
            {Object.keys(navigationTree.decades).length > 0 &&
              Object.keys(navigationTree.decades)
                .sort((a, b) => b - a)
                .map((decade) => {
                  const isCurrentDecade = activeHeader.startsWith(
                    decade.substring(0, 3),
                  );
                  const isHovered = hoveredDecade === decade;
                  const isOpen =
                    isHovered || (isCurrentDecade && !hoveredDecade);
                  return (
                    <Box
                      key={decade}
                      onMouseEnter={() => setHoveredDecade(decade)}
                      sx={{
                        flex: isOpen ? "4 1 auto" : "1 1 auto",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        transition: "all 0.4s ease",
                        borderBottom: "1px solid",
                        borderColor: alpha(theme.palette.divider, 0.05),
                        minHeight: "35px",
                      }}
                    >
                      <Box
                        sx={{
                          minHeight: "35px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          pr: 2,
                        }}
                      >
                        <Typography
                          noWrap
                          sx={{
                            fontSize: "12px",
                            fontWeight: "bold",
                            color: isOpen ? "primary.main" : "text.secondary",
                          }}
                        >
                          {decade}-е
                        </Typography>
                      </Box>
                      {isOpen && (
                        <Box
                          sx={{
                            flexGrow: 1,
                            overflowY: "auto",
                            pr: 1,
                            pb: 1,
                            scrollbarWidth: "none",
                            "&::-webkit-scrollbar": { display: "none" },
                          }}
                        >
                          <Stack
                            spacing={0.5}
                            sx={{ alignItems: "flex-end", pr: 1 }}
                          >
                            {Object.keys(navigationTree.decades[decade])
                              .sort((a, b) => b - a)
                              .map((year) => {
                                const isYearActive =
                                  activeHeader.startsWith(year);
                                return (
                                  <Box
                                    key={year}
                                    sx={{ width: "100%", textAlign: "right" }}
                                  >
                                    <Typography
                                      onClick={() =>
                                        virtuosoRef.current.scrollToIndex({
                                          index:
                                            groupOffsets[
                                              navigationTree.decades[decade][
                                                year
                                              ][0].index
                                            ],
                                          align: "start",
                                          behavior: "smooth",
                                        })
                                      }
                                      sx={{
                                        fontSize: isYearActive
                                          ? "13px"
                                          : "11px",
                                        cursor: "pointer",
                                        color: isYearActive
                                          ? "primary.main"
                                          : "text.primary",
                                        fontWeight: isYearActive
                                          ? "bold"
                                          : "500",
                                      }}
                                    >
                                      {year}
                                    </Typography>
                                    {isYearActive && (
                                      <Stack
                                        spacing={0.3}
                                        sx={{
                                          mt: 0.5,
                                          mb: 1,
                                          borderRight: "2px solid",
                                          borderColor: "primary.main",
                                          pr: 1,
                                        }}
                                      >
                                        {navigationTree.decades[decade][
                                          year
                                        ].map((item) => {
                                          const formatLabel = (label) => {
                                            const s = String(label);
                                            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                                              const d = new Date(s);
                                              const m = d
                                                .toLocaleString("ru-RU", {
                                                  month: "short",
                                                })
                                                .replace(".", "");
                                              return `${m.charAt(0).toUpperCase() + m.slice(1)}•${d.getDate()}`;
                                            }
                                            return s;
                                          };
                                          return (
                                            <Typography
                                              key={item.index}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                virtuosoRef.current.scrollToIndex(
                                                  {
                                                    index:
                                                      groupOffsets[item.index],
                                                    align: "start",
                                                    behavior: "smooth",
                                                  },
                                                );
                                              }}
                                              sx={{
                                                fontSize: "10px",
                                                color:
                                                  activeHeader === item.label
                                                    ? "primary.main"
                                                    : "text.secondary",
                                                cursor: "pointer",
                                                whiteSpace: "nowrap",
                                                fontFamily: "monospace",
                                              }}
                                            >
                                              {formatLabel(item.label)}
                                            </Typography>
                                          );
                                        })}
                                      </Stack>
                                    )}
                                  </Box>
                                );
                              })}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  );
                })}

            {/* БЛОК "БЕЗ ДАТЫ" или "ЛЮДИ" */}
            {navigationTree.noDate.length > 0 && (
              <Box
                onMouseEnter={() => setHoveredDecade("noDate")}
                sx={{
                  flex:
                    hoveredDecade === "noDate" || groupBy === "owner"
                      ? "4 1 auto"
                      : "0 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "all 0.4s ease",
                  mt: "auto",
                  borderTop: "1px dashed",
                  borderColor: "divider",
                  minHeight: "35px",
                }}
              >
                <Box
                  sx={{
                    minHeight: "35px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    pr: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color:
                        activeHeader === "Без даты" ||
                        hoveredDecade === "noDate"
                          ? "primary.main"
                          : "text.secondary",
                    }}
                  >
                    {groupBy === "owner" ? "Люди" : "Без даты"}
                  </Typography>
                </Box>
                {(hoveredDecade === "noDate" || groupBy === "owner") && (
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: "auto",
                      pr: 2,
                      pb: 1,
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
                      {navigationTree.noDate.map((item) => (
                        <Typography
                          key={item.index}
                          onClick={() =>
                            virtuosoRef.current.scrollToIndex({
                              index: groupOffsets[item.index],
                              align: "start",
                              behavior: "smooth",
                            })
                          }
                          sx={{
                            fontSize: "10px",
                            color:
                              activeHeader === item.label
                                ? "primary.main"
                                : "text.secondary",
                            cursor: "pointer",
                            textAlign: "right",
                          }}
                        >
                          {item.label}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

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
