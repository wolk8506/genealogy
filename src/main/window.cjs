// src/main/window.cjs
const { BrowserWindow } = require("electron");
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 1430,
    height: 700,
    minWidth: 1430, // минимальная ширина
    minHeight: 700, // минимальная высота
    resizable: true, // окно остаётся изменяемым, но не меньше min*
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      //   webSecurity: false, // ← подумать о безопасной замене
      webSecurity: !isDev, // ✅ true в продакшене, false только в dev
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  return win;
}

module.exports = { createWindow };
