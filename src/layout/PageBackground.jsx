// layout/PageBackground.jsx
// Фоновая подложка страницы в оттенке цвета её раздела.
// Градиент — отдельный fixed-слой на всё окно под хедером: он не зависит
// от отступов main и остаётся виден под полупрозрачной правой панелью.

import React from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { pageAmbientSx } from "../theme/pageAmbient";

export default function PageBackground({ accent, children }) {
  const theme = useTheme();

  if (!accent) return children;

  return (
    <>
      <Box
        aria-hidden
        sx={[
          pageAmbientSx(theme, accent),
          {
            position: "fixed",
            top: 50,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            pointerEvents: "none",
          },
        ]}
      />
      {children}
    </>
  );
}
