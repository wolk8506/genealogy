// utils/families/familyLabels.js
// Подписи и форматирование для страницы «Семьи».
// Здесь нет React и нет доступа к window — только чистые функции,
// чтобы вывод семей можно было проверять отдельно от UI.

/** Приводит id к строке. Пустые значения → null. */
export const toId = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
};

/** Сравнение id: числовые — как числа, остальные — как строки. */
export function compareIds(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return String(a).localeCompare(String(b), "ru");
}

/** Стабильный порядок id (для детерминированного ключа пары). */
export const sortIds = (ids = []) =>
  [...ids].map(String).sort(compareIds);

/** Девичья фамилия хранится как «(Петрова)» — убираем скобки. */
export function cleanMaiden(name) {
  const value = String(name || "")
    .replace(/[()]/g, "")
    .trim();
  return value || null;
}

/** Полное имя. По умолчанию — без отчества, как в карточках. */
export function personName(person, { patronymic = false } = {}) {
  if (!person) return "Без имени";
  const surname = person.lastName || cleanMaiden(person.maidenName);
  const parts = patronymic
    ? [surname, person.firstName, person.patronymic]
    : [person.firstName, surname];
  const value = parts.filter(Boolean).join(" ").trim();
  return value || "Без имени";
}

/** Имя + фамилия, без отчества. */
export const shortName = (person) => personName(person);

/** Инициалы для аватара. */
export function personInitials(person) {
  if (!person) return "";
  const surname = person.lastName || cleanMaiden(person.maidenName) || "";
  return `${(person.firstName || "").charAt(0)}${surname.charAt(0)}`;
}

/** Год из любой даты: «12.05.1947», «1947», «1947–1949». */
export function yearOf(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

/** «1901–1975», «1901», «† 1975», иначе пустая строка. */
export function formatYears(person) {
  if (!person) return "";
  const born = yearOf(person.birthday);
  const died = yearOf(person.died);
  if (born && died) return `${born}–${died}`;
  if (born) return String(born);
  if (died) return `† ${died}`;
  return "";
}

export function pluralYears(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "год";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "года";
  return "лет";
}

export function pluralChildren(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "ребёнок";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "ребёнка";
  return "детей";
}

/** Возраст на момент смерти или текущий. */
export function ageText(person) {
  const born = yearOf(person?.birthday);
  if (!born) return "";
  const died = yearOf(person?.died);
  const age = (died || new Date().getFullYear()) - born;
  if (age < 0 || age > 130) return "";
  return `${age} ${pluralYears(age)}`;
}

/** Подпись девичьей фамилии: «ур. Петрова» (только если есть основная). */
export function maidenLabel(person) {
  const maiden = cleanMaiden(person?.maidenName);
  if (!maiden) return "";
  if (!person?.lastName) return "";
  return `ур. ${maiden}`;
}

/** «Иванов и Петрова». Фамилии не склоняем намеренно. */
export function unionTitle(family) {
  if (!family) return "Семья";
  const [a, b] = family.partners || [];
  if (a && b) return `${shortName(a)} и ${shortName(b)}`;
  if (a) return shortName(a);
  return "Семья";
}

export const UNION_STATUS = {
  married: { label: "брак", tone: "green" },
  divorced: { label: "развод", tone: "red" },
  separated: { label: "разлука", tone: "orange" },
  widowed: { label: "овдовение", tone: "gray" },
  unknown: null,
};

export function unionStatusMeta(status) {
  // «Овдовение» выводится почти у каждой пары прошлых веков и только шумит.
  // Статус остаётся в модели, но в интерфейсе не показывается.
  if (status === "widowed") return null;
  return UNION_STATUS[status] || null;
}

export function genderLabel(person) {
  if (person?.gender === "male") return "мужчина";
  if (person?.gender === "female") return "женщина";
  return "";
}

/** Строка «1947 · Москва · 3 детей» из заполненных частей. */
export function unionMetaParts(family, { withChildren = true } = {}) {
  const parts = [];
  if (family?.startDate) parts.push(family.startDate);
  if (family?.startPlace) parts.push(family.startPlace);
  if (withChildren && family?.children?.length) {
    parts.push(
      `${family.children.length} ${pluralChildren(family.children.length)}`,
    );
  }
  return parts;
}

export function unionMetaLine(family, options) {
  return unionMetaParts(family, options).join(" · ");
}

/** Дата события → миллисекунды. Нужна для сортировки, не для показа. */
export function dateToMs(value) {
  if (!value) return 0;
  const str = String(value);
  const full = str.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (full) {
    const [, day, month, year] = full;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }
  const year = yearOf(str);
  return year ? new Date(year, 0, 1).getTime() : 0;
}

/** Сортировка по году рождения, без даты — в конец. */
export function compareByBirth(a, b) {
  const ya = yearOf(a?.birthday) || Number.MAX_SAFE_INTEGER;
  const yb = yearOf(b?.birthday) || Number.MAX_SAFE_INTEGER;
  if (ya !== yb) return ya - yb;
  return personName(a).localeCompare(personName(b), "ru");
}
