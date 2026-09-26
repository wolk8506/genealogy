// handlers/geocode.cjs — прямое геокодирование (название → координаты)
// через Nominatim + persistent-кэш в корне данных.
// Лимит Nominatim: не чаще 1 запроса в секунду — очередь с паузой.
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { getActiveRoot } = require("../config.cjs");
const {
  geocodeCacheGetAll,
  geocodeCacheSet,
  geocodeCacheClear,
} = require("../db/faceDb.cjs");
const log = require("../logger.cjs").createLogger("geocode");

const LEGACY_CACHE_FILENAME = "geocode-cache.json";
const MIN_INTERVAL_MS = 1100;
// Неудачи тоже кэшируем, иначе ненайденные названия гоняются
// по сети при каждом открытии карты. TTL — неделя, потом ретрай.
const MISS_TTL_MS = 7 * 24 * 3600 * 1000;

let memoryCache = null;
let cacheRoot = null;
let queueTail = Promise.resolve();

function ensureLoaded() {
  const root = getActiveRoot();
  if (memoryCache && cacheRoot === root) return memoryCache;
  memoryCache = geocodeCacheGetAll();
  cacheRoot = root;
  migrateLegacyJsonCacheOnce();
  return memoryCache;
}

// Разовый переезд со старого geocode-cache.json (если есть).
function migrateLegacyJsonCacheOnce() {
  const legacyPath = path.join(getActiveRoot(), LEGACY_CACHE_FILENAME);
  let parsed = null;
  try {
    if (!fs.existsSync(legacyPath)) return;
    parsed = JSON.parse(fs.readFileSync(legacyPath, "utf-8"));
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") return;
  try {
    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== "object") continue;
      if (!memoryCache[key]) {
        memoryCache[key] = entry;
        geocodeCacheSet(key, entry);
      }
    }
    fs.unlinkSync(legacyPath);
    log.info("geocode cache migrated from JSON to SQLite");
  } catch (err) {
    log.warn("geocode cache migration failed:", err.message);
  }
}

function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase();
}

// Очередь с паузой между запросами (политика Nominatim).
function enqueue(fn) {
  const run = queueTail.then(
    () =>
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            resolve(await fn());
          } catch (err) {
            resolve(null);
            log.warn("geocode request failed:", err.message);
          }
        }, MIN_INTERVAL_MS);
      }),
  );
  queueTail = run.catch(() => {});
  return run;
}

async function fetchCoordinates(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1" +
    `&accept-language=ru&q=${encodeURIComponent(query)}`;
  // Node 18+: глобальный fetch, без зависимостей.
  const response = await fetch(url, {
    headers: {
      "User-Agent": "GenealogyApp/1.0 (contact: local)",
      Referer: "https://localhost/",
    },
  });
  if (!response.ok) {
    throw new Error(`Nominatim: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number(data[0].lat);
  const lon = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lng: lon, displayName: data[0].display_name || null };
}

function shortPlaceName(data) {
  const addr = data?.address || {};
  const city =
    addr.city || addr.town || addr.village || addr.hamlet || addr.suburb;
  const parts = [city, addr.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : data?.display_name || null;
}

async function fetchPlaceName(lat, lng) {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=json" +
    `&lat=${lat}&lon=${lng}&accept-language=ru`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "GenealogyApp/1.0 (contact: local)",
      Referer: "https://localhost/",
    },
  });
  if (!response.ok) {
    throw new Error(`Nominatim: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data || data.error) return null;
  return { lat, lng, name: shortPlaceName(data), displayName: data.display_name || null };
}

// Весь кэш одним запросом — для мгновенного рендера известных точек
// без шторма IPC и без ожидания очереди.
ipcMain.handle("geo:getCache", async () => {
  return ensureLoaded();
});

ipcMain.handle("geo:clearCache", async () => {
  try {
    geocodeCacheClear();
    memoryCache = {};
    cacheRoot = getActiveRoot();
    log.info("geocode cache cleared");
    return true;
  } catch (err) {
    log.warn("geocode cache clear failed:", err.message);
    return false;
  }
});

ipcMain.handle("geo:forward", async (_, query) => {
  const key = normalizeQuery(query);
  if (!key) return null;

  const cache = ensureLoaded();
  const hit = cache[key];
  if (hit && !hit.miss) return hit;
  // Свежая неудача — сразу null без задержки и запроса.
  // TTL истёк — пробуем заново ниже.
  if (hit?.miss && Date.now() - Date.parse(hit.at) < MISS_TTL_MS) {
    return null;
  }

  const result = await enqueue(() => fetchCoordinates(String(query).trim()));
  const entry = result
    ? { ...result, at: new Date().toISOString() }
    : { miss: true, at: new Date().toISOString() };
  cache[key] = entry;
  try {
    geocodeCacheSet(key, entry);
  } catch (err) {
    log.warn("geocode cache write failed:", err.message);
  }
  return result;
});

// Обратное геокодирование для пикера точки: координаты → короткое название.
// Ключ кэша — округлённые координаты, без TTL (точки не двигаются).
ipcMain.handle("geo:reverse", async (_, lat, lng) => {
  const flat = Number(lat);
  const flng = Number(lng);
  if (!Number.isFinite(flat) || !Number.isFinite(flng)) return null;
  const key = `rev:${flat.toFixed(3)},${flng.toFixed(3)}`;

  const cache = ensureLoaded();
  if (cache[key] && !cache[key].miss) return cache[key];

  const result = await enqueue(() => fetchPlaceName(flat, flng));
  const entry = result
    ? { ...result, at: new Date().toISOString() }
    : { miss: true, at: new Date().toISOString() };
  cache[key] = entry;
  try {
    geocodeCacheSet(key, entry);
  } catch (err) {
    log.warn("geocode cache write failed:", err.message);
  }
  return result;
});
