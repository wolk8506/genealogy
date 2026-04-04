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
// import { alpha } from "@mui/material/styles";
import InfoIcon from "@mui/icons-material/Info";
import ArchiveIcon from "@mui/icons-material/Archive";
import MenuIcon from "@mui/icons-material/Menu";

import PersonIcon from "@mui/icons-material/Person";
import TuneIcon from "@mui/icons-material/Tune";
// import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import GroupIcon from "@mui/icons-material/Group";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import CollectionsIcon from "@mui/icons-material/Collections";
import DeleteIcon from "@mui/icons-material/Delete";

import { useLocation, matchPath, Link as RouterLink } from "react-router-dom"; // Link переименован в RouterLink
import { Routes, Route } from "react-router-dom"; // BrowserRouter обычно оборачивает App
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppDrawer, { DrawerHeader } from "./AppDrawer";

// import AddPersonPage from "../pages/Page_AddPersonPage/AddPersonPage";
import PersonPage from "../pages/Page_Person/PersonPage";
import PeopleListPage from "../pages/Page_Main/PeopleListPage";
// import PhotoUploader from "../pages/Page_PhotoUploader/PhotoUploader";
import GlobalPhotoGallery from "../pages/Page_GlobalPhotoGallery/GlobalPhotoGallery";
import AboutPage from "../pages/Page_About/AboutPage";
import ArchivedPeoplePage from "../pages/Page_Settings/ArchivedPeoplePage";
import { UpdateBanner } from "../pages/Page_Settings/UpdateBanner";

import LicenseModal from "./LicenseModal";
import { useSnackbar } from "notistack";
import NavigationButtons from "./NavigationButtons";
import ChangelogModal from "./ChangelogModal";
import UserGuideModal from "./UserGuideModal";

import GalleryToolbar from "./bar_GlobalPhotoGallery/GalleryToolbar";
import PeopleListToolbar from "./bar_PeopleListToolbar/PeopleListToolbar";
import PersonToolbar from "./bar_PeopleToolbar/PersonToolbar";
import { NotificationBell } from "./NotificationBell";

import DeletedPeoplePage from "../pages/Page_Main/DeletedPeoplePage";

const drawerItems = [
  { text: "Люди", icon: <GroupIcon />, path: "/" },
  {
    text: "Фотогалерея",
    icon: <CollectionsIcon />,
    path: "/globalPhotoGallery",
  },
  // { text: "Добавить человека", icon: <PersonAddAlt1Icon />, path: "/add" },
  // {
  //   text: "Загрузить фото",
  //   icon: <AddPhotoAlternateIcon />,
  //   path: "/photoUploader",
  // },
  // { text: "Архив", icon: <ArchiveIcon />, path: "/archive" },
  { text: "Настройки", icon: <TuneIcon />, path: "/settings" },
  { text: "О приложении", icon: <InfoIcon />, path: "/about" },
];

// const drawerWidth = 200;
const drawerWidth = 0;

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
  const [groupBy, setGroupBy] = useState("datePhoto");
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
    tags: [],
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
  // --- 1. Новые стейты и рефы ---
  const [isInfoEditing, setIsInfoEditing] = useState(false);
  const infoRequestToggleRef = useRef(null); // Ссылка на методы InfoSection (toggle, checkDirty, save, cancel)
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

  // --- 2. Обновленный обработчик смены вкладок ---

  const handleTabChange = (newTab) => {
    if (!newTab || typeof newTab !== "string") return;
    if (newTab === activeElement) return;

    // 1. ПРОВЕРКА АНКЕТЫ (Info)
    if (activeElement === "info" && isInfoEditing) {
      // Спрашиваем у рефа, есть ли изменения
      const isInfoDirty = infoRequestToggleRef.current?.checkDirty?.() || false;

      if (isInfoDirty) {
        const confirmLeave = window.confirm(
          "В анкете есть несохраненные изменения. При переключении вкладки они будут потеряны. Продолжить?",
        );
        if (!confirmLeave) return; // Блокируем переключение, выходим из функции
      }

      // Если пользователь нажал ОК или изменений нет —
      // сбрасываем режим редактирования перед уходом
      setIsInfoEditing(false);
    }

    // 2. ПРОВЕРКА БИОГРАФИИ (Bio)
    if (activeElement === "bio" && isBioEditing) {
      const isBioDirty = bioRequestToggleRef.current?.checkDirty?.() || false;

      if (isBioDirty) {
        const confirmLeave = window.confirm(
          "В биографии есть несохраненные изменения. Выйти?",
        );
        if (!confirmLeave) return;
      }
      setIsBioEditing(false);
    }

    // 3. ГАРАНТИРОВАННЫЙ ПЕРЕХОД (если проверки пройдены или их не было)
    setActiveElement(newTab);
  };

  // --- 3. Функция блокировки для Drawer (бокового меню) ---

  const handleNavigationAttempt = (path) => {
    // 1. Собираем статусы "грязности" из рефов
    const isInfoDirty = infoRequestToggleRef.current?.checkDirty?.() || false;
    const isBioDirty = bioRequestToggleRef.current?.checkDirty?.() || false;

    // 2. Если мы в режиме редактирования И есть изменения
    if ((isInfoEditing && isInfoDirty) || (isBioEditing && isBioDirty)) {
      // Показываем системное окно подтверждения
      const confirmLeave = window.confirm(
        "У вас есть несохраненные изменения. Если вы покинете страницу, они будут потеряны. Перейти?",
      );

      if (!confirmLeave) {
        // Пользователь нажал "Отмена" — остаемся на текущей странице
        return;
      }

      // Если пользователь нажал "ОК" — сбрасываем стейты редактирования,
      // чтобы при возврате не висел режим правки
      setIsInfoEditing(false);
      setIsBioEditing(false);
    }

    // 3. Если правок нет ИЛИ пользователь разрешил уйти — переходим
    navigate(path);
    setOpen(false); // Закрываем боковое меню
    setIsInfoEditing(false);
    setIsBioEditing(false);
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
    setOpen(!open);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

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
  } else if (location.pathname === "/trash") {
    pageTitle = (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          <DeleteIcon color={isDark ? "primary" : "prymary"} />
        </Box>
        <Typography variant="h6" noWrap>
          Корзина
        </Typography>
      </Box>
    );
  }

  // ---  РАБОТА С ПЛАТФОРМОЙ И РАЗМЕРОМ ОКНА. -------------
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  useEffect(() => {
    // Используем прямой доступ к API, который ты прописал
    const handleState = (event, state) => setIsMaximized(state);

    window.electron.ipcRenderer.on("window-state-change", handleState);

    // КРИТИЧНО: Узнаем начальное состояние сразу
    // Если в preload есть доступ к remote или ipcRenderer.sendSync
    // setIsMaximized(window.electron.ipcRenderer.sendSync('get-window-state'));

    return () => {
      window.electron.ipcRenderer.removeAllListeners("window-state-change");
    };
  }, []);

  // На Mac: если FullScreen -> 0, если окно -> 64px
  const appBarHeight = isMac ? (isMaximized ? 0 : "64px") : 0;

  // -------------------------------------------------------

  return (
    <>
      <Box sx={{ display: "flex", height: 50 }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          open={open}
          sx={{
            transition: "none !important",
            // WebkitAppRegion: isMaximized ? "no-drag" : "drag",

            WebkitAppRegion: "drag", // Делаем бар перетаскиваемым
            height: 50,
            // ----
            // bgcolor: "transparent",
            backdropFilter: "blur(4px)",
          }}
        >
          <Toolbar
            sx={{
              minHeight: "50px !important", // Фиксируем высоту
              height: 50,
              ml: appBarHeight,
              display: "flex",
              alignItems: "center",
            }}
          >
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={[
                {
                  marginRight: 1,
                  WebkitAppRegion: "no-drag",
                },
                // open && { display: "none" },
              ]}
            >
              {!open ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>

            <NavigationButtons />
            <NotificationBell />

            {match && (
              <PersonToolbar
                activeElement={activeElement}
                setActiveElement={handleTabChange}
                // infoProps={{
                //   personPageRef: personPageRef,
                // }}
                infoProps={{
                  personPageRef: personPageRef,
                  isEditing: isInfoEditing,
                  // Эти функции должны быть проброшены в PersonPage -> InfoSection
                  requestToggleEdit: () =>
                    infoRequestToggleRef.current?.toggle(),
                  onSave: () => infoRequestToggleRef.current?.save(),
                  onCancel: () => infoRequestToggleRef.current?.cancel(),
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
            {!isGalleryPage &&
              !match &&
              location.pathname !== "/" &&
              location.pathname !== "/archive" && (
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
          // items={drawerItems}
          items={drawerItems.map((item) => ({
            ...item,
            onClick: () => handleNavigationAttempt(item.path), // Перехватываем клик
          }))}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            // pt: 1,
            pr: 1,
            pb: 1,
            pl: 1,
            // width: "calc(100% - 64px)",
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
            {/* <Route path="/add" element={<AddPersonPage />} /> */}
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
                  infoProps={{
                    isEditing: isInfoEditing,
                    setIsEditing: setIsInfoEditing,
                    requestToggleRef: infoRequestToggleRef, // Реф для связи с тулбаром
                  }}
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
            <Route path="/settings" element={<ArchivedPeoplePage />} />

            {/* <Route path="/photoUploader" element={<PhotoUploader />} /> */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/trash" element={<DeletedPeoplePage />} />
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
