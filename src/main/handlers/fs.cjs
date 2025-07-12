// src/main/handlers/fs.cjs
const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");

ipcMain.handle("fs:ensurePersonFolder", async (_, id) => {
  const base = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(id)
  );
  await fs.promises.mkdir(path.join(base, "photos"), { recursive: true });
});

ipcMain.handle("fs:exists", async (_, relPath) => {
  const full = path.join(app.getPath("userData"), relPath);
  return fs.existsSync(full);
});
