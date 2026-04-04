import React, { useState } from "react";
import {
  Box,
  IconButton,
  styled,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  Divider,
} from "@mui/material";

// Иконки
import ViewModuleIcon from "@mui/icons-material/ViewModule"; // По умолчанию
import PersonIcon from "@mui/icons-material/Person";
import EventIcon from "@mui/icons-material/Event";
import HistoryIcon from "@mui/icons-material/History";
import LayersClearIcon from "@mui/icons-material/LayersClear";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  WebkitAppRegion: "no-drag",
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  width: $expanded ? "auto" : 34,
  height: 34,
  paddingRight: $expanded ? 12 : 0,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor: $expanded ? "rgba(255,255,255,0.08)" : "transparent",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
}));

const groupOptions = [
  {
    value: "none",
    label: "Без групп",
    icon: <LayersClearIcon fontSize="small" />,
    category: "Сброс",
  },
  {
    value: "owner",
    label: "По людям",
    icon: <PersonIcon fontSize="small" />,
    category: "Личности",
  },
  {
    value: "date",
    label: "Дата загрузки",
    icon: <HistoryIcon fontSize="small" />,
    category: "Время",
  },
  {
    value: "datePhoto",
    label: "Дата снимка",
    icon: <EventIcon fontSize="small" />,
    category: "Время",
  },
];

export default function ExpandingGroupSelect({ value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const selectedOption = groupOptions.find((o) => o.value === value);
  const isExpanded = value !== "none";

  // Динамическая иконка для главной кнопки
  // Если ничего не выбрано, показываем ViewModuleIcon, иначе иконку фильтра
  const CurrentIcon =
    selectedOption && value !== "none"
      ? selectedOption.icon.type
      : ViewModuleIcon;

  return (
    <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
      <IconButton size="small" sx={{ color: "white", p: 1 }}>
        <CurrentIcon fontSize="inherit" />
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
          {selectedOption?.label}
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
              minWidth: 200,
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
          Группировка
        </Typography>

        {/* Вместо React.Fragment используем обычный map, который возвращает массив.
            Для вставки разделителей используем плоский массив, 
            формируемый через reduce или вставку условий напрямую.
        */}
        {groupOptions.flatMap((opt, index) => {
          const elements = [];

          // Добавляем Divider перед категориями (кроме самой первой)
          if (index > 0 && opt.category !== groupOptions[index - 1].category) {
            elements.push(
              <Divider
                key={`divider-${opt.value}`}
                sx={{ my: 0.5, opacity: 0.6 }}
              />,
            );
          }

          elements.push(
            <MenuItem
              key={opt.value}
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
            </MenuItem>,
          );

          return elements;
        })}
      </Menu>
    </StyledContainer>
  );
}
