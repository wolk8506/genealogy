import React, { useEffect, useMemo, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";

import MainLayout from "../layout/MainLayout";
import { ThemeContext } from "../theme/ThemeContext.cjs";
import { useSettingsStore } from "../store/useSettingsStore";

const pulse = keyframes`
  0%, 100% { transform: scale(0.96); opacity: 0.7; }
  50% { transform: scale(1.04); opacity: 1; }
`;

const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -300px 0; }
  100% { background-position: 300px 0; }
`;

export default function App() {
  const [mode, setMode] = useState("light"); // фактическая тема
  const [auto, setAuto] = useState(true); // следовать за системой
  const [userPref, setUserPref] = useState("light"); // ручной выбор
  const [themeReady, setThemeReady] = useState(false);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    loadSettings(); // Загружаем настройки из БД в память при старте
  }, []);

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

  useEffect(() => {
    if (!themeReady) return;
    document.body.style.background = mode === "dark" ? "#121212" : "#f6f7fb";
  }, [themeReady, mode]);

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
          position: "relative",
          height: "100vh",
          width: "100%",
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          bgcolor: "#05070d",
          background:
            "radial-gradient(1200px 600px at 20% 20%, rgba(49,84,255,0.18), transparent 55%), radial-gradient(900px 600px at 80% 70%, rgba(0,219,176,0.13), transparent 60%), linear-gradient(160deg, #05070d 0%, #0b1021 45%, #06080f 100%)",
        }}
      >
        {[...Array(8)].map((_, i) => (
          <Box
            key={`particle-${i}`}
            sx={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "rgba(121, 158, 255, 0.55)",
              top: `${15 + (i * 9)}%`,
              left: `${8 + ((i * 11) % 84)}%`,
              filter: "blur(0.2px)",
              animation: `${pulse} ${2.2 + i * 0.25}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}

        <Box sx={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Box
            sx={{
              width: 220,
              height: 220,
              borderRadius: "50%",
              border: "1px solid rgba(120, 170, 255, 0.22)",
              animation: `${orbit} 7.5s linear infinite`,
              position: "absolute",
              "&::before": {
                content: '""',
                position: "absolute",
                width: 10,
                height: 10,
                borderRadius: "50%",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                bgcolor: "#7f9cff",
                boxShadow: "0 0 16px rgba(127,156,255,0.85)",
              },
            }}
          />

          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: "50%",
              border: "1px dashed rgba(84, 222, 197, 0.35)",
              animation: `${orbit} 5.4s linear infinite reverse`,
              position: "absolute",
            }}
          />

          <Box
            sx={{
              px: 3,
              py: 2,
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(8, 12, 24, 0.64)",
              backdropFilter: "blur(8px)",
              textAlign: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: 0.6,
                color: "#f4f7ff",
                mb: 0.5,
              }}
            >
              GENEALOGY
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(215,225,255,0.72)",
                display: "inline-block",
                backgroundImage:
                  "linear-gradient(90deg, rgba(220,230,255,0.55), rgba(220,230,255,1), rgba(220,230,255,0.55))",
                backgroundSize: "300px 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: `${shimmer} 2.2s linear infinite`,
              }}
            >
              Инициализация приложения...
            </Typography>
          </Box>
        </Box>
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
