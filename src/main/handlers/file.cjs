const { app, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

ipcMain.handle("file:writeText", async (_, targetPath, text) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(targetPath, text, "utf-8");
});

ipcMain.handle("file:writeBlob", async (_, targetPath, arrayBuffer) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(targetPath, buffer);
});

ipcMain.handle("file:copyFile", async (_, source, destination) => {
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.copyFile(source, destination);
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
      const baseDir = PEOPLE_BASE;
      const dir = path.join(baseDir, String(ownerId), "photos");
      const src = path.join(dir, oldFilename);
      const dst = path.join(dir, newFilename);

      // проверка существования
      await fs.promises.access(src);

      // создать папку (на всякий)
      await fs.promises.mkdir(dir, { recursive: true });

      // переименовать (atomic)
      await fs.promises.rename(src, dst);

      return dst;
    } catch (err) {
      console.error("[file:renameFile] failed:", err);
      throw err;
    }
  }
);

// --- file:moveFile ---
// Перемещаем фото между папками владельцев, ищем исходник в нескольких местах
ipcMain.handle(
  "file:moveFile",
  async (_, oldOwnerId, newOwnerId, oldFilename, newFilename) => {
    try {
      const candidates = [
        path.join(PEOPLE_BASE, String(oldOwnerId), "photos", oldFilename),
        path.join(__dirname, "photos", String(oldOwnerId), oldFilename),
        path.join(process.cwd(), "photos", String(oldOwnerId), oldFilename),
        path.join(
          app.getPath("userData"),
          "Genealogy",
          "people",
          String(oldOwnerId),
          "photos",
          oldFilename
        ),
      ];

      let source = null;
      for (const c of candidates) {
        try {
          await fs.promises.access(c, fs.constants.R_OK);
          source = c;
          break;
        } catch (err) {}
      }
      if (!source) {
        const msg = `Source file not found. Tried:\n${candidates.join("\n")}`;
        const err = new Error(msg);
        err.code = "SOURCE_NOT_FOUND";
        throw err;
      }

      const destDir = path.join(PEOPLE_BASE, String(newOwnerId), "photos");
      const destName = newFilename || oldFilename;
      const destination = path.join(destDir, destName);

      await fs.promises.mkdir(destDir, { recursive: true });
      await fs.promises.copyFile(source, destination);
      try {
        await fs.promises.rm(source, { force: true });
      } catch (rmErr) {
        console.warn("rm failed", rmErr);
      }

      return destination;
    } catch (err) {
      console.error("[file:moveFile] failed:", err);
      throw err;
    }
  }
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
  }
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
    return { ok: true, count: arr.length };
  } catch (err) {
    console.error("[photo:addOrUpdateOwnerJson] failed:", err);
    throw err;
  }
});
