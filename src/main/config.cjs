const path = require("path");
const { app } = require("electron");
const fs = require("fs");

// Единая точка разрешения путей к данным.
// Активный корень хранится в userData/storage.json и может переключаться
// между местами хранения, например C:/Genealogy и F:/Архив/Genealogy.
// По умолчанию — прежнее поведение: Documents/Genealogy.

function getStorageFilePath() {
  return path.join(app.getPath("userData"), "storage.json");
}

function getDefaultRoot() {
  return path.join(app.getPath("documents"), "Genealogy");
}

function getActiveRoot() {
  const stored = readStorage();
  if (stored.activeRoot && stored.activeRoot.trim()) {
    return path.normalize(stored.activeRoot.trim());
  }
  return getDefaultRoot();
}

function samePath(a, b) {
  if (!a || !b) return false;
  const na = path.normalize(String(a));
  const nb = path.normalize(String(b));
  // Windows: пути регистронезависимы (C: == c:)
  return process.platform === "win32"
    ? na.toLowerCase() === nb.toLowerCase()
    : na === nb;
}

function readStorage() {
  try {
    const raw = fs.readFileSync(getStorageFilePath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const roots = Array.isArray(parsed.roots)
        ? parsed.roots.filter((r) => r && typeof r.path === "string" && r.path.trim())
        : [];
      return {
        activeRoot: typeof parsed.activeRoot === "string" ? parsed.activeRoot : null,
        roots,
      };
    }
  } catch {
    // нет файла или битый JSON — состояние по умолчанию
  }
  return { activeRoot: null, roots: [] };
}

function writeStorage(state) {
  fs.mkdirSync(path.dirname(getStorageFilePath()), { recursive: true });
  fs.writeFileSync(getStorageFilePath(), JSON.stringify(state, null, 2), "utf-8");
}

// Список известных мест: стандартный корень всегда первый и неудаляемый,
// дальше — подключённые пользователем.
function getRoots() {
  const def = getDefaultRoot();
  const { roots } = readStorage();
  const list = [{ path: def, isDefault: true, lastUsedAt: null }];
  for (const entry of roots) {
    const normalized = path.normalize(entry.path);
    if (samePath(normalized, def)) continue;
    if (list.some((item) => samePath(item.path, normalized))) continue;
    list.push({
      path: normalized,
      isDefault: false,
      lastUsedAt: entry.lastUsedAt ?? null,
    });
  }
  return list;
}

function touchRoot(roots, normalized) {
  const next = roots.filter((r) => !samePath(r.path, normalized));
  next.push({ path: normalized, lastUsedAt: new Date().toISOString() });
  return next;
}

function setActiveRoot(dirPath) {
  if (!dirPath || typeof dirPath !== "string" || !path.isAbsolute(dirPath)) {
    throw new Error("setActiveRoot: нужен абсолютный путь к папке данных");
  }
  const normalized = path.normalize(dirPath);
  fs.mkdirSync(normalized, { recursive: true });
  const stored = readStorage();
  writeStorage({
    activeRoot: normalized,
    roots: touchRoot(stored.roots, normalized),
  });
  // Проверка, что выбор реально сохранился и читается обратно.
  const check = readStorage();
  if (!check.activeRoot || !samePath(check.activeRoot, normalized)) {
    throw new Error("Не удалось сохранить место хранения, попробуйте ещё раз");
  }
  return normalized;
}

function addRoot(dirPath) {
  if (!dirPath || typeof dirPath !== "string" || !path.isAbsolute(dirPath)) {
    throw new Error("addRoot: нужен абсолютный путь к папке данных");
  }
  const normalized = path.normalize(dirPath);
  if (samePath(normalized, getDefaultRoot())) return getRoots();
  if (!fs.existsSync(normalized)) {
    throw new Error("Папка не найдена: " + normalized);
  }
  try {
    fs.accessSync(normalized, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    throw new Error("Папка недоступна для записи: " + normalized);
  }
  const stored = readStorage();
  if (stored.roots.some((r) => samePath(r.path, normalized))) return getRoots();
  writeStorage({
    activeRoot: stored.activeRoot,
    roots: [...stored.roots, { path: normalized, lastUsedAt: null }],
  });
  return getRoots();
}

function removeRoot(dirPath) {
  if (samePath(dirPath, getDefaultRoot())) {
    throw new Error("Стандартную папку удалить из списка нельзя");
  }
  const stored = readStorage();
  const next = stored.roots.filter((r) => !samePath(r.path, dirPath));
  const activeRemoved =
    stored.activeRoot && samePath(stored.activeRoot, dirPath);
  writeStorage({
    activeRoot: activeRemoved ? getDefaultRoot() : stored.activeRoot,
    roots: next,
  });
  return getRoots();
}

function getBaseDir() {
  return getActiveRoot();
}

function getDataPath() {
  return path.join(getBaseDir(), "genealogy-data.json");
}

function getPeopleRoot() {
  return path.join(getBaseDir(), "people");
}

function ensureBaseDir(dir = getBaseDir()) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function peopleDir(personId) {
  return path.join(getBaseDir(), "people", String(personId));
}

function photosDir(personId) {
  return path.join(peopleDir(personId), "photos");
}

function photosMetaPath(personId) {
  return path.join(peopleDir(personId), "photos.json");
}

function externalDataPath() {
  return path.join(getBaseDir(), "external-entities.json");
}

function externalDir(entityId) {
  return path.join(getBaseDir(), "external", String(entityId));
}

function getFaceDbPath() {
  return path.join(getBaseDir(), "genealogy.sqlite");
}

function getFaceIndexJsonPath() {
  return path.join(getBaseDir(), "face-index.json");
}

function getTagsPath() {
  return path.join(getBaseDir(), "tags.json");
}

function getTempDir() {
  return path.join(getBaseDir(), "temp");
}

function getLogPath() {
  return path.join(getBaseDir(), "import-log.txt");
}

function getHistoryPath() {
  return path.join(getBaseDir(), "history.jsonl");
}

module.exports = {
  getDefaultRoot,
  getActiveRoot,
  setActiveRoot,
  samePath,
  getRoots,
  addRoot,
  removeRoot,
  getBaseDir,
  getDataPath,
  getPeopleRoot,
  ensureBaseDir,
  peopleDir,
  photosDir,
  photosMetaPath,
  externalDataPath,
  externalDir,
  getFaceDbPath,
  getFaceIndexJsonPath,
  getTagsPath,
  getTempDir,
  getLogPath,
  getHistoryPath,
  // Legacy: значения на момент доступа; деструктуризация фиксирует значение,
  // для переключаемого корня используйте функции выше.
  get baseDir() {
    return getBaseDir();
  },
  get dataPath() {
    return getDataPath();
  },
};
