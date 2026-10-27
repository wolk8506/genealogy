const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { getMainWindow } = require("../mainWindow.cjs");

ipcMain.handle("userGuide:read", async () => {
  // dev: корень проекта
  const devPath = path.join(process.cwd(), "USER_GUIDE.md");
  // prod: внутри app.asar
  const prodPath = path.join(
    process.resourcesPath,
    "app.asar",
    "USER_GUIDE.md"
  );

  let filePath;
  if (fs.existsSync(devPath)) {
    filePath = devPath;
  } else {
    filePath = prodPath;
  }

  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    return `Файл USER_GUIDE.md не найден по пути ${filePath}`;
  }
});

ipcMain.handle("userGuide:openWindow", () => {
  require("../helpWindow.cjs").openHelpWindow();
});

ipcMain.handle("userGuide:openChangelog", () => {
  const win = getMainWindow();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
  win.webContents.send("open-changelog-modal");
});
