import React from "react";
import { Box } from "@mui/material";

// Вспомогательный компонент для группировки кнопок в рамку
export default function ButtonConteiner({ children }) {
  return (
    <Box
      sx={{
        WebkitAppRegion: "no-drag",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        // gap: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 7,
        height: 34,
        color: "text.secondary",
        fontSize: 20,
        backdropFilter: "blur(5px)",
      }}
    >
      {children}
    </Box>
  );
}
