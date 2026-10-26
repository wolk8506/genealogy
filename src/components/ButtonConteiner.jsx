import React from "react";
import { Box } from "@mui/material";
import { toolbarPillHoverBg, toolbarPillSx } from "../layout/toolbarStyles";

// Вспомогательный компонент для группировки кнопок в общую «пилюлю».
export default function ButtonConteiner({ children }) {
  const isGroup = React.Children.count(children) > 1;

  return (
    <Box
      sx={{
        ...toolbarPillSx,
        display: "inline-flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        color: "text.primary",
        fontSize: 20,
        backdropFilter: "blur(6px)",
        "&:hover": { backgroundColor: "rgba(153, 153, 153, 0.17)" },
        "& > .MuiIconButton-root": {
          width: 36,
          height: 36,
          p: isGroup ? "3px" : 0,
          backgroundClip: isGroup ? "content-box" : "border-box",
        },
        "& > .MuiIconButton-root:hover:not(.Mui-disabled)": {
          backgroundColor: toolbarPillHoverBg,
        },
        "& .MuiDivider-root": { my: 1 },
      }}
    >
      {children}
    </Box>
  );
}
