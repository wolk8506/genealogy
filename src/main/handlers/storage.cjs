// handlers/storage.cjs — переключение корня данных (места хранения).
// Активный корень: getActiveRoot() из config.cjs (по умолчанию Documents/Genealogy).
const { ipcMain, dialog, app } = require("electron");
const fs = require("fs");
const path = require("path");
const {
  getActiveRoot,
  getDefaultRoot,
  setActiveRoot,
  samePath,
  getRoots,
  addRoot,
  removeRoot,
  ensureBaseDir,
} = require("../config.cjs");
const { closeFaceDb, initializeFaceDb } = require("../db/faceDb.cjs");
const { stopWatching, watchFolder } = require("../watchFolder.cjs");

function checkWritable(dir) {
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
}

function isUsableRoot(dir) {
  try {
    ensureBaseDir(dir);
    checkWritable(dir);
    return true;
  } catch {
    return false;
  }
}

// Стартовое разрешение корня. Вызывать после app.whenReady().
// Стандартный путь: создать при отсутствии, иначе — критическая ошибка и выход.
// Нестандартный (часто съёмный диск): диалог действий.
function resolveStartupRoot() {
  const def = getDefaultRoot();
  let active = getActiveRoot();

  if (isUsableRoot(active)) return { root: active, fellBack: null };

  if (samePath(active, def)) {
    dialog.showMessageBoxSync({
      type: "error",
      title: "Нет доступа к папке данных",
      message: `Не удалось создать стандартную папку:\n${def}`,
      buttons: ["Выйти"],
    });
    app.quit();
    return null;
  }

  for (;;) {
    const choice = dialog.showMessageBoxSync({
      type: "warning",
      title: "Место хранения недоступно",
      message:
        `Папка данных недоступна:\n${active}\n\n` +
        "Возможно, отключён внешний диск.",
      buttons: ["Повторить", "Выбрать другую…", "Стандартная папка", "Выйти"],
      defaultId: 0,
      cancelId: 3,
    });

    if (choice === 0) {
      // Диск могли подключить — перечитываем и проверяем заново.
      active = getActiveRoot();
      if (isUsableRoot(active)) return { root: active, fellBack: null };
      continue;
    }

    if (choice === 1) {
      const picked = dialog.showOpenDialogSync({
        title: "Выберите папку данных Genealogy",
        defaultPath: active,
        properties: ["openDirectory", "createDirectory"],
      });
      if (!picked || !picked[0]) continue;
      try {
        const normalized = setActiveRoot(picked[0]);
        if (isUsableRoot(normalized)) {
          return { root: normalized, fellBack: null };
        }
        active = normalized;
      } catch {
        active = picked[0];
      }
      continue;
    }

    if (choice === 2) {
      setActiveRoot(def);
      return { root: def, fellBack: { from: active, to: def } };
    }

    app.quit();
    return null;
  }
}

module.exports = { resolveStartupRoot, isUsableRoot };

function getStorageInfo() {
  const activeRoot = getActiveRoot();
  const defaultRoot = getDefaultRoot();
  let exists = false;
  let writable = false;
  try {
    exists = fs.existsSync(activeRoot);
    if (exists) {
      checkWritable(activeRoot);
      writable = true;
    }
  } catch {
    writable = false;
  }
  return {
    activeRoot,
    defaultRoot,
    isDefault: samePath(activeRoot, defaultRoot),
    exists,
    writable,
    roots: getRoots(),
  };
}

ipcMain.handle("storage:get", async () => getStorageInfo());

ipcMain.handle("storage:choose", async () => {
  const result = await dialog.showOpenDialog({
    title: "Выберите папку данных Genealogy",
    defaultPath: getActiveRoot(),
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("storage:switch", async (event, dirPath) => {
  if (!dirPath || typeof dirPath !== "string") {
    throw new Error("Не выбрана папка данных");
  }
  if (!path.isAbsolute(dirPath)) {
    throw new Error("Нужен абсолютный путь к папке");
  }

  const target = path.normalize(dirPath);
  const previous = getActiveRoot();

  if (samePath(target, previous)) {
    return { success: true, alreadyActive: true, activeRoot: previous, restart: false };
  }

  fs.mkdirSync(target, { recursive: true });
  try {
    checkWritable(target);
  } catch {
    throw new Error("Папка недоступна для записи: " + target);
  }

  stopWatching();
  closeFaceDb();

  try {
    setActiveRoot(target);
    ensureBaseDir(target);
    initializeFaceDb();
  } catch (error) {
    // best-effort откат на предыдущий корень
    try {
      setActiveRoot(previous);
      ensureBaseDir(previous);
      initializeFaceDb();
    } catch {
      // корень в storage.json уже предыдущий; дальше только watcher
    }
    watchFolder();
    throw new Error("Не удалось переключиться: " + error.message);
  }

  watchFolder();

  // Свежий старт main-процесса (хэштеги, кэши) — перезапуск после ответа.
  setTimeout(() => {
    app.relaunch();
    app.quit();
  }, 300);

  return { success: true, activeRoot: target, restart: true };
});

ipcMain.handle("storage:add", async (event, dirPath) => {
  const roots = addRoot(dirPath);
  return { success: true, roots, activeRoot: getActiveRoot() };
});

ipcMain.handle("storage:remove", async (event, dirPath) => {
  if (!dirPath || typeof dirPath !== "string") {
    throw new Error("Не выбрано место для удаления");
  }
  const wasActive = samePath(getActiveRoot(), dirPath);
  const roots = removeRoot(dirPath);

  if (!wasActive) {
    return { success: true, roots, activeRoot: getActiveRoot(), restart: false };
  }

  // Удалили активный корень — переоткрываемся на стандартный.
  const fallback = getActiveRoot();
  stopWatching();
  closeFaceDb();
  try {
    ensureBaseDir(fallback);
    initializeFaceDb();
  } catch (error) {
    watchFolder();
    throw new Error("Не удалось вернуться на стандартную папку: " + error.message);
  }
  watchFolder();

  setTimeout(() => {
    app.relaunch();
    app.quit();
  }, 300);

  return { success: true, roots, activeRoot: fallback, restart: true };
});
