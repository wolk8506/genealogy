//file.cjs
const { app, ipcMain, shell, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const { getBaseDir } = require("../config.cjs");
const log = require("../logger.cjs").createLogger("file");
const {
  readPhotosMeta,
  updatePhotosMeta,
} = require("./photosMetaStore.cjs");
const { withWriteLock, writeBufferAtomic } = require("./jsonStore.cjs");

const FILE_EXT_TYPES = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".gif": "image",
  ".webp": "image",
  ".mp4": "video",
  ".webm": "video",
  ".mp3": "audio",
  ".wav": "audio",
  ".m4a": "audio",
  ".ogg": "audio",
  ".aac": "audio",
  ".txt": "doc",
  ".pdf": "doc",
};

function detectFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return FILE_EXT_TYPES[ext] || "unknown";
}

function sanitizeFileName(name) {
  return path.basename(String(name || "").replace(/[\\/]/g, "_")).trim();
}

function uniqueFileName(dir, fileName) {
  const safeName = sanitizeFileName(fileName);
  if (!safeName) throw new Error("Некорректное имя файла");
  const fullPath = path.join(dir, safeName);
  if (!fs.existsSync(fullPath)) return safeName;

  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let index = 1;
  while (index < 10000) {
    const candidate = `${base}_${String(index).padStart(3, "0")}${ext}`;
    if (!fs.existsSync(path.join(dir, candidate))) return candidate;
    index += 1;
  }
  throw new Error("Не удалось подобрать уникальное имя файла");
}

function updateGlobalHashtagsFromPhoto(photo) {
  // Из массива hashtags
  if (Array.isArray(photo.hashtags)) {
    photo.hashtags.forEach((tag) => {
      const clean = tag.trim().toLowerCase();
      if (clean) globalHashtags.add(clean);
    });
  }
  // Из строки описания (парсим #теги)
  if (photo.description) {
    const matches = photo.description.match(/#[\p{L}\d_]+/gu);
    if (matches) {
      matches.forEach((tag) => globalHashtags.add(tag.toLowerCase()));
    }
  }
}

ipcMain.handle("file:writeText", async (_, targetPath, text) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(targetPath, text, "utf-8");
});

ipcMain.handle("file:writeBlob", async (_, targetPath, arrayBuffer) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(targetPath, buffer);
});

// ipcMain.handle("file:copyFile", async (_, source, destination) => {
//   await fs.promises.mkdir(path.dirname(destination), { recursive: true });
//   await fs.promises.copyFile(source, destination);
// });
ipcMain.handle("file:copyFile", async (_, source, destination) => {
  try {
    // Проверка на существование файла перед копированием
    if (!fs.existsSync(source)) {
      return { success: false, reason: "NOT_FOUND" };
    }

    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    await fs.promises.copyFile(source, destination);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("file:ensureDir", async (_, dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
});

ipcMain.handle("file:delete", async (_, targetPath) => {
  const fs = require("fs").promises;
  const { rm } = require("fs/promises");
  await rm(targetPath, { recursive: true, force: true });
});

ipcMain.handle("file:write-buffer", async (_, filePath, buffer) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(buffer));
  } catch (err) {
    log.error("💥 Ошибка записи:", err);
    throw err;
  }
});

// --- Определяем PEOPLE_BASE кросс-платформенно ---
// 1) сначала смотрим переменную окружения (удобно для CI / разных ПК)
// 2) затем используем активный корень данных из config.cjs (переключаемый)
function getPeopleBase() {
  // 1) env override
  if (process.env.GENEALOGY_PEOPLE_DIR) {
    return path.resolve(process.env.GENEALOGY_PEOPLE_DIR);
  }

  // 2) активный корень данных
  return path.join(getBaseDir(), "people");
}

log.info("[main] PEOPLE_BASE =", getPeopleBase());

// --- Утилиты ---
async function readJsonSafe(filePath) {
  try {
    const txt = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function writeJsonAtomic(filePath, obj) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
  try {
    await fs.promises.rename(tmp, filePath);
  } catch (err) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw err;
  }
}

// -- file:renameFile - переименовать файл в папке owner
ipcMain.handle(
  "file:renameFile",
  async (_, ownerId, oldFilename, newFilename) => {
    try {
      const baseDir = path.join(getPeopleBase(), String(ownerId), "photos");
      const oldWebpName = oldFilename.replace(/\.[^.]+$/, ".webp");
      const newWebpName = newFilename.replace(/\.[^.]+$/, ".webp");

      // Список всех подпапок, где может лежать файл и его производные
      const subDirs = [
        { dir: "original", old: oldFilename, new: newFilename },
        { dir: "webp", old: oldWebpName, new: newWebpName },
        { dir: "thumbs", old: oldWebpName, new: newWebpName },
        { dir: "", old: oldFilename, new: newFilename }, // legacy (корень photos)
      ];

      let renamedSomething = false;

      for (const item of subDirs) {
        const src = path.join(baseDir, item.dir, item.old);
        const dst = path.join(baseDir, item.dir, item.new);

        try {
          await fs.promises.access(src); // Проверяем наличие
          await fs.promises.mkdir(path.dirname(dst), { recursive: true });
          await fs.promises.rename(src, dst);
          renamedSomething = true;
        } catch (e) {
          // Если файла нет в конкретной подпапке — просто идем дальше
        }
      }

      if (!renamedSomething) {
        throw new Error(`Файл ${oldFilename} не найден ни в одной из папок.`);
      }

      return path.join(baseDir, "original", newFilename); // Возвращаем путь к оригиналу как основной
    } catch (err) {
      log.error("[file:renameFile] failed:", err);
      throw err;
    }
  },
);

// --- file:moveFile ---
// Перемещаем фото между папками владельцев, ищем исходник в нескольких местах
ipcMain.handle(
  "file:moveFile",
  async (_, oldOwnerId, newOwnerId, oldFilename, newFilename) => {
    try {
      const oldBaseDir = path.join(getPeopleBase(), String(oldOwnerId), "photos");
      const newBaseDir = path.join(getPeopleBase(), String(newOwnerId), "photos");

      const targetName = newFilename || oldFilename;
      const oldWebp = oldFilename.replace(/\.[^.]+$/, ".webp");
      const newWebp = targetName.replace(/\.[^.]+$/, ".webp");

      // Определяем соответствие (подпапка -> старое имя -> новое имя)
      const moveTasks = [
        { sub: "original", old: oldFilename, new: targetName },
        { sub: "webp", old: oldWebp, new: newWebp },
        { sub: "thumbs", old: oldWebp, new: newWebp },
        { sub: "", old: oldFilename, new: targetName }, // для старых файлов в корне
      ];

      let movedAny = false;

      for (const task of moveTasks) {
        const src = path.join(oldBaseDir, task.sub, task.old);
        const dstDir = path.join(newBaseDir, task.sub);
        const dst = path.join(dstDir, task.new);

        if (fs.existsSync(src)) {
          await fs.promises.mkdir(dstDir, { recursive: true });
          await fs.promises.copyFile(src, dst);
          await fs.promises.rm(src, { force: true });
          movedAny = true;
        }
      }

      if (!movedAny) {
        throw new Error(
          `Ни один файл не найден для перемещения. Искали: ${oldFilename}`,
        );
      }

      // Возвращаем путь к новому оригиналу (или корню, если оригинала нет)
      const finalPath = fs.existsSync(
        path.join(newBaseDir, "original", targetName),
      )
        ? path.join(newBaseDir, "original", targetName)
        : path.join(newBaseDir, targetName);

      return finalPath;
    } catch (err) {
      log.error("[file:moveFile] failed:", err);
      throw err;
    }
  },
);

// --- photo:removeFromOwnerJson ---
ipcMain.handle(
  "photo:removeFromOwnerJson",
  async (_, ownerId, { filename, id } = {}) => {
    try {
      const arr = await readPhotosMeta(ownerId);
      const beforeLen = arr.length;
      const filtered = arr.filter((p) => {
        if (id != null && p.id != null) return String(p.id) !== String(id);
        if (filename) return String(p.filename) !== String(filename);
        return true;
      });
      if (filtered.length === beforeLen) {
        return { ok: true, removed: 0, message: "No matching entry found" };
      }
      await updatePhotosMeta(ownerId, () => filtered);
      return { ok: true, removed: beforeLen - filtered.length };
    } catch (err) {
      log.error("[photo:removeFromOwnerJson] failed:", err);
      throw err;
    }
  },
);

// --- photo:addOrUpdateOwnerJson ---
ipcMain.handle("photo:addOrUpdateOwnerJson", async (_, ownerId, photoObj) => {
  try {
    if (!photoObj || (!photoObj.filename && !photoObj.id)) {
      throw new Error("photoObj must contain filename or id");
    }

    const next = await updatePhotosMeta(ownerId, (arr) => {
      const idx = arr.findIndex((p) => {
        if (photoObj.id != null && p.id != null)
          return String(p.id) === String(photoObj.id);
        return String(p.filename) === String(photoObj.filename);
      });

      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...photoObj, owner: ownerId };
      } else {
        arr.push({ ...photoObj, owner: ownerId });
      }
      return arr;
    });

    if (global.globalHashtags) {
      const matches = photoObj.description?.match(/#[\p{L}\d_]+/gu);
      matches?.forEach((tag) => global.globalHashtags.add(tag.toLowerCase()));
    }

    return { ok: true, count: next.length };
  } catch (err) {
    log.error("[photo:addOrUpdateOwnerJson] failed:", err);
    throw err;
  }
});

// --- ДОБАВЛЕНИЕ ФАЙЛОВ И ПРОСМОТР НА СТРАНИЦУ ФАЙЛЫ
// Укажите базовый путь, где хранятся данные вашей программы
// const getPeopleBase = () => path.join(__dirname, "your_data_folder"); // Измените на вашу директорию

ipcMain.handle(
  "upload-person-file",
  async (event, personId, fileName, fileBuffer, category) => {
    try {
      const personFilesDir = path.join(getPeopleBase(), String(personId), "files");
      await fs.promises.mkdir(personFilesDir, { recursive: true });

      const savedName = await withWriteLock(async () => {
        const uniqueName = uniqueFileName(personFilesDir, fileName);
        const filePath = path.join(personFilesDir, uniqueName);
        await writeBufferAtomic(filePath, Buffer.from(fileBuffer));
        return uniqueName;
      });

      return { success: true, fileName: savedName, type: category || detectFileType(savedName) };
    } catch (error) {
      log.error("Ошибка сохранения файла:", error);
      throw error;
    }
  },
);

ipcMain.handle("get-person-files", async (event, personId) => {
  try {
    const personFilesDir = path.join(getPeopleBase(), String(personId), "files");

    if (!fs.existsSync(personFilesDir)) {
      return [];
    }

    const files = await fs.promises.readdir(personFilesDir);
    const items = [];

    for (const file of files) {
      const fullPath = path.join(personFilesDir, file);
      const stat = await fs.promises.stat(fullPath);
      if (!stat.isFile()) continue;

      items.push({
        name: file,
        path: `file://${fullPath}`,
        localPath: fullPath,
        type: detectFileType(file),
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }

    return items.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
  } catch (error) {
    log.error("Ошибка чтения файлов:", error);
    throw error;
  }
});

ipcMain.handle("delete-person-file", async (event, personId, fileName) => {
  try {
    const safeName = sanitizeFileName(fileName);
    const filePath = path.join(getPeopleBase(), String(personId), "files", safeName);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return { success: true };
    }
    return { success: false, error: "Файл не найден" };
  } catch (error) {
    log.error("Ошибка при удалении файла:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("rename-person-file", async (event, personId, oldName, newName) => {
  try {
    const dir = path.join(getPeopleBase(), String(personId), "files");
    const safeOld = sanitizeFileName(oldName);
    const from = path.join(dir, safeOld);
    if (!fs.existsSync(from)) return { success: false, error: "Файл не найден" };

    let requested = sanitizeFileName(newName);
    if (!requested) return { success: false, error: "Некорректное имя" };

    const ext = path.extname(from).toLowerCase();
    const nextExt = path.extname(requested).toLowerCase();
    if (!nextExt || nextExt !== ext) {
      requested = `${path.basename(requested, nextExt || undefined)}${ext}`;
    }

    if (requested === safeOld) {
      return { success: true, fileName: requested };
    }

    const targetPath = path.join(dir, requested);
    const finalName = fs.existsSync(targetPath)
      ? uniqueFileName(dir, requested)
      : requested;

    await fs.promises.rename(from, path.join(dir, finalName));
    return { success: true, fileName: finalName };
  } catch (error) {
    log.error("rename-person-file failed:", error);
    return { success: false, error: error.message };
  }
});

const pdfPreviewWindows = new Map();

function closeAllPdfPreviewWindows() {
  for (const [key, win] of pdfPreviewWindows.entries()) {
    if (win && !win.isDestroyed()) win.destroy();
    pdfPreviewWindows.delete(key);
  }
}

function bindPdfWindowsToParent(parentWin) {
  if (!parentWin || parentWin.isDestroyed() || parentWin.__pdfPreviewBound) return;
  parentWin.__pdfPreviewBound = true;
  parentWin.on("close", closeAllPdfPreviewWindows);
}

app.on("before-quit", closeAllPdfPreviewWindows);

ipcMain.handle("open-person-pdf-window", async (event, { filePath, title }) => {
  try {
    const normalized = path.resolve(String(filePath || ""));
    if (!normalized || !fs.existsSync(normalized)) {
      return { success: false, error: "Файл не найден" };
    }

    const parentWin = BrowserWindow.fromWebContents(event.sender);
    bindPdfWindowsToParent(parentWin);

    const existing = pdfPreviewWindows.get(normalized);
    if (existing && !existing.isDestroyed()) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
      return { success: true };
    }

    const win = new BrowserWindow({
      width: 1100,
      height: 820,
      minWidth: 640,
      minHeight: 480,
      title: title || path.basename(normalized),
      backgroundColor: "#525659",
      autoHideMenuBar: true,
      parent: parentWin || undefined,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: process.env.NODE_ENV !== "development",
      },
    });

    pdfPreviewWindows.set(normalized, win);
    win.on("closed", () => pdfPreviewWindows.delete(normalized));

    await win.loadFile(normalized);
    return { success: true };
  } catch (error) {
    log.error("open-person-pdf-window failed:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("open-person-files-folder", async (event, personId) => {
  try {
    const dir = path.join(getPeopleBase(), String(personId), "files");
    await fs.promises.mkdir(dir, { recursive: true });
    await shell.openPath(dir);
    return true;
  } catch (error) {
    log.error("open-person-files-folder failed:", error);
    return false;
  }
});
