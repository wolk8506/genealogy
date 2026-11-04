import React from "react";
import { styled } from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import { Box, ButtonBase } from "@mui/material";
import { useLocation, matchPath } from "react-router-dom";
import GroupsIcon from "@mui/icons-material/Groups";

const drawerWidth = 210;

/** Отступы и шаг плиток раскрытого меню. */
const TILE_WIDTH = 92;
const TILE_HEIGHT = 88;
const TILE_GAP = 8;
const TILE_PITCH = TILE_WIDTH + TILE_GAP;
const TILE_ROW_PITCH = TILE_HEIGHT + TILE_GAP;
/** Остаток ширины панели делим поровну между левым и правым полем. */
const PANEL_PAD = (drawerWidth - (TILE_WIDTH * 2 + TILE_GAP)) / 2;

/** Размеры пункта в свёрнутом рейле. */
const RAIL_WIDTH = 48;
const RAIL_HEIGHT = 44;
const RAIL_GAP = 4;
const RAIL_PITCH = RAIL_HEIGHT + RAIL_GAP;
const RAIL_PAD = 8;

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
  // Заменяем стандартное поведение на фиксированное:
  height: 50, // 50 (бар) + 20 (отступ под кнопки macOS)
  minHeight: 50,
}));

/**
 * Общий переход геометрии пункта: плитка «переезжает» в рейл и обратно —
 * меняются позиция, размер, отступы, скругление и цвета.
 */
const tileTransition = (theme) =>
  theme.transitions.create(
    [
      "top",
      "left",
      "width",
      "height",
      "padding",
      "border-radius",
      "background-color",
      "color",
    ],
    {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    },
  );

/** Высота контейнера меняется вместе с раскладкой плиток. */
const heightTransition = (theme) =>
  theme.transitions.create("height", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  });

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
  const location = useLocation();
  const rows = Math.ceil(items.length / 2);

  const gridHeight =
    PANEL_PAD * 2 + rows * TILE_HEIGHT + Math.max(0, rows - 1) * TILE_GAP;
  const railHeight =
    RAIL_PAD * 2 +
    items.length * RAIL_HEIGHT +
    Math.max(0, items.length - 1) * RAIL_GAP;

  return (
    <StyledDrawer variant="permanent" open={open}>
      <Box sx={{ height: 50 }} />

      <Box
        sx={(theme) => ({
          position: "relative",
          height: open ? gridHeight : railHeight,
          transition: heightTransition(theme),
        })}
      >
        {items.map(({ text, icon, accent, path, onClick }, index) => {
          let isActive =
            location.pathname === path ||
            (path !== "/" && location.pathname.startsWith(`${path}/`));
          if (path === "/" && matchPath("/person/:id", location.pathname)) {
            isActive = true;
          }

          const col = index % 2;
          const row = Math.floor(index / 2);

          return (
            <ButtonBase
              key={text}
              onClick={onClick}
              aria-current={isActive ? "page" : undefined}
              sx={(theme) => {
                // Активный раздел в раскрытом меню подсвечиваем цветом его
                // иконки, а не общим цветом приложения.
                const accentColor =
                  theme.palette.accents?.[accent] ||
                  theme.palette.primary.main;

                return {
                  position: "absolute",
                  // Раскрытое меню — сетка 2×N, свёрнутое — вертикальный рейл.
                  top: open
                    ? PANEL_PAD + row * TILE_ROW_PITCH
                    : RAIL_PAD + index * RAIL_PITCH,
                  left: open ? PANEL_PAD + col * TILE_PITCH : RAIL_PAD,
                  width: open ? TILE_WIDTH : RAIL_WIDTH,
                  height: open ? TILE_HEIGHT : RAIL_HEIGHT,
                  padding: open ? "10px" : "8px 10px",
                  borderRadius: open ? "16px" : "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  overflow: "hidden",
                  textAlign: "left",
                  backgroundColor: isActive
                    ? open
                      ? accentColor
                      : theme.palette.action.selected
                    : open
                      ? theme.palette.action.hover
                      : "transparent",
                  color: isActive
                    ? open
                      ? "#fff"
                      : accentColor
                    : theme.palette.text.primary,
                  transition: tileTransition(theme),

                  "&:hover": {
                    backgroundColor: isActive
                      ? open
                        ? accentColor
                        : theme.palette.action.selected
                      : theme.palette.action.selected,
                    // Лёгкое затемнение активной плитки: цвет остаётся
                    // цветом раздела, но появляется отклик на наведение.
                    backgroundImage:
                      isActive && open
                        ? "linear-gradient(rgba(0,0,0,0.08), rgba(0,0,0,0.08))"
                        : "none",
                  },
                };
              }}
            >
              <Box
                sx={(theme) => {
                  const accentColor =
                    theme.palette.accents?.[accent] ||
                    theme.palette.primary.main;

                  return {
                    width: open ? 30 : 28,
                    height: open ? 30 : 28,
                    flexShrink: 0,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    // В раскрытом виде иконка живёт в цветном круге, в рейле
                    // круг «растворяется» и остаётся только глиф.
                    backgroundColor: isActive
                      ? open
                        ? "#fff"
                        : "transparent"
                      : open
                        ? accentColor
                        : "transparent",
                    color: isActive
                      ? accentColor
                      : open
                        ? "#fff"
                        : theme.palette.text.primary,
                    transition: theme.transitions.create(
                      ["width", "height", "background-color", "color"],
                      {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                      },
                    ),
                    "& .MuiSvgIcon-root": {
                      fontSize: open ? 17 : 20,
                      transition: theme.transitions.create("font-size", {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.enteringScreen,
                      }),
                    },
                  };
                }}
              >
                {path === "/" ? <GroupsIcon /> : icon}
              </Box>

              <Box
                component="span"
                sx={{
                  position: "absolute",
                  left: 8,
                  // Фиксированная ширина: подпись не переверстывается, пока
                  // плитка сжимается, а просто уезжает под её край.
                  width: TILE_WIDTH - 16,
                  bottom: open ? 10 : 8,
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  // Длинные названия переносятся с переносом, как в macOS.
                  whiteSpace: "normal",
                  hyphens: "auto",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  opacity: open ? 1 : 0,
                  transform: open ? "none" : "translateY(2px)",
                  transition:
                    "opacity 100ms linear, transform 225ms cubic-bezier(0.4, 0, 0.6, 1), bottom 225ms cubic-bezier(0.4, 0, 0.6, 1)",
                }}
              >
                {text}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </StyledDrawer>
  );
}

// Экспортируем DrawerHeader отдельно, так как он нужен в MainLayout для контента
export { DrawerHeader };
