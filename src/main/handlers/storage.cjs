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
  checkDirUsable,
  getVolumeFreeBytes,
  formatBytes,
  isLibraryDir,
  isEmptyDir,
} = require("../config.cjs");
const { closeFaceDb, initializeFaceDb } = require("../db/faceDb.cjs");
const { stopWatching, watchFolder } = require("../watchFolder.cjs");
const log = require("../logger.cjs").createLogger("storage");

// Минимум свободного места на томе данных (фото и индекс растут быстро,
// особенно на съёмных дисках).
const MIN_STORAGE_FREE_BYTES = 500 * 1024 * 1024;

function isUsableRoot(dir) {
  try {
    ensureBaseDir(dir);
    checkDirUsable(dir);
    return true;
  } catch {
    return false;
  }
}

// Сообщение для рендерера о том, что старт прошёл не с той папкой.
// Забирается один раз через storage:consume-startup-notice.
let startupNotice = null;

// Стартовое разрешение корня. Вызывать после app.whenReady().
//
// Здесь нельзя показывать синхронные диалоги: функция выполняется до
// создания первого окна, а showMessageBoxSync блокирует main-процесс.
// В результате приложение выглядит зависшим — окно не появляется,
// DevTools не открывается, «Перезагрузить» в меню не срабатывает.
// Поэтому недоступная папка заменяется стандартной, а пользователь
// узнаёт об этом уже в готовом окне.
function resolveStartupRoot() {
  const def = getDefaultRoot();
  const active = getActiveRoot();

  if (isUsableRoot(active)) {
    return { root: active, fellBack: null, problem: null };
  }

  const isDefaultActive = samePath(active, def);

  if (!isDefaultActive) {
    try {
      if (isUsableRoot(def)) {
        setActiveRoot(def);
        startupNotice = { kind: "fallback", from: active, to: def };
        log.warn(
          `Папка данных недоступна, включена стандартная: ${active} → ${def}`,
        );
        return { root: def, fellBack: startupNotice, problem: null };
      }
    } catch (error) {
      log.warn(
        "Не удалось переключиться на стандартную папку:",
        error.message,
      );
    }
  }

  // Недоступны и выбранная, и стандартная папки (например, macOS не дала
  // доступ к Documents). Окно всё равно создаём: из настроек можно выбрать
  // рабочее место хранения.
  startupNotice = {
    kind: "unavailable",
    activeRoot: active,
    defaultRoot: def,
  };
  log.error(
    `Нет доступной папки данных. Активная: ${active}, стандартная: ${def}`,
  );
  return {
    root: active,
    fellBack: null,
    problem: { activeRoot: active, defaultRoot: def, isDefault: isDefaultActive },
  };
}

// Показать проблему после создания окна. Асинхронный диалог не блокирует
// main-процесс, поэтому настройки и DevTools остаются доступны.
async function notifyStartupProblem(win, problem) {
  if (!problem) return undefined;

  const detail = problem.isDefault
    ? `Не удалось получить доступ к стандартной папке:\n${problem.defaultRoot}\n\n` +
      "Проверьте права доступа к папке или выберите другое место хранения в настройках."
    : `Папка данных недоступна:\n${problem.activeRoot}\n\n` +
      "Возможно, отключён внешний диск. Выберите другое место хранения в настройках.";

  try {
    const { response } = await dialog.showMessageBox(win, {
      type: "warning",
      title: "Место хранения недоступно",
      message: "Приложение запущено без доступа к папке данных",
      detail,
      buttons: ["Открыть настройки", "Продолжить"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response === 0 && win && !win.isDestroyed()) {
      win.webContents.send("navigate", "/settings");
    }
  } catch (error) {
    log.warn(
      "Не удалось показать предупреждение о хранилище:",
      error.message,
    );
  }

  return undefined;
}

module.exports = {
  resolveStartupRoot,
  notifyStartupProblem,
  isUsableRoot,
};

function getStorageInfo() {
  const activeRoot = getActiveRoot();
  const defaultRoot = getDefaultRoot();
  let exists = false;
  let writable = false;
  exists = fs.existsSync(activeRoot);
  if (exists) {
    writable = isUsableRoot(activeRoot);
  }
  return {
    activeRoot,
    defaultRoot,
    isDefault: samePath(activeRoot, defaultRoot),
    exists,
    writable,
    freeBytes: exists ? getVolumeFreeBytes(activeRoot) : null,
    roots: getRoots(),
  };
}

ipcMain.handle("storage:get", async () => getStorageInfo());

// Одноразовое уведомление о том, что при старте пришлось сменить папку.
ipcMain.handle("storage:consume-startup-notice", async () => {
  const notice = startupNotice;
  startupNotice = null;
  return notice;
});

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
    checkDirUsable(target);
  } catch {
    throw new Error("Папка недоступна для работы: " + target);
  }

  // На съёмном диске место может закончиться раньше, чем данные:
  // требуем минимум свободного места до переключения.
  const freeBytes = getVolumeFreeBytes(target);
  if (freeBytes != null && freeBytes < MIN_STORAGE_FREE_BYTES) {
    throw new Error(
      `На диске свободно ${formatBytes(freeBytes)}, ` +
        `а для работы нужно минимум ${formatBytes(MIN_STORAGE_FREE_BYTES)}: ${target}`,
    );
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
  // Важно: app.exit(), а не app.quit(). quit() закрывает окна и может
  // затянуться, из-за чего новый экземпляр стартует, пока старый ещё держит
  // профиль Chromium (userData). В упакованном приложении это приводило к
  // падению рендерера сразу после смены папки. exit(0) завершает процесс
  // сразу, и relaunch запускает чистый экземпляр.
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 300);

  return { success: true, activeRoot: target, restart: true };
});

ipcMain.handle("storage:add", async (event, dirPath, options = {}) => {
  if (!dirPath || typeof dirPath !== "string" || !path.isAbsolute(dirPath)) {
    throw new Error("Нужен абсолютный путь к папке");
  }
  const normalized = path.normalize(dirPath);
  // Пустая или несуществующая папка — молча считаем новой библиотекой
  // (несуществующую отклонит addRoot ниже). В папке есть файлы, но на
  // библиотеку не похоже — просим подтвердить в UI.
  if (
    !options.force &&
    fs.existsSync(normalized) &&
    !isEmptyDir(normalized) &&
    !isLibraryDir(normalized)
  ) {
    return {
      success: false,
      needsConfirm: true,
      dirPath: normalized,
      activeRoot: getActiveRoot(),
      roots: getRoots(),
    };
  }
  const roots = addRoot(normalized);
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
    app.exit(0);
  }, 300);

  return { success: true, roots, activeRoot: fallback, restart: true };
});
