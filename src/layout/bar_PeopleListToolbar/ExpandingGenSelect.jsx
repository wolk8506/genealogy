import React, { useState } from "react";
import {
  Box,
  IconButton,
  styled,
  Menu,
  MenuItem,
  Typography,
  Checkbox,
  ListItemIcon,
  Divider,
  Tooltip,
} from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  height: 40,
  minWidth: 40,
  paddingRight: $expanded ? 12 : 0,
  cursor: "pointer",
  // backgroundColor: $expanded ? "rgba(255,255,255,0.08)" : "transparent",
  "&:hover": {
    // borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
}));

export default function ExpandingGenSelect({ options, value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isExpanded = value.length > 0;

  // Логика текста: выводим первые 2-3, если их много — пишем +N
  const renderLabel = () => {
    if (value.length === 0) return null;
    const visible = value.slice(0, 2);
    const rest = value.length - visible.length;
    return `П: ${visible.join(", ")}${rest > 0 ? ` +${rest}` : ""}`;
  };

  const handleToggle = (opt) => {
    const currentIndex = value.indexOf(opt);
    const newValue = [...value];
    if (currentIndex === -1) {
      newValue.push(opt);
    } else {
      newValue.splice(currentIndex, 1);
    }
    onChange(
      null,
      newValue.sort((a, b) => a - b),
    );
  };

  return (
    <>
      <Tooltip title={"Фильтрация по поколениям"}>
        <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
          <IconButton
            size="small"
            sx={{
              color: "white",
              p: "9px",
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
          >
            <LayersIcon
              fontSize="small"
              color={isExpanded ? "primary" : "inherit"}
              sx={{}}
            />
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
              {renderLabel()}
            </Typography>
          )}
        </StyledContainer>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: { mt: 1, minWidth: 180, borderRadius: "12px", maxHeight: 400 },
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ px: 2, py: 1, display: "block", color: "primary.main" }}
        >
          Поколения
        </Typography>

        {options.length === 0 && <MenuItem disabled>Нет данных</MenuItem>}

        {options
          .sort((a, b) => a - b)
          .map((opt) => (
            <MenuItem key={opt} onClick={() => handleToggle(opt)}>
              <ListItemIcon>
                <Checkbox
                  size="small"
                  checked={value.indexOf(opt) !== -1}
                  sx={{ p: 0 }}
                />
              </ListItemIcon>
              <Typography variant="body2">Поколение {opt}</Typography>
            </MenuItem>
          ))}

        {/* Рендерим элементы по отдельности без обертки-фрагмента */}
        {isExpanded && <Divider key="divider-gen" />}

        {isExpanded && (
          <MenuItem
            key="reset-gen"
            onClick={() => {
              onChange(null, []);
              handleClose();
            }}
            sx={{ color: "error.main", justifyContent: "center" }}
          >
            <Typography variant="caption" fontWeight="bold">
              Сбросить
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
