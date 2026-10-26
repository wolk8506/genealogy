import React from "react";
import { Box, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";

const TONES = {
  primary: (theme) => ({
    bgcolor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      bgcolor: theme.palette.primary.dark,
    },
    "&.Mui-disabled": {
      bgcolor: alpha(theme.palette.primary.main, 0.35),
      color: alpha(theme.palette.primary.contrastText, 0.6),
    },
  }),
  secondary: (theme) => {
    const isDark = theme.palette.mode === "dark";
    return {
      bgcolor: isDark
        ? alpha(theme.palette.common.white, 0.08)
        : alpha(theme.palette.common.black, 0.05),
      color: alpha(theme.palette.text.primary, 0.85),
      "&:hover": {
        bgcolor: isDark
          ? alpha(theme.palette.common.white, 0.12)
          : alpha(theme.palette.common.black, 0.08),
      },
      "&.Mui-disabled": {
        bgcolor: isDark
          ? alpha(theme.palette.common.white, 0.04)
          : alpha(theme.palette.common.black, 0.03),
        color: alpha(theme.palette.text.primary, 0.35),
      },
    };
  },
  danger: (theme) => ({
    bgcolor: alpha(theme.palette.error.main, 0.14),
    color: theme.palette.error.main,
    "&:hover": {
      bgcolor: alpha(theme.palette.error.main, 0.22),
    },
    "&.Mui-disabled": {
      bgcolor: alpha(theme.palette.error.main, 0.06),
      color: alpha(theme.palette.error.main, 0.4),
    },
  }),
};

export const dialogActionsSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "18px",
  px: 2,
  pt: 1,
  pb: 2,
  "& > .MuiButton-root": {
    flex: "1 1 0",
    maxWidth: 220,
  },
};

export function DialogActionsBar({ sx, children }) {
  return (
    <Box sx={[dialogActionsSx, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean)}>
      {children}
    </Box>
  );
}

export default function DialogActionButton({
  tone = "secondary",
  sx,
  children,
  ...rest
}) {
  return (
    <Button
      disableElevation
      sx={[
        {
          height: 32,
          minWidth: 110,
          px: 1.5,
          borderRadius: "999px",
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          boxShadow: "none",
          "& .MuiButton-startIcon": {
            mr: 0.5,
            ml: 0,
            "& > *:nth-of-type(1)": { fontSize: 16 },
          },
        },
        TONES[tone] || TONES.secondary,
        ...(Array.isArray(sx) ? sx : [sx]),
      ].filter(Boolean)}
      {...rest}
    >
      {children}
    </Button>
  );
}
