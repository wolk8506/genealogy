// src/main/window.cjs
const { BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

// Проверка платформы
const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

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

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  return win;
}

module.exports = { createWindow };
