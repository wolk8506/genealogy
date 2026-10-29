// MainLayout.jsx
import { Routes, Route, useNavigate, Navigate } from "react-router-dom"; // BrowserRouter обычно оборачивает App
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  useLocation,
  matchPath,
  Link as RouterLink,
  useSearchParams,
} from "react-router-dom"; // Link переименован в RouterLink

import { useSnackbar } from "notistack";

import {
  Box,
  Toolbar,
  CssBaseline,
  Typography,
  IconButton,
  Stack,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  CircularProgress,
} from "@mui/material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import MuiAppBar from "@mui/material/AppBar";
// icon
import InfoIcon from "@mui/icons-material/Info";
import PersonIcon from "@mui/icons-material/Person";
import GroupIcon from "@mui/icons-material/Group";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import CollectionsIcon from "@mui/icons-material/Collections";
import MapIcon from "@mui/icons-material/Map";
import TimelineIcon from "@mui/icons-material/Timeline";
import ContactsIcon from "@mui/icons-material/Contacts";
import GearIcon from "../components/svg/GearIcon";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SearchIcon from "@mui/icons-material/Search";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

import AppDrawer, { DrawerHeader } from "./AppDrawer";
import useAppHotkeys from "../hooks/useAppHotkeys";

import PeopleListPage from "../pages/Page_Main/PeopleListPage";
import { UpdateBanner } from "../pages/Page_Settings/UpdateBanner";

// Тяжёлые страницы — ленивая загрузка отдельными чанками.
// Пути — статические строки в точном регистре (сборка на Linux чувствительна).
const PersonPage = lazy(() => import("../pages/Page_Person/PersonPage"));
const FamiliesPage = lazy(() => import("../pages/Page_Families/FamiliesPage"));
const FamilyInspector = lazy(
  () => import("../pages/Page_Families/panel/FamilyInspector"),
);
const GlobalPhotoGallery = lazy(
  () => import("../pages/Page_GlobalPhotoGallery/GlobalPhotoGallery"),
);
const AboutPage = lazy(() => import("../pages/Page_About/AboutPage"));
const ArchivedPeoplePage = lazy(
  () => import("../pages/Page_Settings/ArchivedPeoplePage"),
);
const FaceReviewQueuePage = lazy(
  () => import("../pages/Page_Settings/FaceReviewQueuePage"),
);
const FaceNoFacesQueuePage = lazy(
  () => import("../pages/Page_Settings/FaceNoFacesQueuePage"),
);
const DeletedPeoplePage = lazy(
  () => import("../pages/Page_Main/DeletedPeoplePage"),
);
const ExternalPeoplePage = lazy(
  () => import("../pages/Page_External/ExternalPeoplePage"),
);
const ExternalEntityPage = lazy(
  () => import("../pages/Page_External/ExternalEntityPage"),
);
const MapPage = lazy(() => import("../pages/Page_Map/MapPage"));
const TimelinePage = lazy(
  () => import("../pages/Page_Timeline/TimelinePage"),
);

function RouteFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
      <CircularProgress />
    </Box>
  );
}

import LicenseModal from "./LicenseModal";
import NavigationButtons from "./NavigationButtons";
import ChangelogModal from "./ChangelogModal";
import { NotificationBell } from "./NotificationBell";
import InspectorPanel from "./InspectorPanel";
import ExternalInspectorPanel from "./ExternalInspectorPanel";
import MapInspectorPanel from "./MapInspectorPanel";
import PhotoInspectorPanel from "./PhotoInspectorPanel";
import SidebarRightIcon from "../components/svg/SidebarRightIcon";
import useMemories from "../hooks/useMemories";
import { countPendingReviewFaces, countNoFacePhotos } from "../utils/photoFaces";
import { useFaceReviewStore } from "../store/useFaceReviewStore";
import { usePeopleListStore } from "../store/usePeopleListStore";
import { usePhotoInspectorStore } from "../store/usePhotoInspectorStore";

import GalleryToolbar from "./bar_GlobalPhotoGallery/GalleryToolbar";
import FamiliesToolbar from "./bar_Families/FamiliesToolbar";
import TimelineToolbar from "./bar_Timeline/TimelineToolbar";
import {
  parseTimelineSearch,
  applyTimelineNav,
  clearTimelinePerson,
} from "../pages/Page_Timeline/timelineUrl";
import MapToolbar from "./bar_Map/MapToolbar";
import PeopleListToolbar from "./bar_PeopleListToolbar/PeopleListToolbar";
import PersonToolbar from "./bar_PeopleToolbar/PersonToolbar";
import ExternalToolbar from "./bar_External/ExternalToolbar";

import ButtonConteiner from "../components/ButtonConteiner";
import SidebarLeftIcon from "../components/svg/SidebarLeftIcon";
import TrashFillIcon from "../components/svg/TrashFillIcon";
import { buildFamilyViews } from "../utils/families/buildFamilyViews";
import {
  buildUnionOptions,
  findFamily,
} from "../utils/families/resolveFamily";
import { toId } from "../utils/families/familyLabels";

const drawerItems = [
  { text: "Люди", icon: <GroupIcon />, path: "/", accent: "blue" },
  {
    text: "Семьи",
    icon: <Diversity3Icon />,
    path: "/families",
    accent: "green",
  },
  {
    text: "Справочник",
    icon: <ContactsIcon />,
    path: "/external",
    accent: "orange",
  },
  {
    text: "Фотогалерея",
    icon: <CollectionsIcon />,
    path: "/globalPhotoGallery",
    accent: "purple",
  },
  { text: "Карта", icon: <MapIcon />, path: "/map", accent: "teal" },
  { text: "Лента", icon: <TimelineIcon />, path: "/timeline", accent: "pink" },
  { text: "Настройки", icon: <GearIcon />, path: "/settings", accent: "gray" },
  { text: "О приложении", icon: <InfoIcon />, path: "/about", accent: "indigo" },
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
  useAppHotkeys(); // Cmd/Ctrl+K — поиск, Cmd/Ctrl+S — сохранить био
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
  const [sortDir, setSortDir] = useState("desc");

  // Лента: фильтры слоёв в state; level/year/month — в URL (?level=&year=&month=).
  const [timelineShowPhotos, setTimelineShowPhotos] = useState(true);
  const [timelineShowEvents, setTimelineShowEvents] = useState(true);
  const [timelineShowExternal, setTimelineShowExternal] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    level: timelineLevel,
    year: timelineYear,
    month: timelineMonth,
    person: timelinePersonId,
  } = useMemo(() => parseTimelineSearch(searchParams), [searchParams]);

  const navigateTimeline = useCallback(
    (patch) => {
      setSearchParams(applyTimelineNav(searchParams, patch));
    },
    [searchParams, setSearchParams],
  );

  // Карта: фильтры слоёв и триггер перезагрузки точек — в хедере.
  const [mapShowPhotos, setMapShowPhotos] = useState(true);
  const [mapShowEvents, setMapShowEvents] = useState(true);
  const [mapShowExternal, setMapShowExternal] = useState(true);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [mapClearGeocodeKey, setMapClearGeocodeKey] = useState(0);
  const [mapFitBoundsKey, setMapFitBoundsKey] = useState(0);
  const [mapPanelOpen, setMapPanelOpen] = useState(true);
  const [mapFocusKey, setMapFocusKey] = useState(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState(0);
  const [mapSelectedPeople, setMapSelectedPeople] = useState([]);
  const [appDataRevision, setAppDataRevision] = useState(0);
  const [mapStats, setMapStats] = useState({
    visiblePhotoCount: 0,
    visibleEventCount: 0,
    visibleExternalCount: 0,
    loading: false,
    peopleIds: [],
    listPoints: [],
  });

  const [allPeople, setAllPeople] = useState([]); // Нужно загрузить список людей здесь для Autocomplete
  const [photos, setPhotos] = useState([]); // Добавляем этот стейт
  const [loading, setLoading] = useState(true);
  const [appDataError, setAppDataError] = useState(false);

  // Страница «Семьи»: поиск, сортировка и панель — в хедере приложения.
  const [familiesSearch, setFamiliesSearch] = useState("");
  const [familiesSort, setFamiliesSort] = useState("date");
  const [familiesPanelOpen, setFamiliesPanelOpen] = useState(true);

  const timelineFilterPerson = useMemo(
    () =>
      timelinePersonId
        ? (allPeople || []).find(
            (p) => String(p.id) === String(timelinePersonId),
          )
        : null,
    [allPeople, timelinePersonId],
  );

  const mapSelectedPeopleIds = useMemo(
    () => mapSelectedPeople.map((p) => p.id),
    [mapSelectedPeople],
  );
  const mapPeopleOptions = useMemo(
    () => allPeople.filter((p) => mapStats.peopleIds.includes(p.id)),
    [allPeople, mapStats.peopleIds],
  );

  // Семьи вычисляются из людей один раз на страницу и переиспользуются
  // страницей, тулбаром и правой панелью.
  const isMainPage = location.pathname === "/";
  const isFamiliesPage =
    location.pathname === "/families" ||
    location.pathname.startsWith("/families/");
  const isFamiliesDetail = location.pathname.startsWith("/families/");

  const familiesView = useMemo(
    () => (isFamiliesPage ? buildFamilyViews(allPeople) : null),
    [isFamiliesPage, allPeople],
  );

  const familiesFamilyKey = useMemo(() => {
    if (!isFamiliesDetail) return null;
    const raw = location.pathname.slice("/families/".length);
    const key = raw.split("/")[0];
    return key ? decodeURIComponent(key) : null;
  }, [isFamiliesDetail, location.pathname]);

  const familiesFamily = useMemo(
    () =>
      familiesFamilyKey && familiesView
        ? findFamily(familiesView.families, familiesFamilyKey)
        : null,
    [familiesFamilyKey, familiesView],
  );

  const familiesPersonId = toId(searchParams.get("person"));

  const familiesSelectedPersonId = useMemo(() => {
    if (!familiesFamily) return null;
    if (familiesPersonId && familiesView?.byId.has(familiesPersonId)) {
      return familiesPersonId;
    }
    return familiesFamily.partnerIds[0] || null;
  }, [familiesFamily, familiesPersonId, familiesView]);

  const familiesUnion = useMemo(
    () => buildUnionOptions(familiesFamily, familiesView?.byPerson),
    [familiesFamily, familiesView],
  );

  const handleFamiliesSelectPerson = useCallback(
    (id) => {
      const key = toId(id);
      const next = new URLSearchParams(location.search);
      if (key) next.set("person", key);
      else next.delete("person");
      navigate(
        { pathname: location.pathname, search: next.toString() },
        { replace: true },
      );
      if (key) setFamiliesPanelOpen(true);
    },
    [location.pathname, location.search, navigate],
  );

  const handleFamiliesOpenFamily = useCallback(
    (key, personId) => {
      if (!key) return;
      const id = toId(personId);
      navigate(id ? `/families/${key}?person=${id}` : `/families/${key}`);
    },
    [navigate],
  );

  const familiesRouteProps = {
    view: familiesView,
    loading,
    error: appDataError,
    onRetry: () => refreshAppData(),
    selectedPersonId: familiesSelectedPersonId,
    onSelectPerson: handleFamiliesSelectPerson,
    onOpenFamily: handleFamiliesOpenFamily,
    search: familiesSearch,
    sort: familiesSort,
  };

  // «В этот день»: подборка считается из тех же данных, бейдж — суммарно.
  // Строго после объявления photos/allPeople (иначе TDZ).
  const memoryGroups = useMemories(photos, allPeople);
  const memoriesTotal = memoryGroups.reduce(
    (acc, g) => acc + g.photos.length + g.events.length,
    0,
  );
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const memoriesAutoOpened = useRef(false);
  // Таб инспектора и фокусный человек для связей.
  const [inspectorTab, setInspectorTab] = useState("memories");
  const [relationPersonId, setRelationPersonId] = useState(null);
  const isExternalPage = location.pathname === "/external";
  const isMapPage = location.pathname === "/map";
  const [externalPanelOpen, setExternalPanelOpen] = useState(true);
  const [selectedExternalId, setSelectedExternalId] = useState(null);
  const [externalListRefreshKey, setExternalListRefreshKey] = useState(0);
  // Автооткрытие при старте, если в этот день есть воспоминания (только главная).
  useEffect(() => {
    if (
      !memoriesAutoOpened.current &&
      !loading &&
      memoriesTotal > 0 &&
      isMainPage
    ) {
      memoriesAutoOpened.current = true;
      setMemoriesOpen(true);
    }
  }, [loading, memoriesTotal, isMainPage]);

  useEffect(() => {
    if (!isExternalPage) return;
    const fromUrl = new URLSearchParams(location.search).get("selected");
    if (fromUrl) {
      setSelectedExternalId(fromUrl);
    }
  }, [isExternalPage, location.search]);

  const handleSelectExternal = useCallback(
    (id) => {
      setSelectedExternalId(id);
      const params = new URLSearchParams(location.search);
      if (id) {
        params.set("selected", id);
      } else {
        params.delete("selected");
      }
      navigate(
        { pathname: "/external", search: params.toString() },
        { replace: true },
      );
    },
    [location.search, navigate],
  );
  // !!!  ▲▲▲   GlobalPhotoGallery  ▲▲▲
  // !!!  ▼▼▼   PeopleList  ▼▼▼
  // Внутри MainLayout
  const [peopleSearch, setPeopleSearch] = useState("");
  const [externalSearch, setExternalSearch] = useState("");
  const [externalTypeFilter, setExternalTypeFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    created: "",
    edited: "",
    gens: [],
    tags: [],
  });

  // Вычисляем, активен ли фильтр (для подсветки кнопки в тулбаре)
  const isFilterActive = !!(
    filters.created ||
    filters.edited ||
    filters.gens.length > 0
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
  const [isBioDirty, setIsBioDirty] = useState(false);
  const [isBioNavVisible, setIsBioNavVisible] = useState(true);
  const [bioSearchQuery, setBioSearchQuery] = useState("");
  const [bioSearchMatchIndex, setBioSearchMatchIndex] = useState(0);
  const [bioSearchMatchCount, setBioSearchMatchCount] = useState(0);
  const bioExecRef = useRef(null); // Ссылка на команды Milkdown
  const bioRequestToggleRef = useRef(null); // Сюда BiographySection положит свою функцию проверки "грязности"

  useEffect(() => {
    if (isBioEditing) {
      setBioSearchQuery("");
      setBioSearchMatchIndex(0);
      setBioSearchMatchCount(0);
    }
  }, [isBioEditing]);

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
    if (activeElement !== "bio") {
      setBioSearchQuery("");
      setBioSearchMatchIndex(0);
      setBioSearchMatchCount(0);
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
    // Меню остаётся открытым: пользователь сам решает, когда его свернуть.
    setIsInfoEditing(false);
    setIsBioEditing(false);
  };
  // !!!  ▲▲▲   Person Page  ▲▲▲

  // Оборачиваем в useCallback, чтобы функцию можно было безопасно передавать вниз
  const refreshAppData = useCallback(async () => {
    try {
      setAppDataError(false);
      const [people, list] = await Promise.all([
        window.peopleAPI.getAll(),
        window.photoAPI.getAllGlobal(),
      ]);
      setAllPeople(people || []);
      setPhotos(list || []);
      useFaceReviewStore.getState().setPendingCount(countPendingReviewFaces(list || []));
      useFaceReviewStore.getState().setNoFacesCount(countNoFacePhotos(list || []));
      setAppDataRevision((r) => r + 1);
    } catch (e) {
      console.error("Ошибка синхронизации данных:", e);
      setAppDataError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ЭФФЕКТ 1: Обновление при смене страницы
  useEffect(() => {
    refreshAppData();
  }, [location.pathname, refreshAppData]);

  useEffect(() => {
    if (location.pathname !== "/map") return;
    const focus = searchParams.get("focus");
    if (focus) {
      setMapFocusKey(focus);
      setMapFocusTrigger((t) => t + 1);
    }
  }, [location.pathname, searchParams]);
  // Проверяем, на странице ли мы галереи
  const isGalleryPage = location.pathname === "/globalPhotoGallery";
  // Вкладка «Фото» на странице человека — тоже использует панель-инспектор.
  const isPersonPhotoPage =
    Boolean(match) && activeElement === "photo";

  // Правая панель-инспектор фото (галерея). При уходе со страницы — сброс.
  const photoPanelOpen = usePhotoInspectorStore((s) => s.open);
  useEffect(() => {
    if (!isGalleryPage && !isPersonPhotoPage)
      usePhotoInspectorStore.getState().reset();
  }, [isGalleryPage, isPersonPhotoPage]);

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
    item.path === "/"
      ? location.pathname === "/"
      : matchPath({ path: item.path, end: false }, location.pathname),
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
        <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
          {React.cloneElement(currentItem.icon, {
            color: isDark ? "primary" : "prymary",
            sx: { fontSize: 18 },
          })}
        </Box>
        <Typography
          noWrap
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          {currentItem.text}
        </Typography>
      </Box>
    );
  } else if (location.pathname === "/trash") {
    pageTitle = (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          <TrashFillIcon color={isDark ? "primary" : "prymary"} />
        </Box>
        <Typography variant="h6" noWrap>
          Корзина
        </Typography>
      </Box>
    );
  } else if (location.pathname.startsWith("/external")) {
    pageTitle = (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
          <ContactsIcon color={isDark ? "primary" : "prymary"} />
        </Box>
        <Typography variant="h6" noWrap>
          Справочник
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
          color="transparent"
          open={open}
          sx={{
            transition: "none !important",
            // WebkitAppRegion: isMaximized ? "no-drag" : "drag",

            WebkitAppRegion: "drag", // Делаем бар перетаскиваемым
            height: 50,
            // Полупрозрачный «фростед-гласс»: контент прокручивается под баром
            // и размывается backdrop-filter (как тулбар в Finder/Notes).
            bgcolor: isDark
              ? "rgba(31, 31, 31, 0.55)"
              : alpha(theme.palette.background.paper, 0.55),
            color: "text.primary",
            backdropFilter: "blur(6px) saturate(140%)",
            WebkitBackdropFilter: "blur(6px) saturate(140%)",
            borderBottom: "1px solid",
            borderColor: theme.palette.glass.border,
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
            <ButtonConteiner>
              <IconButton
                color="inherit"
                // aria-label="open drawer"
                onClick={handleDrawerOpen}
                // edge="start"
                sx={[
                  {
                    // marginRight: 1,
                    WebkitAppRegion: "no-drag",
                    p: "6px",
                    px: "6px",
                    m: 0,
                  },
                  // open && { display: "none" },
                ]}
              >
                <SidebarLeftIcon
                  sx={{ fontSize: "20px", color: "text.primary" }}
                />
              </IconButton>
            </ButtonConteiner>
            <Box sx={{ width: 16, flexShrink: 0 }} />

            <NavigationButtons />
            <NotificationBell />

            {match && (
              <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>
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
                  isDirty: isBioDirty,
                  requestToggleEdit: () =>
                    bioRequestToggleRef.current?.toggle(),
                  onSave: () => bioRequestToggleRef.current?.save?.(),
                  onPrint: () => bioRequestToggleRef.current?.print?.(),
                  onExportPdf: () => bioRequestToggleRef.current?.exportPdf?.(),
                  execRef: bioExecRef,
                  isNavVisible: isBioNavVisible,
                  onToggleNav: () => setIsBioNavVisible((prev) => !prev),
                  searchQuery: bioSearchQuery,
                  onSearchQueryChange: setBioSearchQuery,
                  searchMatchIndex: bioSearchMatchIndex,
                  onSearchMatchIndexChange: setBioSearchMatchIndex,
                  searchMatchCount: bioSearchMatchCount,
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
              </Box>
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
                sortDir={sortDir}
                setSortDir={setSortDir}
                search={gallerySearch} // Передаем стейт галереи
                setSearch={setGallerySearch} // Передаем сеттер галереи
              />
            )}

            {location.pathname === "/" && (
              <PeopleListToolbar
                people={allPeople}
                search={peopleSearch}
                setSearch={setPeopleSearch}
                isFilterActive={isFilterActive}
                onOpenFilter={() => setFilterOpen(true)}
                sortOrder={sortOrder}
                onToggleSort={() =>
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                }
                filters={filters}
                updateFilter={updateFilter}
                allGenerations={Array.from(
                  new Set(allPeople.map((p) => String(p.generation))),
                )}
              />
            )}

            {location.pathname === "/external" && (
              <ExternalToolbar
                search={externalSearch}
                setSearch={setExternalSearch}
                typeFilter={externalTypeFilter}
                setTypeFilter={setExternalTypeFilter}
              />
            )}

            {location.pathname === "/timeline" && (
              <TimelineToolbar
                level={timelineLevel}
                onLevelChange={(v) => navigateTimeline({ level: v })}
                showPhotos={timelineShowPhotos}
                showEvents={timelineShowEvents}
                showExternal={timelineShowExternal}
                onTogglePhotos={() => setTimelineShowPhotos((v) => !v)}
                onToggleEvents={() => setTimelineShowEvents((v) => !v)}
                onToggleExternal={() => setTimelineShowExternal((v) => !v)}
                filterPerson={timelineFilterPerson}
                onClearPersonFilter={() =>
                  setSearchParams(clearTimelinePerson(searchParams))
                }
                year={timelineYear}
                month={timelineMonth}
                onGoYears={() =>
                  navigateTimeline({ level: "years", year: null, month: null })
                }
                onGoMonths={() =>
                  navigateTimeline({ level: "months", month: null })
                }
              />
            )}

            {isMapPage && (
              <MapToolbar
                allPeople={allPeople}
                mapPeopleOptions={mapPeopleOptions}
                selectedPeople={mapSelectedPeople}
                onPeopleChange={(_, value) => setMapSelectedPeople(value || [])}
                showPhotos={mapShowPhotos}
                showEvents={mapShowEvents}
                showExternal={mapShowExternal}
                onTogglePhotos={() => setMapShowPhotos((v) => !v)}
                onToggleEvents={() => setMapShowEvents((v) => !v)}
                onToggleExternal={() => setMapShowExternal((v) => !v)}
                onRefresh={(e) => {
                  if (e?.shiftKey) setMapClearGeocodeKey((k) => k + 1);
                  setMapRefreshKey((k) => k + 1);
                }}
                onFitBounds={() => setMapFitBoundsKey((k) => k + 1)}
                loading={mapStats.loading}
                visiblePhotoCount={mapStats.visiblePhotoCount}
                visibleEventCount={mapStats.visibleEventCount}
                visibleExternalCount={mapStats.visibleExternalCount}
              />
            )}

            {isFamiliesPage && (
              <FamiliesToolbar
                detail={isFamiliesDetail}
                search={familiesSearch}
                setSearch={setFamiliesSearch}
                sort={familiesSort}
                setSort={setFamiliesSort}
                unionOptions={familiesUnion.options}
                activeUnionKey={familiesFamily?.key}
                onOpenUnion={(key) =>
                  handleFamiliesOpenFamily(key, familiesUnion.anchorId)
                }
              />
            )}

            {/* Кнопка правой панели — главная, справочник, карта, галереи */}
            {(isMainPage ||
              isExternalPage ||
              isMapPage ||
              isGalleryPage ||
              isPersonPhotoPage ||
              isFamiliesDetail) && (
              <Box sx={{ ml: "12px", display: "inline-flex" }}>
                <ButtonConteiner>
                  <IconButton
                    title="Правая панель"
                    onClick={() => {
                      if (isExternalPage) setExternalPanelOpen((v) => !v);
                      else if (isMapPage) setMapPanelOpen((v) => !v);
                      else if (isGalleryPage || isPersonPhotoPage)
                        usePhotoInspectorStore.getState().toggle();
                      else if (isFamiliesDetail)
                        setFamiliesPanelOpen((v) => !v);
                      else setMemoriesOpen((v) => !v);
                    }}
                    size="small"
                    sx={{ color: "text.primary", p: 1 }}
                  >
                    <SidebarRightIcon fontSize="inherit" />
                  </IconButton>
                </ButtonConteiner>
              </Box>
            )}

            {/* Заголовок для остальных страниц */}
            {!isGalleryPage &&
              !isFamiliesPage &&
              !match &&
              location.pathname !== "/" &&
              location.pathname !== "/external" &&
              location.pathname !== "/timeline" &&
              location.pathname !== "/map" && (
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
            // Flex-item по умолчанию не сужается меньше контента
            // (min-width: auto) — без этого любая широкая строка
            // фиксировала ширину всего приложения.
            minWidth: 0,
            // Панель «В этот день» открывается рядом, а не поверх (только главная).
            marginRight:
              (isMainPage && memoriesOpen) ||
              (isExternalPage && externalPanelOpen) ||
              (isMapPage && mapPanelOpen) ||
              (isGalleryPage && photoPanelOpen) ||
              (isPersonPhotoPage && photoPanelOpen) ||
              (isFamiliesDetail && familiesPanelOpen)
                ? "340px"
                : 0,
            transition: "margin-right 0.3s ease",
            // pt: 1,
            pr: isMapPage || isFamiliesPage ? 0 : 1,
            pb: isMapPage || isFamiliesPage ? 0 : 1,
            pl: isMapPage || isFamiliesPage ? 0 : 1,
            // width: "calc(100% - 64px)",
            // height: "100vh",
          }}
        >
          <DrawerHeader />
          <UpdateBanner onOpenSettings={() => navigate("/settings")} />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <PeopleListPage
                  search={peopleSearch} // Используем стейт людей
                  filters={filters}
                  sortOrder={sortOrder}
                  filterOpen={filterOpen}
                  setFilterOpen={setFilterOpen}
                  setFilters={setFilters}
                  onShowRelations={(id) => {
                    setRelationPersonId(id);
                    setInspectorTab("relations");
                    setMemoriesOpen(true);
                  }}
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
                    requestToggleRef: bioRequestToggleRef,
                    isNavVisible: isBioNavVisible,
                    onDirtyChange: setIsBioDirty,
                    searchQuery: bioSearchQuery,
                    searchMatchIndex: bioSearchMatchIndex,
                    onSearchMatchCountChange: setBioSearchMatchCount,
                  }}
                  treeProps={{
                    mode: treeMode,
                    treePageRef: treePageRef, // Передаем реф
                  }}
                />
              }
            />
            <Route
              path="/families"
              element={<FamiliesPage {...familiesRouteProps} />}
            />
            <Route
              path="/families/:familyKey"
              element={<FamiliesPage {...familiesRouteProps} />}
            />
            <Route path="/settings" element={<ArchivedPeoplePage />} />
            <Route
              path="/settings/faces/review"
              element={<FaceReviewQueuePage allPeople={allPeople} />}
            />
            <Route
              path="/settings/faces/no-faces"
              element={<FaceNoFacesQueuePage allPeople={allPeople} />}
            />
            <Route path="/archive" element={<Navigate to="/settings" replace />} />

            {/* <Route path="/photoUploader" element={<PhotoUploader />} /> */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/trash" element={<DeletedPeoplePage />} />
            <Route
              path="/external"
              element={
                <ExternalPeoplePage
                  externalSearch={externalSearch}
                  setExternalSearch={setExternalSearch}
                  externalTypeFilter={externalTypeFilter}
                  setExternalTypeFilter={setExternalTypeFilter}
                  selectedId={selectedExternalId}
                  onSelect={handleSelectExternal}
                  listRefreshKey={externalListRefreshKey}
                />
              }
            />
            <Route path="/external/:id" element={<ExternalEntityPage />} />
            <Route
              path="/map"
              element={
                <MapPage
                  showPhotos={mapShowPhotos}
                  showEvents={mapShowEvents}
                  showExternal={mapShowExternal}
                  refreshKey={mapRefreshKey}
                  clearGeocodeKey={mapClearGeocodeKey}
                  dataRevision={appDataRevision}
                  fitBoundsKey={mapFitBoundsKey}
                  selectedPeopleIds={mapSelectedPeopleIds}
                  focusPointKey={mapFocusKey}
                  focusTrigger={mapFocusTrigger}
                  allPeople={allPeople}
                  onStatsChange={setMapStats}
                />
              }
            />
            <Route
              path="/timeline"
              element={
                <TimelinePage
                  photos={photos}
                  allPeople={allPeople}
                  level={timelineLevel}
                  year={timelineYear}
                  month={timelineMonth}
                  onNavigate={navigateTimeline}
                  showPhotos={timelineShowPhotos}
                  showEvents={timelineShowEvents}
                  showExternal={timelineShowExternal}
                  filterPersonId={timelinePersonId}
                  refresh={refreshAppData}
                />
              }
            />
          </Routes>
          </Suspense>
        </Box>
      </Box>
      <LicenseModal
        open={isLicenseOpen}
        onClose={() => setLicenseOpen(false)}
      />
      {/* Правая панель-инспектор — на корне (только главная): внутри AppBar (backdrop-filter)
          fixed-позиционирование ломается */}
      {isMainPage && (
        <InspectorPanel
          open={memoriesOpen}
          onClose={() => setMemoriesOpen(false)}
          groups={memoryGroups}
          allPeople={allPeople}
          photos={photos}
          memoriesTotal={memoriesTotal}
          tab={inspectorTab}
          setTab={setInspectorTab}
          relationPersonId={relationPersonId}
          onFocusPerson={setRelationPersonId}
        />
      )}
      {isExternalPage && (
        <ExternalInspectorPanel
          open={externalPanelOpen}
          onClose={() => setExternalPanelOpen(false)}
          entityId={selectedExternalId}
          onSelectExternal={handleSelectExternal}
          onEntityChanged={() => {
            setExternalListRefreshKey((k) => k + 1);
            usePeopleListStore.getState().refreshArchiveStatus();
          }}
          onDeleted={() => {
            setExternalListRefreshKey((k) => k + 1);
            setSelectedExternalId(null);
            usePeopleListStore.getState().refreshArchiveStatus();
          }}
        />
      )}
      {isMapPage && (
        <MapInspectorPanel
          open={mapPanelOpen}
          onClose={() => setMapPanelOpen(false)}
          points={mapStats.listPoints || []}
          focusedKey={mapFocusKey}
          onSelectPoint={(p) => {
            setMapFocusKey(p.key);
            setMapFocusTrigger((t) => t + 1);
          }}
        />
      )}
      {(isGalleryPage || isPersonPhotoPage) && (
        <PhotoInspectorPanel allPeople={allPeople} />
      )}
      {isFamiliesDetail && familiesFamily && familiesView && (
        <Suspense fallback={null}>
          <FamilyInspector
            open={familiesPanelOpen}
            person={
              familiesSelectedPersonId
                ? familiesView.byId.get(String(familiesSelectedPersonId))
                : null
            }
            family={familiesFamily}
            families={familiesView.families}
            byId={familiesView.byId}
            childrenOf={familiesView.childrenOf}
            byPerson={familiesView.byPerson}
            onSelectPerson={handleFamiliesSelectPerson}
            onOpenFamily={handleFamiliesOpenFamily}
            onClose={() => setFamiliesPanelOpen(false)}
          />
        </Suspense>
      )}
      <ChangelogModal />
    </>
  );
}
