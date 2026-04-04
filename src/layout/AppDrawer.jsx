import React from "react";
import { styled, useTheme } from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import {
  List,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Box,
} from "@mui/material";
import { Link as RouterLink, useLocation, matchPath } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
// import PersonIcon from "@mui/icons-material/Person";
import GroupsIcon from "@mui/icons-material/Groups";

const drawerWidth = 200;

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

// const DrawerHeader = styled("div")(({ theme }) => ({
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "flex-end",
//   padding: theme.spacing(0, 1),
//   ...theme.mixins.toolbar,
// }));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  // Заменяем стандартное поведение на фиксированное:
  height: 50, // 50 (бар) + 20 (отступ под кнопки macOS)
  minHeight: 50,
  // top: 50,
}));

const StyledDrawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,

  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export default function AppDrawer({ open, onClose, items }) {
  const theme = useTheme();
  const location = useLocation();

  return (
    <StyledDrawer variant="permanent" open={open}>
      <Box sx={{ height: 50 }} />
      {/* <DrawerHeader>
        <IconButton onClick={onClose}>
          {theme.direction === "rtl" ? (
            <ChevronRightIcon />
          ) : (
            <ChevronLeftIcon />
          )}
        </IconButton>
      </DrawerHeader> */}
      {/* <Divider /> */}
      <List>
        {/* 1. ОБЯЗАТЕЛЬНО вытаскиваем onClick из item */}
        {items.map(({ text, icon, path, onClick }) => {
          let isActive = location.pathname === path;
          if (path === "/" && matchPath("/person/:id", location.pathname)) {
            isActive = true;
          }

          return (
            <ListItem key={text} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                // 2. УДАЛЯЕМ component={RouterLink} и to={path}
                // Теперь навигацией управляет только функция onClick
                onClick={onClick}
                selected={isActive}
                sx={{
                  minHeight: 64,
                  px: 2.5,
                  justifyContent: open ? "initial" : "center",
                  "&.Mui-selected": {
                    backgroundColor: theme.palette.action.selected,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {path === "/" ? <GroupsIcon /> : icon}
                </ListItemIcon>
                <ListItemText primary={text} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </StyledDrawer>
  );
}

// Экспортируем DrawerHeader отдельно, так как он нужен в MainLayout для контента
export { DrawerHeader };
