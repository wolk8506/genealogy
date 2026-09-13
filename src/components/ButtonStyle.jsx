

export const btnStyleGrey = {
  height: 24,
  borderRadius: "6px",
  py: 1.2,
  px: 3.6,
  textTransform: "none",
//   fontWeight: 600,
  fontSize: "0.95rem",
  color: "text.primary",
  bgcolor: (theme) =>
    theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.05)"
      : "rgba(0,0,0,0.05)",
  "&:hover": {
    bgcolor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.1)",
  },
};

export const btnStyleBlue = {
  height: 24,
    borderRadius: "6px", // Системный радиус macOS
  color: "#ffffff",
    py: 1.2,
  px: 2.5,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  bgcolor: "#007AFF", // Фирменный Blue
  "&:hover": {
    bgcolor: "#0062CC",
  },
};

export const btnStyleRed = {
  height: 24,
  borderRadius: "6px", // Системный радиус macOS
  py: 1.2,
  px: 2.5,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  bgcolor: "#542B2A", // Фирменный Blue
  "&:hover": {
    bgcolor: "#4e2827",
  },
};
