import React, { useState } from "react";
import {
  Box,
  IconButton,
  styled,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
} from "@mui/material";

// Иконки
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"; // Для создания
import UpdateIcon from "@mui/icons-material/Update"; // Для изменения
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { key } from "@milkdown/kit/plugin/listener";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  width: $expanded ? "auto" : 40,
  paddingRight: $expanded ? 12 : 0,
  overflow: "hidden",
  cursor: "pointer",
  // backgroundColor: $expanded ? "rgba(255,255,255,0.08)" : "transparent",
  "&:hover": {
    // borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
}));

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
    value: "month",
    label: "Месяц",
    icon: <CalendarMonthIcon fontSize="small" />,
    key: 5,
  },
  {
    value: "year",
    label: "За год",
    icon: <EventNoteIcon fontSize="small" />, // Четкая иконка календаря с заметкой
    key: 6,
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

  // Выбор базовой иконки в зависимости от типа фильтра (создание или правка)
  const BaseIcon = type === "created" ? CalendarTodayIcon : UpdateIcon;
  const labelPrefix = type === "created" ? "Создано" : "Изм.";

  return (
    <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
      <IconButton size="small" sx={{ color: "white", p: "9px" }}>
        <BaseIcon fontSize="small" color={isExpanded ? "primary" : "inherit"} />
      </IconButton>

      {isExpanded && (
        <Typography
          variant="caption"
          sx={{
            color: "white",
            whiteSpace: "nowrap",
            ml: 0.5,
            fontWeight: 600,
          }}
        >
          {labelPrefix}: {selectedOption.label}
        </Typography>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 160,
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            },
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            display: "block",
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          {type === "created" ? "Дата создания" : "Дата изменения"}
        </Typography>

        {timeOptions.map((opt) => (
          <MenuItem
            key={opt.key}
            selected={opt.value === value}
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.value);
              handleClose();
            }}
            sx={{ py: 1 }}
          >
            <ListItemIcon
              sx={{ color: opt.value === value ? "primary.main" : "inherit" }}
            >
              {opt.icon}
            </ListItemIcon>
            <Typography variant="body2">{opt.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </StyledContainer>
  );
}
