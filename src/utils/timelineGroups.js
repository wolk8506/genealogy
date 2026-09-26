import {
  toISODateKey,
  yearOfKey,
  monthOfKey,
  formatDayLabel,
  formatMonthLabel,
} from "./photoDates";

import { pointKey } from "../pages/Page_Map/mapHelpers";

// Сквозная хронология: годы -> месяцы -> дни.
// photos: [{ id, datePhoto, ... }], events: [{ date, ... }] (любой формат дат).
// externalEntities: [{ id, name, birthday, address, ... }] — даты из birthday.
// Возвращает { years, undatedPhotos, eventsByDay } — всё отсортировано от новых к старым.
export function buildTimeline(
  photos = [],
  events = [],
  externalEntities = [],
) {
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
    eventsByDay.get(key).push({ ...ev, kind: "event" });
  }

  for (const entity of externalEntities || []) {
    const key = toISODateKey(entity?.birthday);
    if (!key) continue;
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key).push({
      kind: "external",
      externalId: entity.id,
      type: "Справочник",
      label: entity.name || entity.id,
      place: String(entity.address || "").trim(),
      date: entity.birthday,
      entityType: entity.type,
    });
  }

  // Одно событие (брак и т.п.), записанное у нескольких людей, —
  // одна карточка со всеми участниками.
  for (const [key, list] of eventsByDay) {
    const externals = list.filter((e) => e.kind === "external");
    const personEvents = list.filter((e) => e.kind !== "external");
    const merged = new Map();
    for (const ev of personEvents) {
      const dupKey = [
        ev?.type || "",
        toISODateKey(ev?.date) || ev?.date || "",
        String(ev?.place || "").trim().toLowerCase(),
      ].join("|");
      if (!merged.has(dupKey)) {
        merged.set(dupKey, { ...ev, kind: "event", personIds: [], sources: [] });
      }
      const entry = merged.get(dupKey);
      if (ev?.personId != null && !entry.personIds.includes(ev.personId)) {
        entry.personIds.push(ev.personId);
      }
      entry.sources.push({
        personId: ev.personId,
        eventId: ev.id,
        eventIndex: ev._eventIndex,
      });
    }
    eventsByDay.set(key, [...Array.from(merged.values()), ...externals]);
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

export function timelineEntryFocusKey(entry) {
  if (!entry) return null;
  if (entry.kind === "external") {
    return pointKey({ kind: "external", externalId: entry.externalId });
  }
  const personId = entry.personIds?.[0] ?? entry.personId;
  return pointKey({
    kind: "event",
    personId,
    eventId: entry.id,
    eventIndex: entry.sources?.[0]?.eventIndex,
    eventType: entry.type,
    sub: entry.date,
    place: entry.place,
  });
}

export function dayMapFocusKey(day) {
  if (!day) return null;
  const photoWithPlace = (day.photos || []).find((p) => p.locationName?.trim());
  if (photoWithPlace) return pointKey({ kind: "photo", id: photoWithPlace.id });
  if ((day.photos || []).length > 0) {
    return pointKey({ kind: "photo", id: day.photos[0].id });
  }
  for (const ev of day.events || []) {
    if (ev.place?.trim() || ev.kind === "external") {
      const k = timelineEntryFocusKey(ev);
      if (k) return k;
    }
  }
  return null;
}
