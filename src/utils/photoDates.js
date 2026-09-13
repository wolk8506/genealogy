// Общие helpers дат для галереи и ленты времени.

// "2019" -> 2019-01-01, "2019-03" -> 2019-03-01, ISO/full -> timestamp, иначе null.
export function normalizePhotoDate(dp) {
  if (!dp) return null;
  let s = String(dp).trim();
  if (/^\d{4}$/.test(s)) s += "-01-01";
  else if (/^\d{4}-\d{2}$/.test(s)) s += "-01";
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

// Любой формат даты -> ключ "YYYY-MM-DD" или null.
// Понимает ISO ("2019-03-21", "2019-03-21T..."), "DD.MM.YYYY" (события),
// "YYYY-MM" (-> YYYY-MM-01), "YYYY" (-> YYYY-01-01).
export function toISODateKey(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-01`;
  m = s.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01-01`;
  return null;
}

export function yearOfKey(key) {
  return key ? key.slice(0, 4) : null;
}

export function monthOfKey(key) {
  return key ? key.slice(0, 7) : null; // "YYYY-MM"
}

// "2019-03-21" -> "21 марта, четверг"
export function formatDayLabel(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(key || "");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const s = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "2019-03" -> "Март 2019"
export function formatMonthLabel(monthKey) {
  const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(monthKey || "");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  const s = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
