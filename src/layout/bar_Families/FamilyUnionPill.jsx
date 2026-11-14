// layout/bar_Families/FamilyUnionPill.jsx
// Переключатель союзов на детальной странице семьи — glass-капсула.

import React, { useState } from "react";
import {
  Box,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
} from "@mui/material";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { popoverArrowSx } from "../../theme/popoverArrow";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { useToolbarButtonGroupHitSx } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

function UnionPillTrigger({ onOpen, current }) {
  const hitSx = useToolbarButtonGroupHitSx(true);

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      sx={{
        ...hitSx,
        gap: TOOLBAR_HIT.gapIconLabelPx,
        maxWidth: 280,
      }}
    >
      <FavoriteRoundedIcon
        sx={{ fontSize: TOOLBAR_HIT.iconSize, color: "inherit" }}
      />
      <Typography
        variant="caption"
        component="span"
        noWrap
        sx={{
          color: "inherit",
          fontWeight: 600,
          fontSize: "0.75rem",
          lineHeight: 1,
          minWidth: 0,
        }}
      >
        {current?.label || "Союз"}
      </Typography>
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
    </Box>
  );
}

export default function FamilyUnionPill({
  options = [],
  activeKey,
  onSelect,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  if (options.length < 2) return null;

  const current = options.find((option) => option.key === activeKey);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Выбрать союз">
        <ToolbarButtonGroup>
          <UnionPillTrigger onOpen={handleOpen} current={current} />
        </ToolbarButtonGroup>
      </Tooltip>

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
              minWidth: 240,
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
            Союзы
          </Typography>

          {options.map((option) => {
            const isSelected = option.key === activeKey;
            return (
              <MenuItem
                key={option.key}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(option.key);
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
                  <FavoriteRoundedIcon
                    sx={{
                      fontSize: TOOLBAR_HIT.iconSize,
                      color: "primary.main",
                    }}
                  />
                </ListItemIcon>
                <Typography
                  variant="body2"
                  noWrap
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
    </>
  );
}
