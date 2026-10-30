// src/main/window.cjs
const { BrowserWindow, session } = require("electron");
const path = require("path");
const log = require("./logger.cjs").createLogger("window");
const isDev = process.env.NODE_ENV === "development";

// Разрешаем запросы геолокации из рендерера (локатор «Моё местоположение»).
session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
  callback(permission === "geolocation");
});

// Проверка платформы
const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";
const { setMainWindow } = require("./mainWindow.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1430,
    height: 700,
    minWidth: 1430, // минимальная ширина
    minHeight: 700, // минимальная высота
    resizable: true, // окно остаётся изменяемым, но не меньше min*
    titleBarStyle: isMac ? "hidden" : "default", // Скрывает полосу, но оставляет кнопки управления

    titleBarOverlay: {
      height: 50, // Увеличьте это число, чтобы "опустить" кнопки визуально ниже
    },
    backgroundColor: "#05070d",

    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      //   webSecurity: false, // ← подумать о безопасной замене
      webSecurity: !isDev, // ✅ true в продакшене, false только в dev
    },
  });

  // --- ДОБАВЛЯЕМ СЛУШАТЕЛИ СОСТОЯНИЯ ОКНА ЗДЕСЬ ---

  // win.on("maximize", () => {
  //   win.webContents.send("window-state-change", true);
  // });

  // win.on("unmaximize", () => {
  //   win.webContents.send("window-state-change", false);
  // });

  // Для macOS (Fullscreen)
  win.on("enter-full-screen", () => {
    win.webContents.send("window-state-change", true);
  });

  win.on("leave-full-screen", () => {
    win.webContents.send("window-state-change", false);
  });

  // win.webContents.on("did-finish-load", () => {
  //   win.webContents.send("window-state-change", win.isMaximized());
  // });

  // --- КОНЕЦ БЛОКА СЛУШАТЕЛЕЙ ---

  // Диагностика падений рендерера. Без этих обработчиков при крахе
  // рендерера окно просто становится пустым, а main-процесс продолжает
  // жить — снаружи это выглядит как «зависшее» приложение.
  let crashReloads = 0;
  let responsiveTimer = null;

  win.webContents.on("render-process-gone", (_event, details) => {
    log.error(
      `Рендерер завершился: reason=${details.reason} exitCode=${details.exitCode}`,
    );
    if (details.reason === "clean-exit") return;
    if (win.isDestroyed()) return;
    if (crashReloads >= 2) {
      log.error("Рендерер падает повторно — автоперезагрузка остановлена");
      return;
    }
    crashReloads += 1;
    setTimeout(() => {
      if (win.isDestroyed()) return;
      log.warn(`Перезагружаю окно после падения рендерера (#${crashReloads})`);
      win.webContents.reload();
    }, 300);
  });

  win.webContents.on("unresponsive", () => {
    log.warn("Окно не отвечает");
    // Если рендерер завис навсегда, перезагружаем его, чтобы не оставлять
    // пользователя с мёртвым окном. Даём 15 секунд на восстановление.
    if (responsiveTimer) clearTimeout(responsiveTimer);
    responsiveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      log.warn("Окно не отвечает 15 секунд — перезагружаю");
      win.webContents.reload();
    }, 15000);
  });

  win.webContents.on("responsive", () => {
    log.info("Окно снова отвечает");
    if (responsiveTimer) {
      clearTimeout(responsiveTimer);
      responsiveTimer = null;
    }
  });

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    log.error(`Не удалось загрузить страницу ${url}: ${code} ${description}`);
  });

  setMainWindow(win);
  win.on("closed", () => require("./helpWindow.cjs").closeHelpWindow());

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  return win;
}

module.exports = { createWindow };
