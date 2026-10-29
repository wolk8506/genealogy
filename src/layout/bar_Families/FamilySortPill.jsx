// layout/bar_Families/FamilySortPill.jsx
// Сортировка каталога семей — pill в хедере, как в глобальной фотогалерее.

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
import SortIcon from "@mui/icons-material/Sort";
import {
  FAMILY_SORT_OPTIONS,
  familySortLabel,
} from "../../utils/families/sortFamilies";
import { toolbarPillBg, toolbarPillSx } from "../toolbarStyles";

const StyledPill = styled(Box)(() => ({
  ...toolbarPillSx,
  display: "flex",
  alignItems: "center",
  fontSize: 20,
  width: "auto",
  paddingRight: 12,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor: toolbarPillBg,
}));

export default function FamilySortPill({ value = "date", onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <StyledPill onClick={handleOpen}>
      <IconButton size="small" sx={{ color: "text.primary", p: 1 }}>
        <SortIcon fontSize="inherit" />
      </IconButton>

      <Typography
        variant="caption"
        sx={{
          color: "text.primary",
          whiteSpace: "nowrap",
          ml: 0.5,
          fontWeight: 600,
        }}
      >
        {familySortLabel(value)}
      </Typography>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(event) => event.stopPropagation()}
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
          Сортировка
        </Typography>

        {FAMILY_SORT_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={(event) => {
              event.stopPropagation();
              onChange?.(option.value);
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
            </ListItemIcon>
            <Typography variant="body2">{option.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </StyledPill>
  );
}
