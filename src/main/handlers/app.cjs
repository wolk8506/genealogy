// 🧩 Информация о приложении

const { ipcMain, app, shell, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
// const checkDiskSpace = require("check-disk-space").default;

function getUserPaths(personId) {
  const userDataPath = app.getPath("userData"); // или твой путь к документам
  const baseDir = path.join(userDataPath, "storage", String(personId));

  return {
    original: path.join(baseDir, "original"),
    webp: path.join(baseDir, "webp"),
    thumbs: path.join(baseDir, "thumbs"),
    meta: path.join(baseDir, "photos.json"), // путь к файлу метаданных
  };
}

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("app:getPlatform", () => {
  // 1. Названия ОС
  const platformNames = {
    darwin: "macOS",
    win32: "Windows",
    linux: "Linux",
  };
  const platform = platformNames[process.platform] || process.platform;

  // 2. Архитектура и Процессор
  const arch = process.arch === "arm64" ? "ARM" : "x64";
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : "Unknown CPU";

  // 3. Оперативная память (RAM)
  // totalmem() возвращает байты. Делим на 1024^3, чтобы получить ГБ.
  const totalRamGb = Math.round(os.totalmem() / 1024 ** 3);

  // Собираем всё вместе
  // Пример: "macOS (ARM) — Apple M2 (16 GB RAM)"
  // Пример: "Windows (x64) — Intel Core i7-13700H (32 GB RAM)"
  return `${platform} (${arch}) — ${cpuModel} [${totalRamGb} GB RAM]`;
});
ipcMain.handle("app:getSysVersions", () => {
  return process.versions;
});

ipcMain.handle("get-disk-usage", async () => {
  return new Promise((resolve) => {
    if (process.platform === "darwin") {
      // macOS: используем df -m (результат в мегабайтах)
      // /System/Volumes/Data — это место, где лежат твои файлы
      exec("df -m /System/Volumes/Data", (err, stdout) => {
        if (err) return resolve({ total: 0, free: 0 });

        const lines = stdout.trim().split("\n");
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          // parts[1] - всего, parts[3] - доступно
          resolve({
            total: parseInt(parts[1]),
            free: parseInt(parts[3]),
          });
        } else {
          resolve({ total: 0, free: 0 });
        }
      });
    } else if (process.platform === "win32") {
      // Windows: PowerShell возвращает точный объект
      const psCommand =
        'Powershell "Get-PSDrive C | Select-Object Size,Free | ConvertTo-Json"';
      exec(psCommand, (err, stdout) => {
        try {
          const data = JSON.parse(stdout);
          resolve({
            total: Math.round(data.Size / (1024 * 1024)),
            free: Math.round(data.Free / (1024 * 1024)),
          });
        } catch (e) {
          resolve({ total: 0, free: 0 });
        }
      });
    } else {
      resolve({ total: 0, free: 0 });
    }
  });
});

ipcMain.handle("app:getBuildDate", () => {
  try {
    // В разработке (dev) берем дату из package.json или текущую
    if (!app.isPackaged) {
      return new Date().toISOString().split("T")[0];
    }

    // В продакшене (prod) берем дату изменения самого файла приложения
    const exePath = process.execPath;
    const stats = fs.statSync(exePath);
    return stats.mtime.toISOString().split("T")[0];
  } catch (error) {
    console.error("Ошибка при получении даты сборки:", error);
    return "неизвестно";
  }
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

ipcMain.handle("window:setFullscreen", (event, enable) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.setFullScreen(enable);
});

ipcMain.handle("window:isFullscreen", () => {
  const win = BrowserWindow.getFocusedWindow();
  return win ? win.isFullScreen() : false;
});

ipcMain.handle("path:getTempDir", () => {
  return path.join(app.getPath("documents"), "Genealogy", "temp");
});

ipcMain.on("app:quit", () => {
  app.quit();
});

ipcMain.handle("get-detailed-storage-stats", async () => {
  const basePath = path.join(app.getPath("documents"), "Genealogy");
  const peoplePath = path.join(basePath, "people");

  const stats = {
    original: 0,
    webp: 0,
    thumbs: 0,
    db: 0,
    bio: 0,
    path: basePath,
  };

  // Функция для безопасного получения размера файла
  const getFileSize = (filePath) => {
    try {
      return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    } catch {
      return 0;
    }
  };

  // 1. Считаем глобальную БД (файлы в корне)
  const rootFiles = fs.readdirSync(basePath);
  rootFiles.forEach((file) => {
    if (file.endsWith(".json")) {
      stats.db += getFileSize(path.join(basePath, file));
    }
  });

  // 2. Считаем данные по каждому человеку
  if (fs.existsSync(peoplePath)) {
    const personFolders = fs.readdirSync(peoplePath);

    for (const pId of personFolders) {
      const pFolder = path.join(peoplePath, pId);
      if (!fs.statSync(pFolder).isDirectory()) continue;

      // --- БД внутри папки человека (json файлы с данными о фото и т.д.) ---
      const pFiles = fs.readdirSync(pFolder);
      pFiles.forEach((file) => {
        if (file.endsWith(".json")) {
          stats.db += getFileSize(path.join(pFolder, file));
        }
        // --- BIO: файлы bio.md и фото в корне человека (временное решение) ---
        // Если файл .md или это фото (но не из папки photos)
        if (file === "bio.md") {
          stats.bio += getFileSize(path.join(pFolder, file));
        }
      });

      // --- BIO: Папка bio (задел на будущее) ---
      const bioDirPath = path.join(pFolder, "bio_images");
      if (fs.existsSync(bioDirPath)) {
        const bioFiles = fs.readdirSync(bioDirPath);
        bioFiles.forEach(
          (f) => (stats.bio += getFileSize(path.join(bioDirPath, f))),
        );
      }

      // --- ФОТО: оригиналы, сжатые, превью ---
      const photosPath = path.join(pFolder, "photos");
      if (fs.existsSync(photosPath)) {
        const scanDir = (sub, target) => {
          const dir = path.join(photosPath, sub);
          if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(
              (f) => (stats[target] += getFileSize(path.join(dir, f))),
            );
          }
        };
        scanDir("original", "original");
        scanDir("webp", "webp");
        scanDir("thumbs", "thumbs");
      }
    }
  }

  return stats;
});

ipcMain.handle("app:getPersonFolderSize", async (event, personId) => {
  const cleanId = String(personId).trim();
  const rootPath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    cleanId,
  );
  const jsonPath = path.join(rootPath, "photos.json");
  const bioPath = path.join(rootPath, `bio.md`); // Путь к файлу биографии

  let totalSize = 0;
  let photoCount = 0;
  let hasBio = false;

  try {
    // 1. Проверка биографии
    if (fs.existsSync(bioPath)) {
      const stats = fs.statSync(bioPath);
      // Считаем, что биография есть, если файл существует и весит больше 10 байт (не пустой)
      if (stats.isFile() && stats.size > 10) {
        hasBio = true;
      }
    }

    // 2. Считаем количество фото из JSON
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, "utf8");
      try {
        const data = JSON.parse(content);
        photoCount = Array.isArray(data) ? data.length : 0;
      } catch (e) {
        console.error(`Ошибка парсинга JSON для ID ${cleanId}:`, e);
      }
    }

    // 3. Подсчет физического размера папки
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) walk(fullPath);
        else totalSize += fs.statSync(fullPath).size;
      }
    }
    walk(rootPath);

    return {
      size: (totalSize / (1024 * 1024)).toFixed(2),
      count: photoCount,
      hasBio: hasBio, // Добавляем новый флаг
    };
  } catch (err) {
    console.error(`Ошибка папки ID ${cleanId}:`, err);
    return { size: "0.00", count: 0, hasBio: false };
  }
});

// ipcMain.handle("app:getPersonFolderSize", async (event, personId) => {
//   const cleanId = String(personId).trim();
//   const rootPath = path.join(
//     app.getPath("documents"),
//     "Genealogy",
//     "people",
//     cleanId,
//   );
//   const jsonPath = path.join(rootPath, "photos.json");

//   let totalSize = 0;
//   let photoCount = 0;

//   try {
//     // 1. Считаем количество записей из JSON (База данных)
//     if (fs.existsSync(jsonPath)) {
//       const content = fs.readFileSync(jsonPath, "utf8");
//       try {
//         const data = JSON.parse(content);
//         // Если в файле массив объектов, берем его длину
//         photoCount = Array.isArray(data) ? data.length : 0;
//       } catch (e) {
//         console.error(`Ошибка парсинга JSON для ID ${cleanId}:`, e);
//       }
//     }

//     // 2. Рекурсивная функция для подсчета физического размера (МБ)
//     function walk(dir) {
//       if (!fs.existsSync(dir)) return;
//       const files = fs.readdirSync(dir, { withFileTypes: true });

//       for (const file of files) {
//         const fullPath = path.join(dir, file.name);
//         if (file.isDirectory()) {
//           walk(fullPath);
//         } else {
//           const stats = fs.statSync(fullPath);
//           totalSize += stats.size;
//           // Больше не инкрементируем photoCount здесь,
//           // так как мы уже взяли точное число из JSON выше
//         }
//       }
//     }

//     walk(rootPath);

//     return {
//       size: (totalSize / (1024 * 1024)).toFixed(2), // Физический вес всей папки
//       count: photoCount, // Количество "законных" фото из базы
//     };
//   } catch (err) {
//     console.error(`Ошибка при обработке папки ID ${cleanId}:`, err);
//     return { size: "0.00", count: 0 };
//   }
// });

// *  Очистка папки `Genealogy` от данных
ipcMain.handle("app:full-reset", async () => {
  // Путь к вашей папке данных (обычно в Documents/Genealogy)
  const userDataPath = path.join(app.getPath("documents"), "Genealogy");

  try {
    if (fs.existsSync(userDataPath)) {
      const files = await fs.promises.readdir(userDataPath);

      for (const file of files) {
        const curPath = path.join(userDataPath, file);
        // Рекурсивно удаляем всё содержимое (файлы и папки)
        await fs.promises.rm(curPath, { recursive: true, force: true });
      }
    }
    return true;
  } catch (error) {
    console.error("Ошибка при полной очистке:", error);
    throw error;
  }
});
