const VALID_LEVELS = new Set(["years", "months", "days"]);

export function parseTimelineSearch(searchParams) {
  const rawLevel = searchParams.get("level");
  const level = VALID_LEVELS.has(rawLevel) ? rawLevel : "years";

  let year = searchParams.get("year") || null;
  let month = searchParams.get("month") || null;
  const person = searchParams.get("person") || null;

  if (month && !/^\d{4}-\d{2}$/.test(month)) month = null;
  if (year && !/^\d{4}$/.test(year)) year = null;
  if (month && !year) year = month.slice(0, 4);
  if (year && month && !month.startsWith(`${year}-`)) month = null;

  return { level, year, month, person };
}

/** Обновляет query ленты, сохраняя person и прочие чужие параметры. */
export function applyTimelineNav(prevParams, patch = {}) {
  const next = new URLSearchParams(prevParams);
  const current = parseTimelineSearch(prevParams);

  const level = patch.level ?? current.level;
  const year =
    patch.year !== undefined ? patch.year : current.year;
  const month =
    patch.month !== undefined ? patch.month : current.month;

  if (level === "years") next.delete("level");
  else next.set("level", level);

  if (year) next.set("year", year);
  else next.delete("year");

  if (month) next.set("month", month);
  else next.delete("month");

  if (current.person) next.set("person", current.person);
  else next.delete("person");

  return next;
}

export function clearTimelinePerson(prevParams) {
  const next = new URLSearchParams(prevParams);
  next.delete("person");
  return next;
}
