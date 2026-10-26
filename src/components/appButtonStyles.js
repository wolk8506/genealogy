import { alpha } from "@mui/material/styles";

const subtleBackground = (theme) =>
  alpha(
    theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.common.black,
    theme.palette.mode === "dark" ? 0.07 : 0.05
  );

const subtleHover = (theme) =>
  alpha(
    theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.common.black,
    theme.palette.mode === "dark" ? 0.12 : 0.09
  );

export const appButtonBaseSx = {
  height: 24,
  minHeight: 24,
  borderRadius: "12px",
  px: 2.25,
  py: 0,
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: 1.2,
  textTransform: "none",
  whiteSpace: "nowrap",
  boxShadow: "none",
  "&:hover": { boxShadow: "none" },
  "& .MuiButton-startIcon": {
    mr: 0.5,
    ml: 0,
    "& > *:nth-of-type(1)": { fontSize: 16 },
  },
};

export const appButtonPresetSx = {
  primary: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: (theme) => theme.palette.primary.dark,
    },
    "&.Mui-disabled": {
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.32),
      color: (theme) => alpha(theme.palette.primary.contrastText, 0.8),
    },
  },
  secondary: {
    bgcolor: subtleBackground,
    color: (theme) => alpha(theme.palette.text.primary, 0.85),
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: (theme) => `${subtleHover(theme)} !important`,
    },
    "&.Mui-disabled": {
      bgcolor: (theme) => alpha(theme.palette.text.primary, 0.05),
      color: (theme) => alpha(theme.palette.text.primary, 0.35),
    },
  },
  danger: {
    bgcolor: (theme) => alpha(theme.palette.error.main, 0.22),
    color: "error.main",
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: (theme) =>
        `${alpha(theme.palette.error.main, 0.3)} !important`,
    },
    "&.Mui-disabled": {
      bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
      color: (theme) => alpha(theme.palette.error.main, 0.4),
    },
  },
  dangerOutlined: {
    bgcolor: (theme) => alpha(theme.palette.error.main, 0.16),
    color: "error.main",
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: (theme) =>
        `${alpha(theme.palette.error.main, 0.24)} !important`,
    },
    "&.Mui-disabled": {
      bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
      color: (theme) => alpha(theme.palette.error.main, 0.35),
    },
  },
  ghost: {
    bgcolor: "transparent",
    color: (theme) => alpha(theme.palette.text.primary, 0.85),
    "&:hover:not(.Mui-disabled)": {
      backgroundColor: (theme) => `${subtleHover(theme)} !important`,
    },
    "&.Mui-disabled": {
      color: "text.disabled",
    },
  },
};
