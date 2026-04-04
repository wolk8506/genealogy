import React, { useState } from "react";
import {
  Box,
  IconButton,
  styled,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  Tooltip,
  alpha,
  Divider,
} from "@mui/material";

// Иконки
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import UpdateIcon from "@mui/icons-material/Update";
import TodayIcon from "@mui/icons-material/Today";
import DateRangeIcon from "@mui/icons-material/DateRange";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import EventNoteIcon from "@mui/icons-material/EventNote";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition:
    "transform 0.2s ease-out, box-shadow 0.2s ease-out, background-color 0.2s",
  height: 34,
  paddingRight: $expanded ? 12 : 0,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.08)",
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
        <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
          <IconButton size="small" sx={{ color: "white", p: "8px" }}>
            <BaseIcon
              color={isExpanded ? "primary" : "inherit"}
              fontSize="inherit"
            />
          </IconButton>

          {isExpanded && (
            <Typography
              variant="caption"
              sx={{
                color: "white",
                whiteSpace: "nowrap",
                ml: 0.5,
                fontWeight: 700,
              }}
            >
              {labelPrefix}: {selectedOption.label}
            </Typography>
          )}
        </StyledContainer>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
            borderRadius: "16px",
            overflow: "visible",
            backgroundImage: "none",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
            border: "1px solid",
            borderColor: "divider",
            // Хвостик меню
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
                  mx: 1,
                  my: 0.5,
                  borderRadius: "8px",
                  bgcolor: isSelected ? alpha("#2196f3", 0.15) : "transparent",
                  "&:hover": {
                    bgcolor: isSelected
                      ? alpha("#2196f3", 0.25)
                      : alpha("#fff", 0.05),
                  },
                  transition: "background-color 0.2s",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: "32px !important",
                    color: isSelected ? "primary.main" : "text.secondary",
                  }}
                >
                  {opt.icon}
                </ListItemIcon>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? "white" : "text.secondary",
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
