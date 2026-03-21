import React from "react";
import { Box } from "@mui/material";

// Вспомогательный компонент для группировки кнопок в рамку
export default function ButtonConteiner({ children }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 7,
        height: 40,
        color: "text.secondary",
      }}
    >
      {children}
    </Box>
  );
}
