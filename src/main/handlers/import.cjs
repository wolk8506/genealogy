// handlers/import.cjs
const { ipcMain } = require("electron");
const { getMainWindow } = require("../mainWindow.cjs");
const { inspectArchive } = require("./importArchiveInspect.cjs");
const { importZipFromPath } = require("./importZipApply.cjs");

ipcMain.handle("import:inspect", async (_, zipPath) => {
  if (!zipPath) throw new Error("Путь к ZIP-бэкапу не передан");
  return inspectArchive(zipPath);
});

ipcMain.handle("import:zip", async (event, zipPath, options = {}) => {
  const win = getMainWindow();
  if (!zipPath) throw new Error("Путь к ZIP-бэкапу не передан");

  const hooks = {
    onProgress: (data) => {
      if (win?.webContents) win.webContents.send("import:progress", data);
    },
  };

  if (win) {
    hooks.confirmConflicts = ({ conflicts, toAdd, toUpdate }) =>
      new Promise((resolve) => {
        win.webContents.send("import:confirm", { conflicts, toAdd, toUpdate });
        const timeout = setTimeout(() => resolve({ action: "all" }), 300000);
        ipcMain.once("import:confirm-response", (evt, resp) => {
          clearTimeout(timeout);
          resolve(resp || { action: "all" });
        });
      });
  }

  return importZipFromPath(zipPath, options, hooks);
});
