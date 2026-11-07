// utils/families/resolveFamily.js
// Разбор ключа семьи и поиск союза по ключу или человеку.
//
// Ключ пары: "12-48" (id отсортированы), неполная семья: "p12".

import { shortName, toId, yearOf } from "./familyLabels";

export function findFamily(families, key) {
  const target = String(key || "");
  if (!target) return null;
  return (families || []).find((family) => family.key === target) || null;
}

export function familiesForPerson(byPerson, personId) {
  const id = toId(personId);
  if (!id) return [];
  return byPerson?.get(id) || [];
}

/** Союз человека: первый по дате, иначе неполная семья, иначе null. */
export function resolveFamilyForPerson(families, byPerson, personId) {
  const list = familiesForPerson(byPerson, personId);
  if (list.length) return list[0];

  const id = toId(personId);
  if (!id) return null;
  return (
    (families || []).find((family) => family.partnerIds.includes(id)) || null
  );
}

/**
 * Союзы опорного человека для переключателя в хедере.
 * Опорный — тот из пары, у кого больше одного союза.
 * Метка каждого союза строится относительно опорного: «1947 · Петрова».
 */
export function buildUnionOptions(family, byPerson) {
  if (!family || family.isSingle) return { anchorId: null, options: [] };

  const listFor = (personId) => byPerson?.get?.(toId(personId)) || [];
  const anchorId =
    family.partnerIds.find((id) => listFor(id).length > 1) ||
    family.partnerIds[0] ||
    null;
  const pool = listFor(anchorId);

  if (pool.length < 2) return { anchorId, options: [] };

  const options = pool.map((union) => {
    const other = (union.partners || []).find(
      (person) => toId(person.id) !== toId(anchorId),
    );
    const year = yearOf(union.startDate);
    const label = [year, other ? shortName(other) : null]
      .filter(Boolean)
      .join(" · ");

    return {
      key: union.key,
      label: label || union.displayName || "Союз",
    };
  });

  return { anchorId, options };
}
