// import React from "react";
// import ReactDOM from "react-dom/client";
// import { Provider } from "react-redux";
// import { store } from "./app/store";
// import App from "./app/App";
// import { BrowserRouter } from "react-router-dom";
// import { SnackbarProvider } from "notistack"; // 👈 добавлено

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <Provider store={store}>
//     <BrowserRouter>
//       <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
//         <App />
//       </SnackbarProvider>
//     </BrowserRouter>
//   </Provider>
// );
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./app/App";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { setTheme } from "./features/theme/themeSlice";

async function bootstrap() {
  // Загружаем тему из настроек
  let theme = "light";
  try {
    const settings = await window.settingsAPI.get();
    if (settings?.theme) {
      theme = settings.theme;
    }
  } catch (err) {
    console.warn("⚠️ Не удалось загрузить настройки темы:", err);
  }

  store.dispatch(setTheme(theme));

  ReactDOM.createRoot(document.getElementById("root")).render(
    <Provider store={store}>
      <BrowserRouter>
        <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
          <App />
        </SnackbarProvider>
      </BrowserRouter>
    </Provider>
  );
}

bootstrap();
