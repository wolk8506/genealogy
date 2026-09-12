import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./app/App";
import { HashRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { setTheme } from "./theme/themeSlice";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.locale("ru"); // активируем русскую локаль

async function bootstrap() {
  // Без preload-моста (страница открыта в обычном браузере, а не в Electron)
  // дальше работать нечему: весь слой данных — это IPC. Показываем заглушку.
  if (
    typeof window === "undefined" ||
    !window.themeAPI ||
    !window.settings
  ) {
    document.getElementById("boot-splash")?.remove();
    document.body.classList.remove("booting");
    document.getElementById("root").innerHTML =
      '<div style="display:flex;height:100vh;align-items:center;justify-content:center;' +
      'background:#05070d;color:#f4f7ff;font-family:system-ui,sans-serif;text-align:center;padding:24px;">' +
      "<div><div style='font-size:20px;font-weight:800;margin-bottom:8px;'>GENEALOGY</div>" +
      "<div style='color:rgba(215,225,255,0.72);'>Откройте приложение через Electron " +
      "(<code>npm run dev</code> или собранную версию), а не в браузере: хранение данных работает только там.</div></div></div>";
    return;
  }

  // Загружаем тему из настроек
  let theme = "light";
  try {
    const userTheme = await window.settings.get("theme");
    if (userTheme) {
      theme = userTheme;
    }
  } catch (err) {
    console.warn("⚠️ Не удалось загрузить настройки темы:", err);
  }

  store.dispatch(setTheme(theme));

  ReactDOM.createRoot(document.getElementById("root")).render(
    <Provider store={store}>
      <HashRouter>
        <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
            <App />
          </LocalizationProvider>
        </SnackbarProvider>
      </HashRouter>
    </Provider>,
  );

  // Скрываем pre-React splash сразу после монтирования корня.
  requestAnimationFrame(() => {
    const splash = document.getElementById("boot-splash");
    if (!splash) return;
    splash.classList.add("hide");
    setTimeout(() => {
      splash.remove();
      document.body.classList.remove("booting");
    }, 260);
  });
}

bootstrap();
