import {
  toISODateKey,
  yearOfKey,
  monthOfKey,
  formatDayLabel,
  formatMonthLabel,
} from "./photoDates";

// Сквозная хронология: годы -> месяцы -> дни.
// photos: [{ id, datePhoto, ... }], events: [{ date, ... }] (любой формат дат).
// Возвращает { years, undatedPhotos, eventsByDay } — всё отсортировано от новых к старым.
export function buildTimeline(photos = [], events = []) {
  const yearsMap = new Map(); // year -> { year, months: Map, count }
  const undatedPhotos = [];

  for (const photo of photos || []) {
    const key = toISODateKey(photo?.datePhoto);
    if (!key) {
      undatedPhotos.push(photo);
      continue;
    }
    const year = yearOfKey(key);
    const month = monthOfKey(key);
    if (!yearsMap.has(year)) {
      yearsMap.set(year, { year, months: new Map(), count: 0 });
    }
    const yearEntry = yearsMap.get(year);
    yearEntry.count += 1;
    if (!yearEntry.months.has(month)) {
      yearEntry.months.set(month, {
        key: month,
        label: formatMonthLabel(month),
        days: new Map(),
        count: 0,
      });
    }
    const monthEntry = yearEntry.months.get(month);
    monthEntry.count += 1;
    if (!monthEntry.days.has(key)) {
      monthEntry.days.set(key, {
        key,
        label: formatDayLabel(key),
        photos: [],
      });
    }
    monthEntry.days.get(key).photos.push(photo);
  }

  const eventsByDay = new Map(); // "YYYY-MM-DD" -> [events]
  for (const ev of events || []) {
    const key = toISODateKey(ev?.date);
    if (!key) continue;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key).push(ev);
  }

  // Одно событие (брак и т.п.), записанное у нескольких людей, —
  // одна карточка со всеми участниками.
  for (const [key, list] of eventsByDay) {
    const merged = new Map();
    for (const ev of list) {
      const dupKey = [
        ev?.type || "",
        toISODateKey(ev?.date) || ev?.date || "",
        String(ev?.place || "").trim().toLowerCase(),
      ].join("|");
      if (!merged.has(dupKey)) merged.set(dupKey, { ...ev, personIds: [] });
      const entry = merged.get(dupKey);
      if (ev?.personId != null && !entry.personIds.includes(ev.personId)) {
        entry.personIds.push(ev.personId);
      }
    }
    eventsByDay.set(key, Array.from(merged.values()));
  }

  // Дни только с событиями (без фото) — тоже строки ленты:
  // достраиваем год/месяц/день, чтобы счётчики и строки сходились.
  for (const [key] of eventsByDay) {
    const year = yearOfKey(key);
    const month = monthOfKey(key);
    if (!year || !month) continue;
    if (!yearsMap.has(year)) {
      yearsMap.set(year, { year, months: new Map(), count: 0 });
    }
    const yearEntry = yearsMap.get(year);
    if (!yearEntry.months.has(month)) {
      yearEntry.months.set(month, {
        key: month,
        label: formatMonthLabel(month),
        days: new Map(),
        count: 0,
      });
    }
    const monthEntry = yearEntry.months.get(month);
    if (!monthEntry.days.has(key)) {
      monthEntry.days.set(key, {
        key,
        label: formatDayLabel(key),
        photos: [],
      });
    }
  }

  const years = Array.from(yearsMap.values())
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((yearEntry) => ({
      year: yearEntry.year,
      count: yearEntry.count,
      months: Array.from(yearEntry.months.values())
        .sort((a, b) => b.key.localeCompare(a.key))
        .map((monthEntry) => ({
          ...monthEntry,
          days: Array.from(monthEntry.days.values()).sort((a, b) =>
            b.key.localeCompare(a.key),
          ),
        })),
    }));

  return { years, undatedPhotos, eventsByDay };
}
