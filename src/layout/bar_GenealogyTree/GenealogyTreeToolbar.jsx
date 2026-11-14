// layout/bar_GenealogyTree/GenealogyTreeToolbar.jsx
// Управление деревом в хедере приложения: режимы и справка.

import React, { useState } from "react";
import {
  Box,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AdsClickIcon from "@mui/icons-material/AdsClick";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import MouseIcon from "@mui/icons-material/Mouse";
import PanToolIcon from "@mui/icons-material/PanTool";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import SidebarRightIcon from "../../components/svg/SidebarRightIcon";
import { popoverArrowSx } from "../../theme/popoverArrow";
import ButtonConteiner from "../../components/ButtonConteiner";
import GenealogyTreeModeCluster from "./GenealogyTreeModeCluster";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

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
  const [helpAnchor, setHelpAnchor] = useState(null);

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={toolbarClusterSx}>
        <GenealogyTreeModeCluster mode={mode} onModeChange={onModeChange} />
      </Box>

      <Box sx={toolbarDragSpacerSx} />

      <Box sx={toolbarClusterSx}>
      <ButtonConteiner>
        <Tooltip title="Как управлять деревом">
          <IconButton
            size="small"
            aria-label="Как управлять деревом"
            aria-expanded={Boolean(helpAnchor)}
            onClick={(event) =>
              setHelpAnchor((previous) =>
                previous ? null : event.currentTarget,
              )
            }
            sx={{ color: "inherit", p: 0 }}
          >
            <HelpOutlineOutlinedIcon sx={{ fontSize: TOOLBAR_HIT.iconSize }} />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
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
              borderRadius: TOOLBAR_MENU.paperRadiusPx,
              overflow: "visible",
              backgroundImage: "none",
              bgcolor: (t) =>
                t.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
              "&::before": popoverArrowSx(),
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
                  fontSize: TOOLBAR_HIT.iconSize,
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
