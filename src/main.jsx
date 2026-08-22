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
