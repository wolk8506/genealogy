import React from "react";
import { Box, Button, Divider, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export const groupSx = {
  border: (t) => (t.palette.mode === "dark" ? "none" : "1px solid"),
  borderColor: "divider",
  borderRadius: "12px",
  overflow: "hidden",
  bgcolor: "background.paper",
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
          noWrap
          sx={{
            fontSize: "0.8125rem",
            lineHeight: 1.4,
            color: danger ? "error.main" : "text.primary",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            display="block"
            noWrap
            sx={{
              fontSize: "0.7rem",
              lineHeight: 1.45,
              color: "text.secondary",
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
        borderRadius: "10px",
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
        borderRadius: "11px",
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
