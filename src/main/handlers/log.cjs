const { ipcMain } = require("electron");
const fs = require("fs");
const { getLogPath } = require("../config.cjs");

ipcMain.handle("log:append", async (event, text) => {
  await fs.promises.appendFile(getLogPath(), text + "\n");
});
