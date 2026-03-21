// MainLayout.jsx
import { styled, useTheme } from "@mui/material/styles";

import {
  Box,
  Toolbar,
  CssBaseline,
  Typography,
  IconButton,
} from "@mui/material";

import MuiAppBar from "@mui/material/AppBar";
import { alpha } from "@mui/material/styles";
import InfoIcon from "@mui/icons-material/Info";
import ArchiveIcon from "@mui/icons-material/Archive";
import MenuIcon from "@mui/icons-material/Menu";

import PersonIcon from "@mui/icons-material/Person";
import TuneIcon from "@mui/icons-material/Tune";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import GroupIcon from "@mui/icons-material/Group";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CollectionsIcon from "@mui/icons-material/Collections";
// import { ToggleButton, ToggleButtonGroup } from "@mui/material";

import { useLocation, matchPath, Link as RouterLink } from "react-router-dom"; // Link переименован в RouterLink
import { Routes, Route } from "react-router-dom"; // BrowserRouter обычно оборачивает App
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppDrawer, { DrawerHeader } from "./AppDrawer";
import SettingsPage from "../pages/Page_Settings/SettingsPage";
import AddPersonPage from "../pages/Page_AddPersonPage/AddPersonPage";
import PersonPage from "../pages/Page_Person/PersonPage";
import PeopleListPage from "../pages/Page_Main/PeopleListPage";
import PhotoUploader from "../pages/Page_PhotoUploader/PhotoUploader";
import GlobalPhotoGallery from "../pages/Page_GlobalPhotoGallery/GlobalPhotoGallery";
import AboutPage from "../pages/Page_About/AboutPage";
import ArchivedPeoplePage from "../pages/Page_Archived/ArchivedPeoplePage";
import { UpdateBanner } from "../pages/Page_Settings/UpdateBanner";

import LicenseModal from "./LicenseModal";
import { useSnackbar } from "notistack";
import NavigationButtons from "./NavigationButtons";
import ChangelogModal from "./ChangelogModal";
import UserGuideModal from "./UserGuideModal";

import GalleryToolbar from "./bar_GlobalPhotoGallery/GalleryToolbar";
import PeopleListToolbar from "./bar_PeopleListToolbar/PeopleListToolbar";
import PersonToolbar from "./bar_PeopleToolbar/PersonToolbar";

const drawerItems = [
  { text: "Люди", icon: <GroupIcon />, path: "/" },
  {
    text: "Фотогалерея",
    icon: <CollectionsIcon />,
    path: "/globalPhotoGallery",
  },
  { text: "Добавить человека", icon: <PersonAddAlt1Icon />, path: "/add" },
  {
    text: "Загрузить фото",
    icon: <AddPhotoAlternateIcon />,
    path: "/photoUploader",
  },
  { text: "Архив", icon: <ArchiveIcon />, path: "/archive" },
  { text: "Настройки", icon: <TuneIcon />, path: "/settings" },
  { text: "О приложении", icon: <InfoIcon />, path: "/about" },
];

const drawerWidth = 240;

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

export default function MainLayout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navigate = useNavigate();
  // !!!  ▼▼▼   GlobalPhotoGallery  ▼▼▼
  const [isLicenseOpen, setLicenseOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  // const [search, setSearch] = useState("");
  const [gallerySearch, setGallerySearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [groupBy, setGroupBy] = useState("none");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [allPeople, setAllPeople] = useState([]); // Нужно загрузить список людей здесь для Autocomplete
  const [photos, setPhotos] = useState([]); // Добавляем этот стейт
  const [loading, setLoading] = useState(true);
  // !!!  ▲▲▲   GlobalPhotoGallery  ▲▲▲
  // !!!  ▼▼▼   PeopleList  ▼▼▼
  // Внутри MainLayout
  const [peopleSearch, setPeopleSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [filters, setFilters] = useState({
    created: "",
    edited: "",
    gens: [],
    showRelations: false,
  });

  // Вычисляем, активен ли фильтр (для подсветки кнопки в тулбаре)
  const isFilterActive = !!(
    filters.created ||
    filters.edited ||
    filters.gens.length > 0 ||
    filters.showRelations
  );

  // Сортировка поколений
  const [sortOrder, setSortOrder] = useState("asc");
  // Удобная функция для частичного обновления фильтров
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  // !!!  ▲▲▲   PeopleList  ▲▲▲
  // !!!  ▼▼▼   Person Page  ▼▼▼
  // info
  const personPageRef = useRef(null);
  // tree
  const [treeMode, setTreeMode] = useState("descendants");
  const treePageRef = useRef(null); // Для вызова handleExport
  // photo
  const [activeElement, setActiveElement] = useState("info"); // "info" - анкета, "photo" - фотографии
  const [galleryPersonSearch, setGalleryPersonSearch] = useState("");
  const [galleryGroupBy, setGalleryGroupBy] = useState("none");
  const [gallerySortDir, setGallerySortDir] = useState("desc");
  // bio
  const [isBioEditing, setIsBioEditing] = useState(false);
  const bioExecRef = useRef(null); // Ссылка на команды Milkdown
  const bioRequestToggleRef = useRef(null); // Сюда BiographySection положит свою функцию проверки "грязности"

  // Чтобы открыть диалог загрузки из Toolbar, нам понадобится триггер или глобальный стейт
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const match = matchPath("/person/:id", location.pathname);

  useEffect(() => {
    // Если мы НЕ на странице человека, сбрасываем выбор на "информацию"
    if (!match) {
      setActiveElement("info");
      setUploadTrigger(0);
      setGalleryPersonSearch("");
    }
  }, [location.pathname, match]);
  // Добавьте сброс при смене вкладок внутри карточки
  useEffect(() => {
    if (activeElement !== "photo") {
      setUploadTrigger(0);
    }
  }, [activeElement]);

  const handleTabChange = (newTab) => {
    // Проверяем через реф, "грязная" ли био
    const isDirty = bioRequestToggleRef.current?.checkDirty?.();

    if (activeElement === "bio" && isBioEditing && isDirty) {
      // Если грязная — не меняем вкладку сразу, а просим био открыть модалку
      bioRequestToggleRef.current.askSave(`changeTab:${newTab}`);
    } else {
      // Если не грязная или мы не в био — просто переключаем
      setActiveElement(newTab);
    }
  };

  // !!!  ▲▲▲   Person Page  ▲▲▲

  // Оборачиваем в useCallback, чтобы функцию можно было безопасно передавать вниз
  const refreshAppData = useCallback(async () => {
    try {
      const [people, list] = await Promise.all([
        window.peopleAPI.getAll(),
        window.photoAPI.getAllGlobal(),
      ]);
      setAllPeople(people || []);
      setPhotos(list || []);
    } catch (e) {
      console.error("Ошибка синхронизации данных:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ЭФФЕКТ 1: Обновление при смене страницы
  useEffect(() => {
    refreshAppData();
  }, [location.pathname, refreshAppData]);
  // Проверяем, на странице ли мы галереи
  const isGalleryPage = location.pathname === "/globalPhotoGallery";

  // Открывает лицензию
  useEffect(() => {
    window.electron.ipcRenderer.on("open-license-modal", () => {
      setLicenseOpen(true);
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("open-license-modal");
    };
  }, []);

  // Проверка обновление через меню
  useEffect(() => {
    window.electron.ipcRenderer.on("check-for-updates", () => {
      // Эта функция вызовется при нажатии
      window.electron.ipcRenderer.send("trigger-update-check");
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("check-for-updates");
    };
  }, []);

  useEffect(() => {
    window.electron.ipcRenderer.on(
      "update:manual-check-result",
      (event, result) => {
        if (result.status === "available") {
          enqueueSnackbar(`🔔 Доступна новая версия: ${result.version}`, {
            variant: "info",
          });
        } else if (result.status === "up-to-date") {
          enqueueSnackbar(
            `✅ Установлена актуальная версия: ${result.version}`,
            { variant: "success" },
          );
        } else if (result.status === "error") {
          enqueueSnackbar(`❌ Ошибка: ${result.message}`, {
            variant: "error",
          });
        }
      },
    );

    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        "update:manual-check-result",
      );
    };
  }, []);

  useEffect(() => {
    // Вызываем API и сохраняем функцию отписки в переменную
    const unsubscribe = window.navigationAPI.onNavigate((route) => {
      navigate(route);
    });

    // Возвращаем cleanup-функцию для React
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [navigate]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  // ------------------------------------------------------
  // Подсчет новых изменений для Badge
  const [changesCount, setChangesCount] = useState(0);

  useEffect(() => {
    window.peopleAPI.getAll().then((data) => {
      const lastVisit = localStorage.getItem("lastVisitPeoplePage");
      const lastVisitTime = lastVisit ? new Date(lastVisit).getTime() : 0;
      const count = data.filter((p) => {
        const created = new Date(p.createdAt).getTime();
        const edited = new Date(p.editedAt).getTime();
        return created > lastVisitTime || edited > lastVisitTime;
      }).length;
      setChangesCount(count);
    });
  }, [location.pathname]); // пересчитываем при смене маршрута
  // ------------------------------------------------------
  const [person, setPerson] = useState(null);
  // const match = matchPath("/person/:id", location.pathname);
  const id = Number(match?.params?.id);

  useEffect(() => {
    if (!id) return;
    window.peopleAPI.getById(id).then((personData) => {
      setPerson(personData);
    });
  }, [id]);

  const currentItem = drawerItems.find((item) =>
    matchPath({ path: item.path, end: true }, location.pathname),
  );

  let pageTitle = "Genealogy";

  if (match) {
    const name =
      [person?.firstName, person?.lastName || person?.maidenName]
        .filter(Boolean)
        .join(" ") || "Без имени";

    pageTitle = (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          <PersonIcon color={isDark ? "primary" : "prymary"} />
        </Box>
        <Typography variant="h6" noWrap>
          Карточка человека :: {name}
        </Typography>
      </Box>
    );
  } else if (currentItem) {
    pageTitle = (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          {React.cloneElement(currentItem.icon, {
            color: isDark ? "primary" : "prymary",
            sx: { fontSize: 28 },
          })}
        </Box>
        <Typography variant="h6" noWrap>
          {currentItem.text}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar position="fixed" open={open}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={[
                {
                  marginRight: 5,
                },
                open && { display: "none" },
              ]}
            >
              <MenuIcon />
            </IconButton>

            <NavigationButtons />

            {match && (
              <PersonToolbar
                activeElement={activeElement}
                setActiveElement={handleTabChange}
                infoProps={{
                  personPageRef: personPageRef,
                }}
                photoProps={{
                  search: galleryPersonSearch,
                  setSearch: setGalleryPersonSearch,
                  groupBy: galleryGroupBy,
                  setGroupBy: setGalleryGroupBy,
                  sortDir: gallerySortDir,
                  setSortDir: setGallerySortDir,
                  onAddPhoto: () => setUploadTrigger((prev) => prev + 1),
                }}
                bioProps={{
                  isEditing: isBioEditing,
                  requestToggleEdit: () =>
                    bioRequestToggleRef.current?.toggle(),
                  execRef: bioExecRef,
                }}
                treeProps={{
                  treeMode: treeMode,
                  setTreeMode: setTreeMode,
                  onExport: () => {
                    if (treePageRef.current) {
                      treePageRef.current.handleExport();
                    } else {
                      console.warn("Древо еще не загружено или не в фокусе");
                    }
                  },
                  zoomIn: () => {
                    treePageRef.current?.zoomIn(); // Убедись, что имя рефа совпадает!
                  },
                  zoomOut: () => treePageRef.current?.zoomOut(),
                  fitView: () => treePageRef.current?.fitView(),
                }}
              />
            )}

            {/* 2. Если мы в галерее, показываем фильтры прямо здесь */}
            {isGalleryPage && (
              <GalleryToolbar
                allPeople={allPeople}
                selectedPeople={selectedPeople}
                setSelectedPeople={setSelectedPeople}
                photos={photos}
                groupBy={groupBy}
                setGroupBy={setGroupBy}
                sortBy={sortBy}
                sortDir={sortDir}
                setSortBy={setSortBy}
                setSortDir={setSortDir}
                search={gallerySearch} // Передаем стейт галереи
                setSearch={setGallerySearch} // Передаем сеттер галереи
              />
            )}

            {location.pathname === "/" && (
              <PeopleListToolbar
                people={allPeople} // Принимаем массив
                search={peopleSearch} // Передаем стейт людей
                setSearch={setPeopleSearch} // Передаем сеттер людей
                isFilterActive={isFilterActive} // Не забудь прокинуть этот флаг
                onOpenFilter={() => setFilterOpen(true)}
                sortOrder={sortOrder}
                onToggleSort={() =>
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                }
                onOpenStats={() => setStatsOpen(true)}
                filters={filters}
                updateFilter={updateFilter}
                allGenerations={Array.from(
                  new Set(allPeople.map((p) => String(p.generation))),
                )}
              />
            )}

            {/* Заголовок для остальных страниц */}
            {!isGalleryPage && !match && location.pathname !== "/" && (
              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                {pageTitle}
              </Box>
            )}
          </Toolbar>
        </AppBar>
        <AppDrawer
          open={open}
          onClose={handleDrawerClose}
          items={drawerItems}
          changesCount={changesCount}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: 1,
            pr: 1,
            pb: 3,
            pl: 1,
            width: "calc(100% - 64px)",
            // height: "100vh",
          }}
        >
          <DrawerHeader />
          <UpdateBanner onOpenSettings={() => navigate("/settings")} />
          <Routes>
            <Route
              path="/"
              element={
                <PeopleListPage
                  search={peopleSearch} // Используем стейт людей
                  filters={filters}
                  sortOrder={sortOrder}
                  statsOpen={statsOpen}
                  setStatsOpen={setStatsOpen}
                  filterOpen={filterOpen}
                  setFilterOpen={setFilterOpen}
                  setFilters={setFilters}
                />
              }
            />
            <Route path="/add" element={<AddPersonPage />} />
            <Route
              path="/globalPhotoGallery"
              element={
                <GlobalPhotoGallery
                  search={gallerySearch} // Используем стейт галереи
                  selectedPeople={selectedPeople}
                  groupBy={groupBy}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  initialPhotos={photos} // Данные
                  initialPeople={allPeople} // Данные
                  setPhotos={setPhotos} // Функция обновления
                  setAllPeople={setAllPeople} // Функция обновления
                  isLoading={loading}
                  allPeople={allPeople}
                  photos={photos}
                  refresh={refreshAppData} // Чтобы галерея могла сама обновить шапку
                />
              }
            />
            <Route path="/people" element={<PeopleListPage />} />
            <Route
              path="/person/:id"
              element={
                <PersonPage
                  ref={personPageRef}
                  activeElement={activeElement}
                  galleryProps={{
                    search: galleryPersonSearch,
                    groupBy: galleryGroupBy,
                    sortDir: gallerySortDir,
                    uploadTrigger: uploadTrigger,
                  }}
                  bioProps={{
                    isEditing: isBioEditing,
                    setIsEditing: setIsBioEditing,
                    execRef: bioExecRef,
                    requestToggleRef: bioRequestToggleRef, // Передаем реф для регистрации функции
                  }}
                  treeProps={{
                    mode: treeMode,
                    treePageRef: treePageRef, // Передаем реф
                  }}
                />
              }
            />
            <Route path="/archive" element={<ArchivedPeoplePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/photoUploader" element={<PhotoUploader />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Box>
      </Box>
      <LicenseModal
        open={isLicenseOpen}
        onClose={() => setLicenseOpen(false)}
      />
      <ChangelogModal />
      <UserGuideModal />
    </>
  );
}
