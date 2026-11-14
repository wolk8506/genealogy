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
import LayersIcon from "@mui/icons-material/Layers";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { popoverArrowSx } from "../../theme/popoverArrow";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

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
          <LayersIcon sx={{ fontSize: TOOLBAR_HIT.iconSize, color: "inherit" }} />

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
              {renderLabel()}
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
              // Тот самый треугольник
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
                    gap: 0.75,
                    mx: 0.5,
                    my: 0.25,
                    borderRadius: TOOLBAR_MENU.itemRadiusPx,
                    pl: 1,
                    pr: 1.25,
                    py: 0.75,
                    bgcolor: (t) =>
                      isSelected
                        ? alpha(t.palette.primary.main, 0.15)
                        : "transparent",
                    "&:hover": {
                      bgcolor: (t) =>
                        isSelected
                          ? alpha(t.palette.primary.main, 0.25)
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
                    <LayersIcon
                      sx={{
                        fontSize: TOOLBAR_HIT.iconSize,
                        color: isSelected ? "primary.main" : "text.secondary",
                      }}
                    />
                  </ListItemIcon>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "text.primary" : "text.secondary",
                    }}
                  >
                    Поколение {opt}
                  </Typography>
                </MenuItem>
              );
            })}

          {isExpanded && <Divider sx={{ my: 0.5, mx: 1 }} />}

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
                mx: 0.5,
                borderRadius: TOOLBAR_MENU.itemRadiusPx,
              }}
            >
              <Typography variant="caption" sx={{
                fontWeight: "bold"
              }}>
                Сбросить фильтр
              </Typography>
            </MenuItem>
          )}
        </Box>
      </Menu>
    </>
  );
}
