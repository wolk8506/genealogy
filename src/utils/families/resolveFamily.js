// utils/families/resolveFamily.js
// Разбор ключа семьи и поиск союза по ключу или человеку.
//
// Ключ пары: "12-48" (id отсортированы), неполная семья: "p12".

import { shortName, toId, yearOf } from "./familyLabels";

export function parseFamilyKey(key) {
  const raw = String(key || "").trim();
  if (!raw) return { ids: [], isSingle: false };

  if (raw.startsWith("p")) {
    const id = toId(raw.slice(1));
    return { ids: id ? [id] : [], isSingle: true };
  }

  const ids = raw.split("-").map(toId).filter(Boolean);
  return { ids, isSingle: ids.length === 1 };
}

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

/** Ссылка на семью; personId добавляет выбранного человека. */
export function familyPath(familyOrKey, personId) {
  const key =
    typeof familyOrKey === "string" ? familyOrKey : familyOrKey?.key;
  if (!key) return "/families";
  const id = toId(personId);
  return id ? `/families/${key}?person=${id}` : `/families/${key}`;
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
