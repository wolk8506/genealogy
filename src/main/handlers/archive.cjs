const { ipcMain, app, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

ipcMain.handle("archive:create", async (_, filePaths, archivePath) => {
  const baseDir = path.dirname(filePaths[0]);

  await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });

  const output = fs.createWriteStream(archivePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);

  // 📦 Подключаем прогресс
  const totalSize = filePaths.reduce((sum, file) => {
    try {
      const stat = fs.statSync(file);
      return sum + stat.size;
    } catch {
      return sum;
    }
  }, 0);

  archive.on("progress", (info) => {
    const { entries, fs: fileStats } = info;
    const percent = totalSize
      ? Math.min(Math.round((fileStats.processedBytes / totalSize) * 100), 100)
      : 0;
    const { BrowserWindow } = require("electron");
    const mainWindow = BrowserWindow.getAllWindows()[0];

    if (mainWindow) {
      mainWindow.webContents.send("archive:progress", {
        percent,
        files: entries.processed,
      });
    }
  });

  for (const filePath of filePaths) {
    const relative = path.relative(baseDir, filePath);
    archive.file(filePath, { name: relative });
  }

  await archive.finalize();

  return archivePath;
});

ipcMain.handle("dialog:chooseSavePath", async (_, defaultName) => {
  const result = await dialog.showSaveDialog({
    title: "Сохранить архив",
    defaultPath: defaultName,
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  return result.canceled ? null : result.filePath;
});
