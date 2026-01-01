// const { ipcMain, app, dialog } = require("electron");
// const fs = require("fs");
// const path = require("path");
// const archiver = require("archiver");

// ipcMain.handle("archive:create", async (_, filePaths, archivePath) => {
//   const baseDir = path.dirname(filePaths[0]);

//   await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });

//   const output = fs.createWriteStream(archivePath);
//   const archive = archiver("zip", { zlib: { level: 9 } });

//   archive.pipe(output);

//   // 📦 Подключаем прогресс
//   const totalSize = filePaths.reduce((sum, file) => {
//     try {
//       const stat = fs.statSync(file);
//       return sum + stat.size;
//     } catch {
//       return sum;
//     }
//   }, 0);

//   archive.on("progress", (info) => {
//     const { entries, fs: fileStats } = info;
//     const percent = totalSize
//       ? Math.min(Math.round((fileStats.processedBytes / totalSize) * 100), 100)
//       : 0;
//     const { BrowserWindow } = require("electron");
//     const mainWindow = BrowserWindow.getAllWindows()[0];

//     if (mainWindow) {
//       mainWindow.webContents.send("archive:progress", {
//         percent,
//         files: entries.processed,
//       });
//     }
//   });

//   for (const filePath of filePaths) {
//     const relative = path.relative(baseDir, filePath);
//     archive.file(filePath, { name: relative });
//   }

//   await archive.finalize();

//   return archivePath;
// });

// ipcMain.handle("dialog:chooseSavePath", async (_, defaultName) => {
//   const result = await dialog.showSaveDialog({
//     title: "Сохранить архив",
//     defaultPath: defaultName,
//     filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
//   });
//   return result.canceled ? null : result.filePath;
// });
// handlers/archive.cjs
// handlers/archive.cjs
// handlers/archive.cjs
// Вставь этот блок вместо существующего ipcMain.handle('archive:create', ...)
const { ipcMain, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

function listFilesRecursive(paths) {
  const files = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const stat = fs.statSync(p);
    if (stat.isFile()) files.push(p);
    else if (stat.isDirectory()) {
      const entries = fs.readdirSync(p);
      const childPaths = entries.map((e) => path.join(p, e));
      files.push(...listFilesRecursive(childPaths));
    }
  }
  return files;
}

function getTotalSize(files) {
  let total = 0;
  for (const f of files) {
    try {
      total += fs.statSync(f).size;
    } catch (e) {}
  }
  return total;
}

function safeSend(win, payload) {
  if (!win || !win.webContents) return;
  if (!payload || typeof payload !== "object") return;
  try {
    win.webContents.send("archive:progress", payload);
  } catch (e) {}
}

ipcMain.handle("archive:create", async (_, filePaths, archivePath) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!filePaths || filePaths.length === 0)
    throw new Error("No files to archive");
  if (!archivePath) return null;

  // preparation
  const allFiles = listFilesRecursive(filePaths);
  const totalFiles = allFiles.length;
  const totalBytes = getTotalSize(allFiles);
  safeSend(win, {
    phase: "preparation",
    totalFiles,
    processedFiles: 0,
    totalBytes,
    processedBytes: 0,
    percent: 0,
    message: "Подготовка файлов",
  });

  let prepCount = 0;
  for (const f of allFiles) {
    prepCount++;
    if (prepCount % 10 === 0 || prepCount === totalFiles) {
      safeSend(win, {
        phase: "preparation",
        totalFiles,
        processedFiles: prepCount,
        totalBytes,
        processedBytes: 0,
        percent: Math.round((prepCount / totalFiles) * 100),
        message: `Подготовлено ${prepCount}/${totalFiles}`,
      });
    }
  }

  // writing
  await fs.promises.mkdir(path.dirname(archivePath), { recursive: true });
  const output = fs.createWriteStream(archivePath);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  // build file entries with sizes to compute current file
  const fileEntries = [];
  let cumulative = 0;
  for (const src of allFiles) {
    let size = 0;
    try {
      size = fs.statSync(src).size || 0;
    } catch (e) {
      size = 0;
    }
    const nameInArchive =
      path.relative(path.dirname(filePaths[0]), src) || path.basename(src);
    fileEntries.push({
      path: src,
      name: nameInArchive,
      size,
      start: cumulative,
      end: cumulative + size,
    });
    cumulative += size;
    archive.file(src, { name: nameInArchive });
  }
  const totalBytesComputed = cumulative;

  safeSend(win, {
    phase: "writing",
    totalFiles: fileEntries.length,
    processedFiles: 0,
    totalBytes: totalBytesComputed,
    processedBytes: 0,
    percent: 0,
    currentFile: "",
    filePercent: 0,
    message: "Начало записи",
  });

  archive.on("progress", (info) => {
    const processed = info && info.fs ? info.fs.processedBytes : 0;
    const percent = totalBytesComputed
      ? Math.round((processed / totalBytesComputed) * 100)
      : 0;

    // find current file
    let currentFile = "";
    let filePercent = 0;
    let processedFiles = 0;
    for (let i = 0; i < fileEntries.length; i++) {
      const fe = fileEntries[i];
      if (processed >= fe.end) {
        processedFiles = i + 1;
        continue;
      }
      if (processed >= fe.start && processed < fe.end) {
        currentFile = fe.name;
        const inside = processed - fe.start;
        filePercent = fe.size ? Math.round((inside / fe.size) * 100) : 0;
        processedFiles = i;
        break;
      }
    }
    if (processed >= totalBytesComputed) {
      processedFiles = fileEntries.length;
      currentFile = fileEntries.length
        ? fileEntries[fileEntries.length - 1].name
        : "";
      filePercent = 100;
    }

    safeSend(win, {
      phase: "writing",
      totalFiles: fileEntries.length,
      processedFiles,
      totalBytes: totalBytesComputed,
      processedBytes: processed,
      percent,
      currentFile,
      filePercent,
      message: "Запись архива",
    });
  });

  const finalizePromise = new Promise((resolve, reject) => {
    output.on("close", () => {
      safeSend(win, {
        phase: "writing",
        totalFiles: fileEntries.length,
        processedFiles: fileEntries.length,
        totalBytes: totalBytesComputed,
        processedBytes: totalBytesComputed,
        percent: 100,
        currentFile: fileEntries.length
          ? fileEntries[fileEntries.length - 1].name
          : "",
        filePercent: 100,
        message: "Архив готов",
      });
      resolve();
    });
    archive.on("warning", (err) => console.warn("archiver warning", err));
    archive.on("error", (err) => reject(err));
  });

  await archive.finalize();
  await finalizePromise;
  return archivePath;
});
