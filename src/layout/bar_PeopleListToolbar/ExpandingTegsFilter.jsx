import React, { useState } from "react";
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  Divider,
  Tooltip,
  alpha,
} from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import SellIcon from "@mui/icons-material/Sell";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { useTagsStore } from "../../store/useTagsStore";
import { popoverArrowSx } from "../../theme/popoverArrow";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

export default function ExpandingTagsFilter({ selectedTags = [], onChange }) {
  const allTags = useTagsStore((state) => state.tags);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const isExpanded = selectedTags.length > 0;

  const handleToggle = (tagId) => {
    const currentIndex = selectedTags.indexOf(tagId);
    const newSelected = [...selectedTags];
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
        <ToolbarButtonGroup>
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
            <SellIcon
              sx={{
                fontSize: TOOLBAR_HIT.iconSize,
                color: "inherit",
              }}
            />

            {isExpanded && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {selectedTags.map((id, index) => {
                  const tag = allTags.find((t) => t.id === id);
                  if (!tag) return null;
                  return (
                    <SellIcon
                      key={id}
                      sx={{
                        color: tag.color,
                        fontSize: TOOLBAR_HIT.iconSize,
                        ml: index > 0 ? "-8px" : 0,
                        stroke: (theme) =>
                          theme.palette.mode === "dark" ? "#1e1e1e" : "#f5f5f5",
                        strokeWidth: 1.5,
                        position: "relative",
                        zIndex: index,
                      }}
                    />
                  );
                })}
              </Box>
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
        </ToolbarButtonGroup>
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
              minWidth: 200,
              borderRadius: TOOLBAR_MENU.paperRadiusPx,
              overflow: "visible",
              backgroundImage: "none",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
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
                  gap: 0.75,
                  mx: 0.5,
                  my: 0.25,
                  borderRadius: TOOLBAR_MENU.itemRadiusPx,
                  pl: 1,
                  pr: 1.25,
                  py: 0.75,
                  bgcolor: isSelected
                    ? alpha(tag.color, 0.15)
                    : "transparent",
                  "&:hover": {
                    bgcolor: isSelected
                      ? alpha(tag.color, 0.25)
                      : "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    width: TOOLBAR_MENU.checkGutter,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <CheckIcon sx={{ fontSize: TOOLBAR_MENU.checkIcon }} />
                  )}
                </Box>
                <ListItemIcon sx={{ minWidth: "28px !important" }}>
                  <SellIcon sx={{ color: tag.color, fontSize: TOOLBAR_HIT.iconSize }} />
                </ListItemIcon>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "text.primary" : "text.secondary",
                  }}
                >
                  {tag.name}
                </Typography>
              </MenuItem>
            );
          })}

          {isExpanded && <Divider sx={{ my: 0.5, mx: 1 }} />}

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
                mx: 0.5,
                borderRadius: TOOLBAR_MENU.itemRadiusPx,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                Сбросить фильтр
              </Typography>
            </MenuItem>
          )}
        </Box>
      </Menu>
    </>
  );
}
