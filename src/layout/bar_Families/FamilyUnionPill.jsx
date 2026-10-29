// layout/bar_Families/FamilyUnionPill.jsx
// Переключатель союзов человека — pill в хедере, в стиле сортировки галереи.

import React, { useState } from "react";
import {
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  styled,
} from "@mui/material";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import { toolbarPillBg, toolbarPillSx } from "../toolbarStyles";

const StyledPill = styled(Box)(() => ({
  ...toolbarPillSx,
  display: "flex",
  alignItems: "center",
  fontSize: 20,
  width: "auto",
  maxWidth: 320,
  paddingRight: 12,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor: toolbarPillBg,
}));

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
    <StyledPill onClick={handleOpen}>
      <IconButton size="small" sx={{ color: "text.primary", p: 1 }}>
        <FavoriteRoundedIcon
          fontSize="inherit"
          sx={{ color: "primary.main" }}
        />
      </IconButton>

      <Typography
        variant="caption"
        noWrap
        sx={{
          color: "text.primary",
          whiteSpace: "nowrap",
          ml: 0.5,
          fontWeight: 600,
        }}
      >
        {current?.label || "Союз"}
      </Typography>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(event) => event.stopPropagation()}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 240 } } }}
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
          Союзы
        </Typography>

        {options.map((option) => (
          <MenuItem
            key={option.key}
            selected={option.key === activeKey}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(option.key);
              handleClose();
            }}
            sx={{ gap: 1 }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto !important",
                display: "flex",
                alignItems: "center",
              }}
            >
              <FavoriteRoundedIcon
                sx={{ fontSize: 16, color: "primary.main" }}
              />
            </ListItemIcon>
            <Typography variant="body2" noWrap>
              {option.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </StyledPill>
  );
}
