// import ClippedDrawer from "../layout/ClippedDrawer";
// import React from "react";
// import { useSelector, useDispatch } from "react-redux";
// import { ThemeProvider, CssBaseline, Container, Button } from "@mui/material";
// import { getTheme } from "../theme";
// import { toggleTheme } from "../features/theme/themeSlice";
// import HelloPage from "../features/hello/HelloPage";

// export default function App() {
//   const mode = useSelector((state) => state.theme.mode);
//   const dispatch = useDispatch();
//   const theme = getTheme(mode);

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <ClippedDrawer />
//     </ThemeProvider>
//   );
// }
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getTheme } from "../theme";
import ClippedDrawer from "../layout/ClippedDrawer";

export default function App() {
  const mode = useSelector((state) => state.theme.mode);
  const theme = getTheme(mode);

  useEffect(() => {
    window.settingsAPI?.set?.("theme", mode);
  }, [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ClippedDrawer />
    </ThemeProvider>
  );
}
