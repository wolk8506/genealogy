import React, { useState } from "react";
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  Tooltip,
} from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// Иконки
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import UpdateIcon from "@mui/icons-material/Update";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";
import { popoverArrowSx } from "../../theme/popoverArrow";

const timeOptions = [
  {
    value: "",
    label: "Все время",
    icon: <HistoryToggleOffIcon fontSize="small" />,
    key: 1,
  },
  {
    value: "today",
    label: "Сегодня",
    icon: <TodayIcon fontSize="small" />,
    key: 2,
  },
  {
    value: "week",
    label: "Неделя",
    icon: <DateRangeIcon fontSize="small" />,
    key: 3,
  },
  {
    value: "month",
    label: "Месяц",
    icon: <CalendarMonthIcon fontSize="small" />,
    key: 4,
  },
  {
    value: "year",
    label: "За год",
    icon: <EventNoteIcon fontSize="small" />,
    key: 5,
  },
];

export default function ExpandingTimeSelect({
  value,
  onChange,
  type = "created",
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const selectedOption =
    timeOptions.find((o) => o.value === value) || timeOptions[0];
  const isExpanded = value !== "";

  const BaseIcon = type === "created" ? CalendarTodayIcon : UpdateIcon;
  const labelPrefix = type === "created" ? "Создано" : "Изм.";
  const tooltipTitle =
    type === "created" ? "Фильтр по дате создания" : "Фильтр по дате изменения";

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <Toggle
          pressed={isExpanded}
          onClick={handleOpen}
          aria-haspopup="menu"
          aria-expanded={open}
          render={(props, state) => (
            <ToolbarSegmentHit
              {...props}
              pressed={state.pressed}
              sx={{
                gap: isExpanded
                  ? TOOLBAR_HIT.gapIconLabelPx
                  : TOOLBAR_HIT.gapPx,
              }}
            />
          )}
        >
          <BaseIcon sx={{ fontSize: TOOLBAR_HIT.iconSize, color: "inherit" }} />

          {isExpanded && (
            <Typography
              variant="caption"
              component="span"
              sx={{
                color: "inherit",
                whiteSpace: "nowrap",
                fontWeight: 600,
                fontSize: "0.75rem",
                lineHeight: 1,
              }}
            >
              {labelPrefix}: {selectedOption.label}
            </Typography>
          )}
          <KeyboardArrowDownIcon
            sx={{
              fontSize: TOOLBAR_HIT.chevronSize,
              width: TOOLBAR_HIT.chevronSize,
              height: TOOLBAR_HIT.chevronSize,
              opacity: 0.85,
              flexShrink: 0,
              color: "inherit",
            }}
          />
        </Toggle>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              minWidth: 180,
              borderRadius: TOOLBAR_MENU.paperRadiusPx,
              overflow: "visible",
              backgroundImage: "none",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
              // Хвостик меню
              "&::before": popoverArrowSx(),
            },
          },
          list: { sx: { py: 0.5, px: 0.5 } },
        }}
      >
        <Box sx={{ position: "relative", zIndex: 1 }}>
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
            {type === "created" ? "Дата создания" : "Дата изменения"}
          </Typography>

          {timeOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <MenuItem
                key={opt.key}
                onClick={() => {
                  onChange(opt.value);
                  handleClose();
                }}
                sx={{
                  gap: 0.75,
                  mx: 0.5,
                  my: 0.25,
                  borderRadius: TOOLBAR_MENU.itemRadiusPx,
                  pl: 1,
                  pr: 1.25,
                  py: 0.75,
                  bgcolor: "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    width: TOOLBAR_MENU.checkGutter,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <CheckIcon sx={{ fontSize: TOOLBAR_MENU.checkIcon }} />
                  )}
                </Box>
                <ListItemIcon
                  sx={{
                    minWidth: "28px !important",
                    color: isSelected ? "text.primary" : "text.secondary",
                  }}
                >
                  {opt.icon}
                </ListItemIcon>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "text.primary" : "text.secondary",
                  }}
                >
                  {opt.label}
                </Typography>
              </MenuItem>
            );
          })}
        </Box>
      </Menu>
    </>
  );
}
