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
  Tooltip,
  alpha,
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
  transition:
    "transform 0.2s ease-out, box-shadow 0.2s ease-out, background-color 0.2s",
  height: 34,
  paddingRight: $expanded ? 12 : 0,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
}));

export default function ExpandingGenSelect({ options, value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isExpanded = value.length > 0;

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
      <Tooltip title="Фильтрация по поколениям">
        <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
          <IconButton
            size="small"
            sx={{
              color: "white",
              p: 1,
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            <LayersIcon
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
              {renderLabel()}
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
            // Тот самый треугольник
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
            Поколения
          </Typography>

          {options.length === 0 && <MenuItem disabled>Нет данных</MenuItem>}

          {options
            .sort((a, b) => a - b)
            .map((opt) => {
              const isSelected = value.indexOf(opt) !== -1;
              return (
                <MenuItem
                  key={opt}
                  onClick={() => handleToggle(opt)}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: "8px",
                    // Выделение цветом primary вместо чекбокса
                    bgcolor: isSelected
                      ? alpha("#2196f3", 0.15)
                      : "transparent",
                    "&:hover": {
                      bgcolor: isSelected
                        ? alpha("#2196f3", 0.25)
                        : alpha("#fff", 0.05),
                    },
                    transition: "background-color 0.2s",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: "32px !important" }}>
                    <LayersIcon
                      sx={{
                        fontSize: 18,
                        color: isSelected ? "primary.main" : "text.secondary",
                      }}
                    />
                  </ListItemIcon>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? "white" : "text.secondary",
                    }}
                  >
                    Поколение {opt}
                  </Typography>
                </MenuItem>
              );
            })}

          {isExpanded && <Divider sx={{ my: 1 }} />}

          {isExpanded && (
            <MenuItem
              key="reset-gen"
              onClick={() => {
                onChange(null, []);
                handleClose();
              }}
              sx={{
                color: "error.main",
                justifyContent: "center",
                mx: 1,
                borderRadius: "8px",
              }}
            >
              <Typography variant="caption" fontWeight="bold">
                Сбросить фильтр
              </Typography>
            </MenuItem>
          )}
        </Box>
      </Menu>
    </>
  );
}
