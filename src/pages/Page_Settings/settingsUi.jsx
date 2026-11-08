import React from "react";
import { Box, Button, Divider, IconButton, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export const groupSx = {
  border: (t) => (t.palette.mode === "dark" ? "none" : "1px solid"),
  borderColor: "divider",
  borderRadius: "12px",
  overflow: "hidden",
  bgcolor: "background.paper",
};

export const sliderSx = {
  "& .MuiSlider-rail": {
    opacity: 1,
    height: 4,
    borderRadius: 2,
    bgcolor: (t) =>
      t.palette.mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
  },
  "& .MuiSlider-track": {
    height: 4,
    border: "none",
    borderRadius: 2,
  },
  "& .MuiSlider-thumb": {
    width: 20,
    height: 16,
    borderRadius: "8px",
    bgcolor: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    "&:hover, &.Mui-focusVisible": {
      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
    },
    "&.Mui-active": {
      width: 22,
      height: 18,
      borderRadius: "8px",
      bgcolor: (t) =>
        t.palette.mode === "dark"
          ? "rgba(255,255,255,0.14)"
          : "rgba(0,0,0,0.08)",
      boxShadow: (t) =>
        `0 0 0 1px ${
          t.palette.mode === "dark"
            ? "rgba(0,0,0,0.45)"
            : "rgba(0,0,0,0.12)"
        }`,
    },
  },
  "& .MuiSlider-mark": {
    width: 3,
    height: 3,
    borderRadius: "50%",
    opacity: 0.55,
    top: "calc(50% + 12px)",
    bgcolor: "text.primary",
  },
  "& .MuiSlider-markLabel[data-index='0']": {
    transform: "translateX(0)",
  },
  "& .MuiSlider-markLabel[data-index='2']": {
    transform: "translateX(-100%)",
  },
};

export const sectionLabelSx = {
  display: "block",
  mb: 1,
  ml: 0.5,
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "text.secondary",
};

export function RowIcon({ bg, tone, children }) {
  const color = tone || bg;

  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "8px",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        bgcolor: (t) => {
          if (typeof color === "string" && t.palette.accents?.[color]) {
            return t.palette.accents[color];
          }
          return color;
        },
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

export function RowDivider({ inset = 7.25 }) {
  return <Divider sx={{ ml: inset, borderColor: "divider" }} />;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  disabled,
  danger,
  multiline,
}) {
  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 0.75,
        minHeight: 42,
        cursor: onClick && !disabled ? "pointer" : "default",
        opacity: disabled ? 0.45 : 1,
        "&:hover":
          onClick && !disabled ? { bgcolor: "action.hover" } : undefined,
      }}
    >
      {icon}
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          fontWeight={400}
          noWrap={!multiline}
          sx={{
            fontSize: "0.8125rem",
            lineHeight: 1.4,
            color: danger ? "error.main" : "text.primary",
            ...(multiline && {
              whiteSpace: "normal",
              overflowWrap: "anywhere",
            }),
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            display="block"
            noWrap={!multiline}
            sx={{
              fontSize: "0.7rem",
              lineHeight: 1.45,
              color: "text.secondary",
              ...(multiline && {
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }),
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {trailing}
    </Box>
  );
}

export function SegmentedControl({ value, onChange, options }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: "2px",
        p: "2px",
        borderRadius: "12px",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(118,118,128,0.12)",
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            disableRipple
            onClick={() => onChange(option.value)}
            sx={{
              flex: 1,
              height: 30,
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8rem",
              color: (t) =>
                active
                  ? t.palette.mode === "dark"
                    ? t.palette.text.primary
                    : "#000"
                  : "text.primary",
              bgcolor: (t) =>
                active
                  ? t.palette.mode === "dark"
                    ? "#404040"
                    : "#fff"
                  : "transparent",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.18)" : "none",
              "&:hover": {
                bgcolor: (t) =>
                  active
                    ? t.palette.mode === "dark"
                      ? "#404040"
                      : "#fff"
                    : "action.selected",
              },
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </Box>
  );
}

export function CountBadge({ value }) {
  return (
    <Box
      sx={{
        minWidth: 24,
        height: 22,
        px: 0.8,
        borderRadius: "999px",
        bgcolor: "action.hover",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Typography variant="caption" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

export const chevron = (
  <ChevronRightIcon
    sx={{
      fontSize: 16,
      color: "text.disabled",
    }}
  />
);

const statusTone = {
  success: { bg: "green", icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
  error: { bg: "red", icon: <ErrorOutlineIcon sx={{ fontSize: 18 }} /> },
  warning: { bg: "orange", icon: <WarningAmberIcon sx={{ fontSize: 18 }} /> },
  info: { bg: "blue", icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} /> },
};

// Статус операции живёт внутри карточки, а не всплывает поверх окна:
// сообщение появляется там, где было действие, и не тянет за собой таймер.
export function InlineStatus({ tone = "info", title, message, onClose }) {
  const tone_ = statusTone[tone] || statusTone.info;

  return (
    <Box
      sx={{
        ...groupSx,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
      }}
    >
      <RowIcon bg={tone_.bg}>{tone_.icon}</RowIcon>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ lineHeight: 1.4, overflowWrap: "anywhere" }}
        >
          {title}
        </Typography>
        {message && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ lineHeight: 1.4, overflowWrap: "anywhere" }}
          >
            {message}
          </Typography>
        )}
      </Box>
      {onClose && (
        <IconButton
          size="small"
          aria-label="Закрыть сообщение"
          onClick={onClose}
          sx={{
            flexShrink: 0,
            color: "text.disabled",
            transition: "color 120ms ease-out, transform 120ms ease-out",
            "&:hover": { color: "text.primary" },
            "&:active": { transform: "scale(0.92)" },
            "& svg": { fontSize: 16 },
          }}
        >
          <CloseIcon />
        </IconButton>
      )}
    </Box>
  );
}
