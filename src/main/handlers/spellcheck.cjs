// Проверка орфографии в редакторе биографии.
// Русский словарь входит в приложение, остальные скачиваются по требованию.
// Системный спеллчекер macOS здесь не используется: он определяет язык сам
// и на системах с украинским словарём не даёт вариантов для русских слов.
const { app, ipcMain, BrowserWindow, net } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("../logger.cjs").createLogger("spellcheck");

const CDN = "https://cdn.jsdelivr.net/npm/";
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_WORDS = 5000;

const LANGUAGES = [
  {
    code: "ru",
    title: "Русский",
    pkg: "dictionary-ru@3.0.0",
    bundled: true,
    sizeMb: 3.4,
  },
  {
    code: "en",
    title: "English",
    pkg: "dictionary-en@4.0.0",
    sizeMb: 0.6,
  },
  {
    code: "uk",
    title: "Українська",
    pkg: "dictionary-uk@4.0.0",
    sizeMb: 8.7,
  },
  {
    code: "de",
    title: "Deutsch",
    pkg: "dictionary-de@3.0.0",
    sizeMb: 1.1,
  },
  {
    code: "fr",
    title: "Français",
    pkg: "dictionary-fr@3.0.0",
    sizeMb: 1.4,
  },
  {
    code: "es",
    title: "Español",
    pkg: "dictionary-es@4.0.0",
    sizeMb: 0.9,
  },
  {
    code: "it",
    title: "Italiano",
    pkg: "dictionary-it@2.0.0",
    sizeMb: 1.4,
  },
  {
    code: "pl",
    title: "Polski",
    pkg: "dictionary-pl@2.0.0",
    sizeMb: 5,
  },
];

let bundledDir = null;
try {
  bundledDir = path.dirname(require.resolve("dictionary-ru"));
} catch (error) {
  log.warn("Встроенный словарь не найден:", error.message);
}

let nspell = null;
let spell = null;
let spellKey = null;

function getNspell() {
  if (!nspell) nspell = require("nspell");
  return nspell;
}

function languageByCode(code) {
  return LANGUAGES.find((language) => language.code === code) || null;
}

function userDictDir(code) {
  return path.join(app.getPath("userData"), "spellcheck", code);
}

function dictionaryDir(language) {
  if (language.bundled && bundledDir) {
    const bundled = path.join(bundledDir, "index.dic");
    if (fs.existsSync(bundled)) return bundledDir;
  }
  return userDictDir(language.code);
}

function isInstalled(language) {
  if (!language) return false;
  const dir = dictionaryDir(language);
  return (
    fs.existsSync(path.join(dir, "index.aff")) &&
    fs.existsSync(path.join(dir, "index.dic"))
  );
}

function detectSystemLanguage() {
  let tags = [];
  try {
    tags = app.getPreferredSystemLanguages?.() || [];
  } catch (error) {
    log.warn("Не удалось получить языки системы:", error.message);
  }
  if (!tags.length) {
    try {
      tags = [app.getLocale()];
    } catch {
      tags = [];
    }
  }
  for (const tag of tags) {
    const base = String(tag || "")
      .toLowerCase()
      .split(/[-_]/)[0];
    if (languageByCode(base)) return base;
  }
  return null;
}

function readConfig(store) {
  const config = store.get("spellcheck") || {};
  return {
    enabled: config.enabled !== false,
    language: languageByCode(config.language)?.code || "auto",
  };
}

function resolveState(store) {
  const config = readConfig(store);
  const detected = detectSystemLanguage();
  const autoCode = detected || "ru";

  // В авторежиме используем язык системы только если его словарь уже есть.
  // Иначе остаёмся на русском и не скачиваем ничего без ведома пользователя.
  const active =
    config.language === "auto"
      ? languageByCode(autoCode) && isInstalled(languageByCode(autoCode))
        ? autoCode
        : "ru"
      : config.language;

  const language = languageByCode(active);
  return {
    enabled: config.enabled,
    choice: config.language,
    detected,
    active: language ? language.code : null,
    activeTitle: language ? language.title : null,
    installed: Boolean(language && isInstalled(language)),
  };
}

function publicState(store) {
  const state = resolveState(store);
  return {
    ...state,
    systemTitle: languageByCode(state.detected)?.title || null,
    languages: LANGUAGES.map((language) => ({
      code: language.code,
      title: language.title,
      bundled: Boolean(language.bundled),
      installed: isInstalled(language),
      sizeMb: language.sizeMb,
    })),
  };
}

function notifyChanged() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("spellcheck:changed");
  }
}

function loadSpell(store) {
  const state = resolveState(store);
  if (!state.enabled || !state.installed || !state.active) {
    spell = null;
    spellKey = null;
    return null;
  }

  const key = `${state.active}:${dictionaryDir(languageByCode(state.active))}`;
  if (spell && spellKey === key) return spell;

  const language = languageByCode(state.active);
  const dir = dictionaryDir(language);
  const started = Date.now();
  try {
    const next = getNspell()(
      fs.readFileSync(path.join(dir, "index.aff"), "utf8"),
      fs.readFileSync(path.join(dir, "index.dic"), "utf8"),
    );
    const words = store.get("spellcheckWords") || {};
    for (const word of words[state.active] || []) next.add(word);
    spell = next;
    spellKey = key;
    log.info(`Словарь «${state.active}» загружен за ${Date.now() - started} мс`);
    return spell;
  } catch (error) {
    log.error(`Не удалось загрузить словарь «${state.active}»:`, error.message);
    spell = null;
    spellKey = null;
    return null;
  }
}

function resetSpell() {
  spell = null;
  spellKey = null;
}

async function downloadFile(url, target) {
  const response = await net.fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) {
    throw new Error(`Сервер вернул ${response.status}`);
  }

  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_FILE_BYTES) {
    throw new Error("Словарь слишком большой");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Пустой файл словаря");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("Словарь слишком большой");

  await fs.promises.writeFile(`${target}.tmp`, buffer);
  await fs.promises.rename(`${target}.tmp`, target);
}

async function downloadLanguage(store, code) {
  const language = languageByCode(code);
  if (!language) throw new Error("Неизвестный язык");
  if (isInstalled(language)) return publicState(store);

  const dir = userDictDir(code);
  await fs.promises.mkdir(dir, { recursive: true });

  try {
    for (const file of ["index.aff", "index.dic"]) {
      await downloadFile(`${CDN}${language.pkg}/${file}`, path.join(dir, file));
    }

    // Проверяем, что nspell вообще может открыть скачанный словарь.
    getNspell()(
      fs.readFileSync(path.join(dir, "index.aff"), "utf8"),
      fs.readFileSync(path.join(dir, "index.dic"), "utf8"),
    );
  } catch (error) {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    const message = String(error.message || "");
    throw new Error(
      /fetch failed|net::ERR|ENOTFOUND|ECONN|ETIMEDOUT|EAI_AGAIN/i.test(message)
        ? "Не удалось скачать словарь. Проверьте подключение к интернету."
        : message,
    );
  }

  resetSpell();
  log.info(`Словарь «${code}» скачан в ${dir}`);
  notifyChanged();
  return publicState(store);
}

function sanitizeWords(words) {
  if (!Array.isArray(words)) return [];
  const seen = new Set();
  for (const value of words) {
    if (typeof value !== "string") continue;
    const word = value.trim().normalize("NFC");
    if (word.length < 2 || word.length > 64) continue;
    seen.add(word);
    if (seen.size >= MAX_WORDS) break;
  }
  return [...seen];
}

module.exports = (store) => {
  ipcMain.handle("spellcheck:getState", () => publicState(store));

  ipcMain.handle("spellcheck:setEnabled", (_event, enabled) => {
    const config = store.get("spellcheck") || {};
    store.set("spellcheck", { ...config, enabled: Boolean(enabled) });
    resetSpell();
    notifyChanged();
    return publicState(store);
  });

  ipcMain.handle("spellcheck:setLanguage", (_event, code) => {
    const config = store.get("spellcheck") || {};
    store.set("spellcheck", {
      ...config,
      language: languageByCode(code) ? code : "auto",
    });
    resetSpell();
    notifyChanged();
    return publicState(store);
  });

  ipcMain.handle("spellcheck:download", (_event, code) =>
    downloadLanguage(store, code),
  );

  ipcMain.handle("spellcheck:check", (_event, words) => {
    const instance = loadSpell(store);
    if (!instance) return { misspelled: [], ready: false };

    const misspelled = [];
    for (const word of sanitizeWords(words)) {
      if (!instance.spell(word).correct) misspelled.push(word);
    }
    return { misspelled, ready: true };
  });

  ipcMain.handle("spellcheck:suggest", (_event, value) => {
    const instance = loadSpell(store);
    if (!instance || typeof value !== "string") return [];
    const word = value.trim().normalize("NFC");
    if (!word || word.length > 64) return [];
    return instance.suggest(word).slice(0, 8);
  });

  ipcMain.handle("spellcheck:addWord", (_event, value) => {
    const instance = loadSpell(store);
    if (!instance || typeof value !== "string") return { ok: false };
    const word = value.trim().normalize("NFC");
    if (!word) return { ok: false };

    const state = resolveState(store);
    if (!state.active) return { ok: false };

    const allWords = store.get("spellcheckWords") || {};
    const list = Array.isArray(allWords[state.active])
      ? allWords[state.active]
      : [];
    if (!list.includes(word)) {
      store.set("spellcheckWords", {
        ...allWords,
        [state.active]: [...list, word],
      });
    }
    instance.add(word);
    notifyChanged();
    return { ok: true, word };
  });
};
