const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");

const logFile = path.join(
  app.getPath("documents"),
  "Genealogy",
  "import-log.txt"
);

ipcMain.handle("log:append", async (event, text) => {
  await fs.promises.appendFile(logFile, text + "\n");
});
