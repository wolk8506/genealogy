//file.cjs
const { app, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

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
    console.error("💥 Ошибка записи:", err);
    throw err;
  }
});

// --- Определяем PEOPLE_BASE кросс-платформенно ---
// 1) сначала смотрим переменную окружения (удобно для CI / разных ПК)
// 2) затем используем Documents/Genealogy/people (удобно для пользователя)
// 3) как запасной вариант — app.getPath('userData')/people
function resolvePeopleBase() {
  // 1) env override
  if (process.env.GENEALOGY_PEOPLE_DIR) {
    return path.resolve(process.env.GENEALOGY_PEOPLE_DIR);
  }

  // 2) Documents/Genealogy/people
  try {
    const docs = app.getPath("documents"); // кросс-платформенно
    return path.join(docs, "Genealogy", "people");
  } catch (err) {
    // 3) fallback to userData
    const ud = app.getPath("userData");
    return path.join(ud, "Genealogy", "people");
  }
}

const PEOPLE_BASE = resolvePeopleBase();
console.log("[main] PEOPLE_BASE =", PEOPLE_BASE);

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
  const tmp = filePath + ".tmp";
  await fs.promises.writeFile(tmp, JSON.stringify(obj, null, 2), "utf-8");
  await fs.promises.rename(tmp, filePath);
}

// -- file:renameFile - переименовать файл в папке owner
ipcMain.handle(
  "file:renameFile",
  async (_, ownerId, oldFilename, newFilename) => {
    try {
      const baseDir = path.join(PEOPLE_BASE, String(ownerId), "photos");
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
      console.error("[file:renameFile] failed:", err);
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
      const oldBaseDir = path.join(PEOPLE_BASE, String(oldOwnerId), "photos");
      const newBaseDir = path.join(PEOPLE_BASE, String(newOwnerId), "photos");

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
      console.error("[file:moveFile] failed:", err);
      throw err;
    }
  },
);

// --- photo:removeFromOwnerJson ---
ipcMain.handle(
  "photo:removeFromOwnerJson",
  async (_, ownerId, { filename, id } = {}) => {
    try {
      const jsonPath = path.join(PEOPLE_BASE, String(ownerId), "photos.json");
      const arr = (await readJsonSafe(jsonPath)) || [];
      const beforeLen = arr.length;
      const filtered = arr.filter((p) => {
        if (id != null && p.id != null) return String(p.id) !== String(id);
        if (filename) return String(p.filename) !== String(filename);
        return true;
      });
      if (filtered.length === beforeLen) {
        return { ok: true, removed: 0, message: "No matching entry found" };
      }
      await writeJsonAtomic(jsonPath, filtered);
      return { ok: true, removed: beforeLen - filtered.length };
    } catch (err) {
      console.error("[photo:removeFromOwnerJson] failed:", err);
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
    const jsonPath = path.join(PEOPLE_BASE, String(ownerId), "photos.json");
    const arr = (await readJsonSafe(jsonPath)) || [];

    const idx = arr.findIndex((p) => {
      if (photoObj.id != null && p.id != null)
        return String(p.id) === String(photoObj.id);
      return String(p.filename) === String(photoObj.filename);
    });

    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...photoObj, owner: ownerId };
    } else {
      const toAdd = { ...photoObj, owner: ownerId };
      arr.push(toAdd);
    }

    await writeJsonAtomic(jsonPath, arr);

    // --- ВОТ ТУТ ОБНОВЛЯЕМ ТЕГИ В ПАМЯТИ ---
    if (global.globalHashtags) {
      // Логика парсинга тегов из photoObj прямо тут или через функцию
      const matches = photoObj.description?.match(/#[\p{L}\d_]+/gu);
      matches?.forEach((tag) => global.globalHashtags.add(tag.toLowerCase()));
    }

    return { ok: true, count: arr.length };
  } catch (err) {
    console.error("[photo:addOrUpdateOwnerJson] failed:", err);
    throw err;
  }
});

// --- ДОБАВЛЕНИЕ ФАЙЛОВ И ПРОСМОТР НА СТРАНИЦУ ФАЙЛЫ
// Укажите базовый путь, где хранятся данные вашей программы
// const PEOPLE_BASE = path.join(__dirname, "your_data_folder"); // Измените на вашу директорию

ipcMain.handle(
  "upload-person-file",
  async (event, personId, fileName, fileBuffer, category) => {
    try {
      // Формируем путь: /your_data_folder/persons/{personId}/files
      const personFilesDir = path.join(PEOPLE_BASE, String(personId), "files");

      // Создаем папку, если её нет
      if (!fs.existsSync(personFilesDir)) {
        fs.mkdirSync(personFilesDir, { recursive: true });
      }

      // Сохраняем файл (переводим ArrayBuffer в Buffer для NodeJS)
      const filePath = path.join(personFilesDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(fileBuffer));

      return true;
    } catch (error) {
      console.error("Ошибка сохранения файла:", error);
      throw error;
    }
  },
);

ipcMain.handle("get-person-files", async (event, personId) => {
  try {
    const personFilesDir = path.join(PEOPLE_BASE, String(personId), "files");

    if (!fs.existsSync(personFilesDir)) {
      return []; // Если папки нет, значит файлов нет
    }

    const files = fs.readdirSync(personFilesDir);

    // Возвращаем массив с путями и типами
    return files.map((file) => {
      const ext = path.extname(file).toLowerCase();
      let type = "unknown";
      if ([".jpg", ".jpeg"].includes(ext)) type = "image";
      if ([".mp4"].includes(ext)) type = "video";
      if ([".mp3"].includes(ext)) type = "audio";
      if ([".txt", ".pdf"].includes(ext)) type = "doc";

      return {
        name: file,
        // Обязательно добавляем file:// чтобы браузер Chromium внутри Electron мог его открыть
        path: `file://${path.join(personFilesDir, file)}`,
        type: type,
      };
    });
  } catch (error) {
    console.error("Ошибка чтения файлов:", error);
    throw error;
  }
});

ipcMain.handle("delete-person-file", async (event, personId, fileName) => {
  try {
    const filePath = path.join(
      PEOPLE_BASE,
      String(personId),
      "files",
      fileName,
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Удаляем файл
      return { success: true };
    }
    return { success: false, error: "Файл не найден" };
  } catch (error) {
    console.error("Ошибка при удалении файла:", error);
    return { success: false, error: error.message };
  }
});
