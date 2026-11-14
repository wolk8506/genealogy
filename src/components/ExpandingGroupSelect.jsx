import React, { useState } from "react";
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  Divider,
  Tooltip,
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { popoverArrowSx } from "../theme/popoverArrow";
import ToolbarButtonGroup from "./ToolbarButtonGroup";
import { useToolbarButtonGroupHitSx } from "./ToolbarCapsuleContext";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../layout/toolbarTokens";

function GroupSelectTrigger({
  isExpanded,
  selectedOption,
  CurrentIcon,
  onOpen,
  open,
  label,
  nested,
}) {
  const hitSx = useToolbarButtonGroupHitSx(isExpanded);

  return (
    <Tooltip title={!open ? label : ""}>
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        sx={{
          ...hitSx,
          gap: isExpanded ? TOOLBAR_HIT.gapIconLabelPx : TOOLBAR_HIT.gapPx,
          px: nested
            ? isExpanded
              ? 0.75
              : 0.375
            : TOOLBAR_HIT.segmentPaddingX,
        }}
      >
        <CurrentIcon
          sx={{
            fontSize: TOOLBAR_HIT.iconSize,
            color: "inherit",
          }}
        />
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
            {selectedOption?.label}
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
      </Box>
    </Tooltip>
  );
}

/**
 * Пилюля группировки фотогалереи. `options` и `label` приходят снаружи,
 * чтобы каждая галерея описывала свои режимы, а не различала себя флагом.
 */
export default function ExpandingGroupSelect({
  value,
  onChange,
  options,
  label = "Группировка",
  nested = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const selectedOption = options.find((o) => o.value === value);
  const isExpanded = value !== "none";

  const CurrentIcon =
    selectedOption && isExpanded ? selectedOption.icon.type : ViewModuleIcon;

  const menu = (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={handleClose}
      onClick={(e) => e.stopPropagation()}
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
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 16px 36px rgba(0, 0, 0, 0.5)"
                : "0 16px 36px rgba(0, 0, 0, 0.16)",
            "&::before": popoverArrowSx(),
          },
        },
        list: {
          sx: { py: 0.5, px: 0.5 },
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
          {label}
        </Typography>

        {options.flatMap((opt, index) => {
          const elements = [];
          const isSelected = opt.value === value;

          if (index > 0 && opt.category !== options[index - 1].category) {
            elements.push(
              <Divider
                key={`divider-${opt.value}`}
                sx={{ my: 0.5, mx: 1, opacity: 0.6 }}
              />,
            );
          }

          elements.push(
            <MenuItem
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
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
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: "action.hover" },
                "&.Mui-focusVisible": { bgcolor: "action.hover" },
              }}
            >
              <Box
                sx={{
                  width: TOOLBAR_MENU.checkGutter,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.primary",
                }}
              >
                {isSelected && (
                  <CheckIcon sx={{ fontSize: TOOLBAR_MENU.checkIcon }} />
                )}
              </Box>
              <ListItemIcon
                sx={{
                  minWidth: "28px !important",
                  color: isSelected ? "text.primary" : "text.secondary",
                }}
              >
                {opt.icon}
              </ListItemIcon>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "text.primary" : "text.secondary",
                }}
              >
                {opt.label}
              </Typography>
            </MenuItem>,
          );

          return elements;
        })}
      </Box>
    </Menu>
  );

  const trigger = (
    <GroupSelectTrigger
      isExpanded={isExpanded}
      selectedOption={selectedOption}
      CurrentIcon={CurrentIcon}
      onOpen={handleOpen}
      open={open}
      label={label}
      nested={nested}
    />
  );

  if (nested) {
    return (
      <>
        {trigger}
        {menu}
      </>
    );
  }

  return (
    <>
      <ToolbarButtonGroup>{trigger}</ToolbarButtonGroup>
      {menu}
    </>
  );
}
