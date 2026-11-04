// layout/bar_GenealogyTree/GenealogyTreeToolbar.jsx
// Управление деревом в хедере приложения: только иконки и поповер с помощью.

import React, { useState } from "react";
import {
  Box,
  IconButton,
  Popover,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AdsClickIcon from "@mui/icons-material/AdsClick";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MouseIcon from "@mui/icons-material/Mouse";
import PanToolIcon from "@mui/icons-material/PanTool";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import SidebarRightIcon from "../../components/svg/SidebarRightIcon";
import { toolbarPillSx } from "../toolbarStyles";

// Иконки режимов — те же, что в разделе «Древо» на странице человека:
// одна «ветка» с поворотом под направление дерева.
const MODES = [
  { value: "descendants", label: "Потомки", Icon: AccountTreeIcon, rotate: "90deg" },
  { value: "ancestors", label: "Предки", Icon: AccountTreeIcon, rotate: "270deg" },
  { value: "full", label: "Полное дерево", Icon: AccountTreeIcon },
  { value: "radial", label: "Радиальное (эксперимент)", Icon: DonutLargeIcon },
  { value: "fan", label: "Веер предков", Icon: PieChartOutlineIcon },
];

const HELP_ROWS = [
  {
    Icon: MouseIcon,
    color: "blue",
    title: "Левый клик",
    text: "информация о человеке",
  },
  {
    Icon: AdsClickIcon,
    color: "orange",
    title: "Правый клик",
    text: "построить дерево от человека",
  },
  {
    Icon: TouchAppIcon,
    color: "purple",
    title: "Двойной клик",
    text: "тоже перестроить дерево",
  },
  {
    Icon: ZoomInIcon,
    color: "teal",
    title: "Колесо",
    text: "масштаб",
  },
  {
    Icon: PanToolIcon,
    color: "green",
    title: "Перетаскивание",
    text: "сдвиг холста",
  },
  {
    Icon: SidebarRightIcon,
    color: "pink",
    title: "Панель справа",
    text: "клик по родственнику перестроит дерево",
  },
  {
    Icon: FitScreenIcon,
    color: "gray",
    title: "Кнопки справа внизу",
    text: "масштаб и вписывание",
  },
];

export default function GenealogyTreeToolbar({ mode, onModeChange }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [helpAnchor, setHelpAnchor] = useState(null);

  const accent = theme.palette.accents?.indigo || theme.palette.primary.main;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        // Контейнер растянут на всю шапку: без no-drag свободное место
        // справа остаётся зоной перетаскивания окна.
        alignItems: "center",
        width: "100%",
        flex: 1,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          ...toolbarPillSx,
          display: "inline-flex",
          flexShrink: 0,
          alignItems: "center",
          p: "3px",
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(event, value) => value && onModeChange?.(value)}
          size="small"
          sx={{
            gap: "2px",
            bgcolor: "transparent",
            "& .MuiToggleButton-root": {
              color: "text.primary",
              border: "none",
              borderRadius: "12px",
              width: 30,
              height: 28,
              p: 0,
              minWidth: 30,
              "&.Mui-selected": {
                bgcolor: isDark
                  ? "rgba(109,124,255,0.22)"
                  : "rgba(97,85,245,0.12)",
                color: accent,
                "&:hover": {
                  bgcolor: isDark
                    ? "rgba(109,124,255,0.28)"
                    : "rgba(97,85,245,0.18)",
                },
              },
            },
          }}
        >
          {MODES.map(({ value, label, Icon, rotate }) => (
            <ToggleButton key={value} value={value}>
              <Tooltip title={label} arrow>
                <Icon sx={{ fontSize: 18, ...(rotate ? { rotate } : null) }} />
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          ml: "auto",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            ...toolbarPillSx,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Tooltip title="Как управлять деревом">
            <IconButton
              size="small"
              aria-label="Как управлять деревом"
              onClick={(event) =>
                setHelpAnchor((previous) =>
                  previous ? null : event.currentTarget,
                )
              }
            >
              <HelpOutlineIcon sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Popover
        open={Boolean(helpAnchor)}
        anchorEl={helpAnchor}
        onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              minWidth: 280,
              maxWidth: "calc(100vw - 24px)",
              borderRadius: "16px",
              overflow: "visible",
              backgroundImage: "none",
              bgcolor: (t) =>
                t.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
              // Треугольник сверху, указывающий на кнопку справки.
              "&::before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: -6,
                left: "calc(50% - 6px)",
                width: 12,
                height: 12,
                bgcolor: "inherit",
                borderLeft: "1px solid",
                borderTop: "1px solid",
                borderColor: "divider",
                transform: "rotate(45deg)",
                zIndex: 0,
              },
            },
          },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1, py: 0.5 }}>
          <Typography
            variant="overline"
            sx={{
              px: 2,
              py: 1,
              display: "block",
              color: "primary.main",
              fontWeight: 700,
            }}
          >
            Управление деревом
          </Typography>

          {HELP_ROWS.map(({ Icon, color, title, text }) => (
            <Box
              key={title}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 0.6,
                whiteSpace: "nowrap",
              }}
            >
              <Icon
                sx={{
                  fontSize: 20,
                  flexShrink: 0,
                  color: (t) => t.palette.accents?.[color] || "text.secondary",
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.3 }}>
                  {title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    lineHeight: 1.3,
                    color: "text.secondary",
                  }}
                >
                  {text}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </Stack>
  );
}
