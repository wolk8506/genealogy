// layout/bar_Families/FamilySortPill.jsx
// Сортировка каталога семей — hit-зона в glass-капсуле (см. ToolbarButtonGroup).

import React, { useState } from "react";
import {
  Box,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
} from "@mui/material";
import SortIcon from "@mui/icons-material/Sort";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import {
  FAMILY_SORT_OPTIONS,
  familySortLabel,
} from "../../utils/families/sortFamilies";
import { popoverArrowSx } from "../../theme/popoverArrow";
import { useToolbarButtonGroupHitSx } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

function SortPillTrigger({ value, nested, onOpen }) {
  const hitSx = useToolbarButtonGroupHitSx(true);

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      sx={{ ...hitSx, gap: TOOLBAR_HIT.gapIconLabelPx }}
    >
      <SortIcon sx={{ fontSize: TOOLBAR_HIT.iconSize, color: "inherit" }} />
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
        {familySortLabel(value)}
      </Typography>
      {nested && (
        <KeyboardArrowDownIcon
          sx={{
            fontSize: TOOLBAR_HIT.chevronSize,
            width: TOOLBAR_HIT.chevronSize,
            height: TOOLBAR_HIT.chevronSize,
            opacity: 0.85,
            color: "inherit",
          }}
        />
      )}
    </Box>
  );
}

export default function FamilySortPill({ value = "date", onChange, nested = false }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const trigger = (
    <Tooltip title="Сортировка каталога">
      <SortPillTrigger value={value} nested={nested} onOpen={handleOpen} />
    </Tooltip>
  );

  const menu = (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      onClick={(event) => event.stopPropagation()}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      slotProps={{
        paper: {
          sx: {
            mt: 1.5,
            minWidth: 220,
            borderRadius: TOOLBAR_MENU.paperRadiusPx,
            overflow: "visible",
            backgroundImage: "none",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "#1E1E1E" : "#FFFFFF",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 16px 36px rgba(0, 0, 0, 0.5)"
                : "0 16px 36px rgba(0, 0, 0, 0.16)",
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
          Сортировка
        </Typography>

        {FAMILY_SORT_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <MenuItem
              key={option.value}
              onClick={(event) => {
                event.stopPropagation();
                onChange?.(option.value);
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
                <SortIcon
                  sx={{
                    fontSize: 18,
                    opacity: 0.5,
                    color: isSelected ? "text.primary" : "text.secondary",
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
                {option.label}
              </Typography>
            </MenuItem>
          );
        })}
      </Box>
    </Menu>
  );

  return (
    <>
      {trigger}
      {menu}
    </>
  );
}
