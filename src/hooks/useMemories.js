import { useMemo } from "react";
import { toISODateKey } from "../utils/photoDates";

// Точное совпадение месяц-день (без нормализации "2019" -> 01-01,
// иначе годовщины притянут 1 января).
function exactMD(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  let m = s.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (m) return { md: `${m[1]}-${m[2]}`, year: Number(s.slice(0, 4)) };
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    return {
      md: `${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`,
      year: Number(m[3]),
    };
  }
  return null;
}

// «В этот день»: фото и события прошлых лет с сегодняшним числом.
// Возвращает [{ year, yearsAgo, photos, events }] от свежих к старым.
export default function useMemories(photos = [], allPeople = []) {
  return useMemo(() => {
    const now = new Date();
    const todayMD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
    const thisYear = now.getFullYear();
    const byYear = new Map();

    const entry = (year) => {
      if (!byYear.has(year)) {
        byYear.set(year, {
          year,
          yearsAgo: thisYear - year,
          photos: [],
          events: [],
        });
      }
      return byYear.get(year);
    };

    for (const p of photos || []) {
      const parsed = exactMD(p?.datePhoto);
      if (!parsed || parsed.md !== todayMD || parsed.year >= thisYear) continue;
      entry(parsed.year).photos.push(p);
    }

    for (const person of allPeople || []) {
      for (const ev of person.events || []) {
        const parsed = exactMD(ev?.date);
        if (!parsed || parsed.md !== todayMD || parsed.year >= thisYear) {
          continue;
        }
        entry(parsed.year).events.push({ ...ev, personId: person.id });
      }
    }

    return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
  }, [photos, allPeople]);
}

export function formatYearsAgo(n) {
  if (n % 10 === 1 && n % 100 !== 11) return `${n} год назад`;
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) {
    return `${n} года назад`;
  }
  return `${n} лет назад`;
}
