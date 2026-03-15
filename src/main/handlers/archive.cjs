const { ipcMain, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

// function listFilesRecursive(paths) {
//   const files = [];
//   for (const p of paths) {
//     if (!fs.existsSync(p)) continue;
//     const stat = fs.statSync(p);
//     if (stat.isFile()) files.push(p);
//     else if (stat.isDirectory()) {
//       const entries = fs.readdirSync(p);
//       const childPaths = entries.map((e) => path.join(p, e));
//       files.push(...listFilesRecursive(childPaths));
//     }
//   }
//   return files;
// }
function listFilesRecursive(paths) {
  const files = [];

  // Список имен файлов/папок, которые мы игнорируем ВСЕГДА
  const blacklist = [".DS_Store", "thumbs", "webp"];

  for (const p of paths) {
    if (!fs.existsSync(p)) continue;

    const basename = path.basename(p);
    if (blacklist.includes(basename)) continue; // Пропускаем кэш и системный мусор

    const stat = fs.statSync(p);
    if (stat.isFile()) {
      files.push(p);
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(p);

      // Логика: если мы внутри папки photos, берем ТОЛЬКО папку original
      if (basename === "photos") {
        const hasOriginal = entries.includes("original");
        if (hasOriginal) {
          // Рекурсивно заходим только в photos/original
          files.push(...listFilesRecursive([path.join(p, "original")]));
        }
        // Папки webp и thumbs будут проигнорированы, так как их нет в условии
        continue;
      }

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
    phase: "writing2",
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
      phase: "writing2",
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
        phase: "writing2",
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
