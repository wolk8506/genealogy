// Нормализация адреса из структурного ответа Nominatim (data.address).
// Цель — читаемая строка «частное → общее» без дублей и административной каши.
// Примеры: «вул. Сумська, 5 · Харків · Харківська область · Україна»,
//          «Парк Шевченко · Харків · Україна»,
//          «Петренківський ставок · Харківський район · Україна».

const SETTLEMENT_KEYS = ["city", "town", "village", "municipality", "hamlet"];
const REGION_KEYS = ["state_district", "county", "state"];
const DISTRICT_KEYS = [
  "suburb",
  "neighbourhood",
  "city_district",
  "quarter",
];

const clean = (v) => (typeof v === "string" ? v.trim() : "");
const same = (a, b) => {
  const x = clean(a).toLowerCase();
  const y = clean(b).toLowerCase();
  return Boolean(x) && x === y;
};

// Собирает короткий адрес из структурных полей в виде «общее → частное»:
// страна · город · деталь (улица/POI/район). Если улицы нет — показываем
// район/микрорайон («Сокольники»), чтобы было понятно, где именно место.
// Если структурных данных нет — возвращает исходный displayName.
export function formatShortAddress({ address, featureName, displayName } = {}) {
  const a = address || {};
  if (!address) return "";

  const country = clean(a.country);
  const settlement =
    SETTLEMENT_KEYS.map((k) => clean(a[k])).find(Boolean) || "";
  const region =
    REGION_KEYS.map((k) => clean(a[k])).find(
      (v) => v && !same(v, settlement),
    ) || "";
  const locality = settlement || region;

  // Деталь: улица → имя места (парк/здание) → район/микрорайон.
  let detail = "";
  if (clean(a.road)) {
    detail = clean(a.house_number)
      ? `${clean(a.road)}, ${clean(a.house_number)}`
      : clean(a.road);
  }
  if (!detail) {
    const poi = clean(featureName);
    if (poi && !same(poi, locality) && !same(poi, country)) detail = poi;
  }
  if (!detail) {
    detail = DISTRICT_KEYS.map((k) => clean(a[k])).find(
      (v) => v && !same(v, locality),
    ) || "";
  }

  const seen = new Set();
  const parts = [];
  for (const raw of [country, locality, detail]) {
    const v = clean(raw);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(v);
  }

  if (parts.length === 0) return clean(displayName);
  return parts.join(", ");
}

// Полный адрес из структурных полей, «частное → общее», БЕЗ лишнего:
// муниципалитета/громады и почтового индекса. Пример:
// «Сокольники, Шевченковский район, Харьков, Харьковский район,
//   Харьковская область, Украина».
const FULL_ORDER = [
  ["suburb", "neighbourhood", "quarter"],
  ["city_district"],
  ["city", "town", "village", "hamlet"],
  ["county", "state_district"],
  ["state"],
  ["country"],
];

export function formatFullAddress({ address, displayName } = {}) {
  const a = address || {};
  if (!address) return clean(displayName);

  const seen = new Set();
  const parts = [];
  for (const group of FULL_ORDER) {
    const v = group.map((k) => clean(a[k])).find(Boolean);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(v);
  }

  return parts.length ? parts.join(", ") : clean(displayName);
}

// Стабильный ключ точки для дедупликации списка мест (≈11 м).
export function placeKey(lat, lng) {
  const fl = Number(lat);
  const fg = Number(lng);
  if (!Number.isFinite(fl) || !Number.isFinite(fg)) return null;
  return `${fl.toFixed(4)},${fg.toFixed(4)}`;
}

// Разворачивает историю использованных мест (MRU) в индекс приоритета.
export function buildMruIndex(mru = []) {
  const index = new Map();
  mru.forEach((key, i) => {
    if (key && !index.has(key)) index.set(key, i);
  });
  return index;
}

// Сводит точки фото/событий в уникальный список мест.
// photos: [{ id, owner, filename, title, lat, lng, locationName, datePhoto, date }]
// events: [{ lat, lng, locationName, place, date }]
export function collectSavedPlaces(
  photos = [],
  events = [],
  { mru = [], limit = 200 } = {},
) {
  const byKey = new Map();

  const add = (item) => {
    const { lat, lng, locationName } = item;
    const key = placeKey(lat, lng);
    if (!key) return;
    const existing = byKey.get(key);
    const label = clean(locationName);
    const date = item.datePhoto || item.date || "";
    if (existing) {
      existing.count += 1;
      if (!existing.name && label) existing.name = label;
      if (date && date > existing.date) existing.date = date;
      return;
    }
    byKey.set(key, {
      key,
      lat: Number(lat),
      lng: Number(lng),
      name: label,
      date,
      count: 1,
      id: item.id ?? null,
      owner: item.owner ?? null,
      filename: item.filename ?? null,
    });
  };

  photos.forEach(add);
  events.forEach(add);

  const mruIndex = buildMruIndex(mru);
  const places = Array.from(byKey.values());

  places.sort((a, b) => {
    const ra = mruIndex.has(a.key) ? mruIndex.get(a.key) : Infinity;
    const rb = mruIndex.has(b.key) ? mruIndex.get(b.key) : Infinity;
    if (ra !== rb) return ra - rb;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.count - a.count;
  });

  return places.slice(0, limit);
}
