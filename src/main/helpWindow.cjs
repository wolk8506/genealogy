// src/main/helpWindow.cjs — отдельное окно «Руководство пользователя» в стиле Справки macOS
const { BrowserWindow, nativeTheme, shell } = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";
const DEV_URL = "http://localhost:5173/help.html";

let helpWindow = null;

function stripHash(url) {
  return url.split("#")[0];
}

function createHelpWindow() {
  const platformOptions = isMac
    ? {
        titleBarStyle: "hiddenInset",
        trafficLightPosition: { x: 18, y: 18 },
        vibrancy: "sidebar",
        visualEffectState: "followWindow",
        backgroundColor: "#00000000",
      }
    : {
        autoHideMenuBar: true,
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#1e1e1e" : "#ffffff",
      };

  const win = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 760,
    minHeight: 520,
    title: "Руководство пользователя",
    show: false,
    ...platformOptions,
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    if (helpWindow === win) helpWindow = null;
  });

  // Внешние ссылки из руководства открываем в браузере, а не в окне справки
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (stripHash(url) === stripHash(win.webContents.getURL())) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/help.html"));
  }

  return win;
}

function openHelpWindow() {
  if (helpWindow && !helpWindow.isDestroyed()) {
    if (helpWindow.isMinimized()) helpWindow.restore();
    helpWindow.show();
    helpWindow.focus();
    return helpWindow;
  }
  helpWindow = createHelpWindow();
  return helpWindow;
}

function closeHelpWindow() {
  if (helpWindow && !helpWindow.isDestroyed()) helpWindow.close();
}

module.exports = { openHelpWindow, closeHelpWindow };
