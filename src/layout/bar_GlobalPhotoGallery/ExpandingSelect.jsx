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
import SortIcon from "@mui/icons-material/Sort";
import NorthIcon from "@mui/icons-material/North"; // Стрелка вверх
import SouthIcon from "@mui/icons-material/South"; // Стрелка вниз
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";

const StyledContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  width: "auto", // Всегда развернут
  paddingRight: 12,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor: "rgba(255,255,255,0.05)",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
}));

export default function ExpandingSelect({
  sortBy,
  sortDir,
  onSortChange,
  label,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Добавляем SortIcon в каждый пункт меню рядом со стрелкой
  const options = [
    {
      label: "Новые загрузки",
      value: "date:desc",
      icon: <SouthIcon fontSize="inherit" />,
    },
    {
      label: "Старые загрузки",
      value: "date:asc",
      icon: <NorthIcon fontSize="inherit" />,
    },
    {
      label: "Свежие фото",
      value: "datePhoto:desc",
      icon: <SouthIcon fontSize="inherit" />,
    },
    {
      label: "Старые фото",
      value: "datePhoto:asc",
      icon: <NorthIcon fontSize="inherit" />,
    },
    {
      label: "По именам (А-Я)",
      value: "name:asc",
      icon: <SortByAlphaIcon fontSize="inherit" />,
    },
  ];

  const currentValue = `${sortBy}:${sortDir}`;
  const selectedOption = options.find((o) => o.value === currentValue);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <StyledContainer onClick={handleOpen}>
      <IconButton size="small" sx={{ color: "white", p: "9px" }}>
        {/* На главной кнопке показываем иконку текущего направления */}
        {<SortIcon fontSize="small" />}
        {selectedOption ? selectedOption.icon : <SortIcon fontSize="small" />}
      </IconButton>

      <Typography
        variant="caption"
        sx={{
          color: "white",
          whiteSpace: "nowrap",
          ml: 0.5,
          fontWeight: 600,
        }}
      >
        {selectedOption?.label || label}
      </Typography>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <Typography
          variant="overline"
          sx={{
            px: 2,
            color: "primary.main",
            fontWeight: "bold",
            display: "block",
          }}
        >
          {label}
        </Typography>
        {options.map((opt) => (
          <MenuItem
            key={opt.value}
            selected={opt.value === currentValue}
            onClick={(e) => {
              e.stopPropagation();
              const [newBy, newDir] = opt.value.split(":");
              onSortChange(newBy, newDir);
              handleClose();
            }}
            sx={{ gap: 1 }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto !important",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <SortIcon sx={{ fontSize: 16, opacity: 0.5 }} />
              {opt.icon}
            </ListItemIcon>
            <Typography variant="body2">{opt.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </StyledContainer>
  );
}
