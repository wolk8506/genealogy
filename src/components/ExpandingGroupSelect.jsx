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
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { toolbarPillBg, toolbarPillSx } from "../layout/toolbarStyles";

const StyledContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ $expanded }) => ({
  ...toolbarPillSx,
  display: "flex",
  alignItems: "center",
  transition:
    "width 300ms cubic-bezier(0.23, 1, 0.32, 1), padding-right 300ms cubic-bezier(0.23, 1, 0.32, 1)",
  width: $expanded ? "auto" : 36,
  paddingRight: $expanded ? 12 : 0,
  overflow: "hidden",
  cursor: "pointer",
  fontSize: 20,
  backgroundColor: toolbarPillBg,
}));

/**
 * Пилюля группировки фотогалереи. `options` и `label` приходят снаружи,
 * чтобы каждая галерея описывала свои режимы, а не различала себя флагом.
 */
export default function ExpandingGroupSelect({
  value,
  onChange,
  options,
  label = "Группировка",
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const selectedOption = options.find((o) => o.value === value);
  const isExpanded = value !== "none";

  const CurrentIcon =
    selectedOption && isExpanded ? selectedOption.icon.type : ViewModuleIcon;

  return (
    <StyledContainer $expanded={isExpanded} onClick={handleOpen}>
      <Tooltip title={!open ? label : ""}>
        <IconButton size="small" sx={{ color: "text.primary", p: 1 }}>
          <CurrentIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>

      {isExpanded && (
        <Typography
          variant="caption"
          sx={{
            color: "text.primary",
            whiteSpace: "nowrap",
            ml: 0.5,
            fontWeight: 600,
          }}
        >
          {selectedOption?.label}
        </Typography>
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            },
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            display: "block",
            color: "primary.main",
            fontWeight: "bold",
          }}
        >
          {label}
        </Typography>

        {options.flatMap((opt, index) => {
          const elements = [];

          if (index > 0 && opt.category !== options[index - 1].category) {
            elements.push(
              <Divider
                key={`divider-${opt.value}`}
                sx={{ my: 0.5, opacity: 0.6 }}
              />,
            );
          }

          elements.push(
            <MenuItem
              key={opt.value}
              selected={opt.value === value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                handleClose();
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon
                sx={{ color: opt.value === value ? "primary.main" : "inherit" }}
              >
                {opt.icon}
              </ListItemIcon>
              <Typography variant="body2">{opt.label}</Typography>
            </MenuItem>,
          );

          return elements;
        })}
      </Menu>
    </StyledContainer>
  );
}
