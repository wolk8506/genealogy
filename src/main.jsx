import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./app/App";
import { HashRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { setTheme } from "./features/theme/themeSlice";

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
          <App />
        </SnackbarProvider>
      </HashRouter>
    </Provider>
  );
}

bootstrap();
