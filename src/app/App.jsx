import React, { useEffect, useMemo, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";

import MainLayout from "../layout/MainLayout";
import { ThemeContext } from "../theme/ThemeContext.cjs";

export default function App() {
  const [mode, setMode] = useState("light"); // фактическая тема
  const [auto, setAuto] = useState(true); // следовать за системой
  const [userPref, setUserPref] = useState("light"); // ручной выбор
  const [themeReady, setThemeReady] = useState(false);

  // начальная загрузка
  useEffect(() => {
    const savedAuto = localStorage.getItem("theme-auto");
    const savedPref = localStorage.getItem("theme-user");

    const autoEnabled = savedAuto !== "false"; // по умолчанию true
    setAuto(autoEnabled);
    setUserPref(savedPref || "light");

    if (autoEnabled) {
      window.themeAPI.get().then((systemTheme) => {
        setMode(systemTheme);
        setThemeReady(true); // 🎯 тема загружена
      });
      window.themeAPI.onChange(setMode);
    } else {
      setMode(savedPref || "light");
      setThemeReady(true); // 🎯 можно рендерить
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

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        components: {
          // 1. Глобальные стили (ваши скроллбары)
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

          // 2. Скругление для всех текстовых полей
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: "12px", // Установите нужное значение (например, 12px или 16px)
                // Можно также сразу задать стили для рамок, если нужно
                "& .MuiOutlinedInput-notchedOutline": {
                  transition: "border-color 0.2s ease-in-out",
                },
              },
            },
          },

          // 3. Опционально: скругление для кнопок, чтобы всё было в одном стиле
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: "10px",
                textTransform: "none", // Убирает капс у кнопок (обычно хорошо смотрится со скруглениями)
              },
            },
          },

          // 4. Скругление для выпадающих списков (Paper внутри Select/Autocomplete)
          MuiPaper: {
            styleOverrides: {
              rounded: {
                borderRadius: "16px",
              },
            },
          },

          // 5. Глобальная настройка для всех TextField (включая DatePicker)
          MuiTextField: {
            defaultProps: {
              size: "small", // Чтобы везде по умолчанию был маленький размер
            },
            styleOverrides: {
              root: {
                // Гарантируем, что радиус из OutlinedInput применится здесь
                "& .MuiOutlinedInput-root": {
                  borderRadius: "12px",
                },
              },
            },
          },

          // 6. Специально для полей DatePicker (если они используют внутренние стили)
          MuiInputBase: {
            styleOverrides: {
              root: {
                borderRadius: "12px",
              },
            },
          },

          // 7. Фикс специально для MUI X (v7+) - Поля ввода календарей
          MuiPickersOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: "12px", // Тот же радиус, что и везде
                "& .MuiOutlinedInput-notchedOutline": {
                  transition: "border-color 0.2s ease-in-out",
                },
              },
            },
          },

          // На всякий случай для других типов полей MUI X (если используете стандартные или заполненные)
          MuiPickersInputBase: {
            styleOverrides: {
              root: {
                borderRadius: "12px",
              },
            },
          },
        },
      }),
    [mode],
  );

  if (!themeReady) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          bgcolor: "#121212",
        }}
      >
        <CircularProgress size={64} thickness={5} />
        <Typography variant="h6" sx={{ mt: 2, color: "divider" }}>
          Загрузка…
        </Typography>
      </Box>
    );
  }

  return (
    <ThemeContext.Provider value={{ auto, setAuto, userPref, setUserPref }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainLayout />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
