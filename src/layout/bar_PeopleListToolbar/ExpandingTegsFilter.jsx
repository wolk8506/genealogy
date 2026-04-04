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
import SellIcon from "@mui/icons-material/Sell";
import { useTagsStore } from "../../store/useTagsStore";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  border: "1px solid",
  borderColor: theme.palette.divider,
  transition: "all 0.3s ease",
  height: 34,
  paddingRight: $expanded ? 12 : 0,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
}));

export default function ExpandingTagsFilter({ selectedTags = [], onChange }) {
  const allTags = useTagsStore((state) => state.tags);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isExpanded = selectedTags.length > 0;

  const handleToggle = (tagId) => {
    const currentIndex = selectedTags.indexOf(tagId);
    let newSelected = [...selectedTags];
    if (currentIndex === -1) {
      newSelected.push(tagId);
    } else {
      newSelected.splice(currentIndex, 1);
    }
    onChange(newSelected);
  };

  return (
    <>
      <Tooltip title="Фильтрация по меткам">
        <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
          <IconButton
            size="small"
            sx={{
              color: "white",
              p: 1,
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            <SellIcon
              color={isExpanded ? "primary" : "inherit"}
              fontSize="inherit"
            />
          </IconButton>

          {isExpanded && (
            <Box sx={{ display: "flex", alignItems: "center", ml: 0.5 }}>
              {selectedTags.map((id, index) => {
                const tag = allTags.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <SellIcon
                    key={id}
                    sx={{
                      color: tag.color,
                      fontSize: 18,
                      ml: index > 0 ? "-8px" : 0,
                      stroke: "#1e1e1e",
                      strokeWidth: 1.5,
                      position: "relative",
                      zIndex: index,
                    }}
                  />
                );
              })}
            </Box>
          )}
        </StyledContainer>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        // Настройка Paper для треугольника
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: "16px",
            overflow: "visible",
            backgroundImage: "none",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
            border: "1px solid",
            borderColor: "divider",
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
            Метки
          </Typography>

          {allTags.length === 0 && (
            <MenuItem disabled>Нет созданных меток</MenuItem>
          )}

          {allTags.map((tag) => {
            const isSelected = selectedTags.indexOf(tag.id) !== -1;
            return (
              <MenuItem
                key={tag.id}
                onClick={() => handleToggle(tag.id)}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: "8px",
                  // Вместо чекбокса красим фон при выделении
                  bgcolor: isSelected ? alpha(tag.color, 0.15) : "transparent",
                  "&:hover": {
                    bgcolor: isSelected
                      ? alpha(tag.color, 0.25)
                      : alpha("#fff", 0.05),
                  },
                  transition: "background-color 0.2s",
                }}
              >
                <ListItemIcon sx={{ minWidth: "36px !important" }}>
                  <SellIcon
                    sx={{
                      color: tag.color,
                      fontSize: 20,
                      filter: isSelected
                        ? "drop-shadow(0 0 2px rgba(0,0,0,0.5))"
                        : "none",
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
                  {tag.name}
                </Typography>
              </MenuItem>
            );
          })}

          {isExpanded && <Divider sx={{ my: 1 }} />}

          {isExpanded && (
            <MenuItem
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
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
