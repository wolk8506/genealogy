import React, { useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import ClippedDrawer from "../layout/ClippedDrawer";
import { ThemeContext } from "../context/ThemeContext.cjs";

export default function App() {
  const [mode, setMode] = useState("light"); // фактическая тема
  const [auto, setAuto] = useState(true); // следовать за системой
  const [userPref, setUserPref] = useState("light"); // ручной выбор

  // начальная загрузка
  useEffect(() => {
    const savedAuto = localStorage.getItem("theme-auto");
    const savedPref = localStorage.getItem("theme-user");

    const autoEnabled = savedAuto !== "false"; // по умолчанию true
    setAuto(autoEnabled);
    setUserPref(savedPref || "light");

    if (autoEnabled) {
      window.themeAPI.get().then(setMode);
      window.themeAPI.onChange(setMode);
    } else {
      setMode(savedPref || "light");
    }
  }, []);

  // при изменении auto или userPref
  useEffect(() => {
    localStorage.setItem("theme-auto", auto);
    localStorage.setItem("theme-user", userPref);

    if (auto) {
      window.themeAPI.get().then(setMode);
    } else {
      setMode(userPref);
    }
  }, [auto, userPref]);

  // const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        components: {
          MuiCssBaseline: {
            styleOverrides: (themeParam) => ({
              "*::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "*::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "*::-webkit-scrollbar-thumb": {
                backgroundColor:
                  themeParam.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                border: "2px solid transparent",
                backgroundClip: "content-box",

                /* Тут добавляем анимацию */
                transition: "background-color 0.3s ease, width 0.3s ease",
              },
              "*::-webkit-scrollbar-thumb:hover": {
                backgroundColor:
                  themeParam.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.4)"
                    : "rgba(0, 0, 0, 0.4)",

                /* И увеличиваем толщину */
                width: "12px",
              },

              /* Firefox (ограниченная поддержка) */
              "*": {
                scrollbarWidth: "thin",
                scrollbarColor: `${themeParam.palette.divider} transparent`,
              },
            }),
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ auto, setAuto, userPref, setUserPref }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ClippedDrawer />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
