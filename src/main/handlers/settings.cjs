const { ipcMain, nativeTheme } = require("electron");

module.exports = (store) => {
  const { ipcMain } = require("electron");

  ipcMain.handle("settings:get", (_, key) => store.get(key));
  ipcMain.handle("settings:set", (_, key, value) => store.set(key, value));
};

ipcMain.handle("get-system-theme", () => {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

nativeTheme.on("updated", () => {
  const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("theme-updated", theme);
  });
});
