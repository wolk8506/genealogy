import * as React from "react";
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
// import InboxIcon from "@mui/icons-material/MoveToInbox";
// import MailIcon from "@mui/icons-material/Mail";
// -------------
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import HelloPage from "../features/hello/HelloPage";
import SettingsPage from "../features/settings/SettingsPage";
import { Link as RouterLink } from "react-router-dom";
// import FamilyTreePage from "../features/familyTree/FamilyTreePage";
import AddPersonPage from "../features/people/ADDPersonPage";
import TuneIcon from "@mui/icons-material/Tune";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import GroupIcon from "@mui/icons-material/Group";
import PersonPage from "../features/people/PersonPage";
import PeopleListPage from "../features/people/PeopleListPage";
import PhotoUploader from "../features/people/PhotoUploader";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CollectionsIcon from "@mui/icons-material/Collections";
import GlobalPhotoGallery from "../features/people/GlobalPhotoGallery";
import InfoIcon from "@mui/icons-material/Info";
import AboutPage from "../features/settings/AboutPage";
import ArchivedPeoplePage from "../features/people/ArchivedPeoplePage";
import ArchiveIcon from "@mui/icons-material/Archive";

const drawerItems = [
  { text: "Главная", icon: <GroupIcon />, path: "/" },
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
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
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
          <Typography variant="h6" noWrap component="div">
            Genealogy
          </Typography>
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
          {drawerItems.map(({ text, icon, path }, index) => (
            <ListItem key={text} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                component={RouterLink}
                to={path}
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
          ))}
        </List>
        <Divider />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        <Routes>
          <Route path="/" element={<PeopleListPage />} />
          <Route path="/add" element={<AddPersonPage />} />
          <Route path="/globalPhotoGallery" element={<GlobalPhotoGallery />} />
          <Route path="/people" element={<PeopleListPage />} />
          <Route path="/person/:id" element={<PersonPage />} />
          <Route path="/archive" element={<ArchivedPeoplePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/photoUploader" element={<PhotoUploader />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
