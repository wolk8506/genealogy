// 🧩 Информация о приложении

const { ipcMain, app, shell } = require("electron");
const path = require("path");
const fs = require("fs");

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);

ipcMain.handle("app:getBuildDate", () => {
  const buildTime = fs.statSync(path.join(__dirname, "main.cjs")).mtime;
  return buildTime.toISOString().split("T")[0]; // YYYY-MM-DD
});

ipcMain.handle("app:openDataFolder", async () => {
  const dataPath = path.join(app.getPath("documents"), "Genealogy");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  await shell.openPath(dataPath);
});

ipcMain.handle("app:get-folder-size", async () => {
  const folderPath = path.join(app.getPath("documents"), "Genealogy");

  function getSize(dir) {
    let total = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        total += getSize(fullPath);
      } else {
        total += stats.size;
      }
    }
    return total;
  }

  try {
    const size = getSize(folderPath);
    return (size / (1024 * 1024)).toFixed(2); // MB
  } catch (err) {
    console.error("Ошибка при подсчёте размера папки:", err);
    return null;
  }
});
