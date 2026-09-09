// src/main/handlers/fs.cjs
const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const { peopleDir, photosDir } = require("../config.cjs");

ipcMain.handle("fs:ensurePersonFolder", async (_, id) => {
  const base = peopleDir(id);
  await fs.promises.mkdir(photosDir(id), { recursive: true });
});

ipcMain.handle("fs:exists", async (_, relPath) => {
  const full = path.join(app.getPath("userData"), relPath);
  return fs.existsSync(full);
});
