// utils/families/sortFamilies.js
// Поиск и сортировка семей для каталога.
// Живут отдельно от UI: каталог и тулбар используют одни и те же правила.

import { cleanMaiden } from "./familyLabels";

export const FAMILY_SORT_OPTIONS = [
  { value: "date", label: "По дате брака", short: "По дате" },
  { value: "name", label: "По алфавиту", short: "По алфавиту" },
  { value: "children", label: "По числу детей", short: "По детям" },
];

export function familySortLabel(value) {
  return (
    FAMILY_SORT_OPTIONS.find((option) => option.value === value)?.short ||
    FAMILY_SORT_OPTIONS[0].short
  );
}

/** Строка, по которой ищется семья: имена, девичьи фамилии, место и даты. */
export function familyHaystack(family) {
  const parts = [];

  for (const partner of family.partners || []) {
    parts.push(
      partner.firstName,
      partner.lastName,
      partner.patronymic,
      cleanMaiden(partner.maidenName),
    );
  }

  for (const child of family.children || []) {
    parts.push(child.firstName, child.lastName);
  }

  parts.push(family.startPlace, family.startDate);

  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function filterFamilies(families, query) {
  const needle = String(query || "")
    .trim()
    .toLowerCase();
  if (!needle) return families || [];
  return (families || []).filter((family) =>
    familyHaystack(family).includes(needle),
  );
}

export function sortFamilies(families, sort) {
  const copy = [...(families || [])];

  if (sort === "name") {
    return copy.sort((a, b) => a.sortName.localeCompare(b.sortName, "ru"));
  }

  if (sort === "children") {
    return copy.sort(
      (a, b) =>
        b.childCount - a.childCount ||
        a.sortName.localeCompare(b.sortName, "ru"),
    );
  }

  return copy.sort(
    (a, b) =>
      b.sortDate - a.sortDate || a.sortName.localeCompare(b.sortName, "ru"),
  );
}

export function visibleFamilies(families, query, sort) {
  return sortFamilies(filterFamilies(families, query), sort);
}
