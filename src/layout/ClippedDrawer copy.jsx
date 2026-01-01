import { styled, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import PersonIcon from "@mui/icons-material/Person";
import {
  useLocation,
  matchPath,
  Link as RouterLink,
  useParams,
} from "react-router-dom"; // Link переименован в RouterLink

import { Routes, Route } from "react-router-dom"; // BrowserRouter обычно оборачивает App
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SettingsPage from "../pages/Page_Settings/SettingsPage";
import AddPersonPage from "../pages/Page_AddPersonPage/AddPersonPage";
import TuneIcon from "@mui/icons-material/Tune";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import GroupIcon from "@mui/icons-material/Group";
import PersonPage from "../pages/Page_Person/PersonPage";
import PeopleListPage from "../pages/Page_Main/PeopleListPage";
import PhotoUploader from "../pages/Page_PhotoUploader/PhotoUploader";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CollectionsIcon from "@mui/icons-material/Collections";
import GlobalPhotoGallery from "../pages/Page_GlobalPhotoGallery/GlobalPhotoGallery";
import InfoIcon from "@mui/icons-material/Info";
import AboutPage from "../pages/Page_About/AboutPage";
import ArchivedPeoplePage from "../pages/Page_Archived/ArchivedPeoplePage";
import ArchiveIcon from "@mui/icons-material/Archive";
import { UpdateBanner } from "../pages/Page_Settings/UpdateBanner";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

import LicenseModal from "./LicenseModal";
import { useSnackbar } from "notistack";
import NavigationButtons from "./NavigationButtons";
import ChangelogModal from "./ChangelogModal";
import UserGuideModal from "./UserGuideModal";

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
const peopleItems = [
  { text: "Люди", icon: <PersonIcon />, path: "person" },
  {
    text: "Биография",
    icon: <AssignmentIcon />,
    path: "biographySection",
  },
  { text: "Фотогалерея", icon: <CollectionsIcon />, path: "photoGallery" },
  { text: "Семейное дерево", icon: <AccountTreeIcon />, path: "familyTree" },
];

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

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

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  variants: [
    {
      props: ({ open }) => open,
      style: {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": openedMixin(theme),
      },
    },
    {
      props: ({ open }) => !open,
      style: {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": closedMixin(theme),
      },
    },
  ],
}));

export default function ClippedDrawer() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navigate = useNavigate();

  const [isLicenseOpen, setLicenseOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const [activeSection, setActiveSection] = useState(null);
  useEffect(() => {
    const onScroll = () => {
      peopleItems.forEach(({ path }) => {
        const el = document.getElementById(path);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(path);
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80; // смещение на 20px
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };
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
            { variant: "success" }
          );
        } else if (result.status === "error") {
          enqueueSnackbar(`❌ Ошибка: ${result.message}`, {
            variant: "error",
          });
        }
      }
    );

    return () => {
      window.electron.ipcRenderer.removeAllListeners(
        "update:manual-check-result"
      );
    };
  }, []);

  useEffect(() => {
    // Слушаем навигацию из меню
    window.navigationAPI.onNavigate((route) => {
      navigate(route);
    });
  }, [navigate]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  // ------------------------------------------------------
  const [person, setPerson] = useState(null);
  const match = matchPath("/person/:id", location.pathname);
  const id = Number(match?.params?.id);

  useEffect(() => {
    if (!id) return;
    window.peopleAPI.getById(id).then((personData) => {
      setPerson(personData);
    });
  }, [id]);

  const currentItem = drawerItems.find((item) =>
    matchPath({ path: item.path, end: true }, location.pathname)
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
            <Box
              sx={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pageTitle}
            </Box>
          </Toolbar>
        </AppBar>
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === "rtl" ? (
                <ChevronRightIcon />
              ) : (
                <ChevronLeftIcon />
              )}
            </IconButton>
          </DrawerHeader>
          <Divider />
          <List>
            {drawerItems.map(({ text, icon, path }, index) => {
              // *** Изменения здесь ***
              // 1. Проверяем точное совпадение пути
              let isActive = location.pathname === path;

              // 2. Если путь элемента меню - "/", и текущий путь соответствует /person/:id,
              //    то делаем этот элемент активным. Используем !! для преобразования в boolean.
              if (path === "/" && matchPath("/person/:id", location.pathname)) {
                isActive = true;
              }
              // *** Конец изменений ***

              return (
                <ListItem key={text} disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    component={RouterLink}
                    to={path}
                    selected={isActive} // Теперь isActive точно boolean
                    sx={[
                      {
                        minHeight: 48,
                        px: 2.5,
                      },
                      open
                        ? {
                            justifyContent: "initial",
                          }
                        : {
                            justifyContent: "center",
                          },
                      isActive && {
                        backgroundColor: theme.palette.action.selected,
                        "&:hover": {
                          backgroundColor: theme.palette.action.selected,
                        },
                      },
                    ]}
                  >
                    <ListItemIcon
                      sx={[
                        {
                          minWidth: 0,
                          justifyContent: "center",
                        },
                        open
                          ? {
                              mr: 3,
                            }
                          : {
                              mr: "auto",
                            },
                      ]}
                    >
                      {icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={text}
                      sx={[
                        open
                          ? {
                              opacity: 1,
                            }
                          : {
                              opacity: 0,
                            },
                      ]}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Divider />
          {match &&
            peopleItems.map(({ text, icon, path }) => {
              const isActive = activeSection === path;

              return (
                <ListItem key={text} disablePadding sx={{ display: "block" }}>
                  <ListItemButton
                    onClick={() => scrollToSection(path)}
                    selected={isActive}
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: theme.palette.action.selected,
                        "& .MuiListItemIcon-root": {
                          color: theme.palette.primary.main,
                        },
                        "& .MuiListItemText-primary": {
                          color: theme.palette.primary.main,
                        },
                      },
                    }}
                  >
                    <ListItemIcon>{icon}</ListItemIcon>
                    <ListItemText primary={text} />
                  </ListItemButton>
                </ListItem>
              );
            })}
        </Drawer>
        <Box component="main" sx={{ flexGrow: 1, pt: 1, pr: 3, pb: 3, pl: 3 }}>
          <DrawerHeader />
          <UpdateBanner onOpenSettings={() => navigate("/settings")} />
          <Routes>
            <Route path="/" element={<PeopleListPage />} />
            <Route path="/add" element={<AddPersonPage />} />
            <Route
              path="/globalPhotoGallery"
              element={<GlobalPhotoGallery />}
            />
            <Route path="/people" element={<PeopleListPage />} />
            <Route path="/person/:id" element={<PersonPage />} />
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
