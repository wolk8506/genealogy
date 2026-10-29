// utils/families/buildFamilyViews.js
// Единственное место, где люди превращаются в семьи.
// Семья — вычисляемая модель: в JSON ничего не хранится.
//
// Источники союза:
//   1. person.spouse[]          — связь супругов;
//   2. общий ребёнок            — father + mother;
//   3. событие брака            — ровно два участника-персоны.
//
// Дети распределяются консервативно: ребёнок попадает в основной блок союза
// только если у него указаны оба родителя и это ровно партнёры союза.

import {
  compareByBirth,
  compareIds,
  dateToMs,
  shortName,
  sortIds,
  toId,
} from "./familyLabels";
import {
  collectUnionEvents,
  deriveUnionStatus,
  MARRIAGE_TYPES,
  unionEnd,
  unionStart,
} from "./unionEvents";

// Событие брака как третий источник союза. Можно выключить одной константой,
// если в данных окажутся «браки», которые на самом деле не союз.
export const INCLUDE_EVENT_UNIONS = true;

function pushToMap(map, key, value) {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

/** Мужчина слева, женщина справа; при неопределённости — по id. */
function orderPartners(partners) {
  const sorted = [...partners].sort((a, b) =>
    compareIds(toId(a.id), toId(b.id)),
  );
  if (sorted.length < 2) return sorted;

  const male = sorted.find((person) => person.gender === "male");
  const female = sorted.find((person) => person.gender === "female");
  if (male && female) return [male, female];
  return sorted;
}

function makeFamily({
  key,
  partnerIds,
  partners,
  children,
  outsideChildren,
  unionEvents,
  isSingle,
  sources,
}) {
  const status = isSingle ? "unknown" : deriveUnionStatus(partners, unionEvents);
  const { startDate, startPlace, marriageEvent } = isSingle
    ? { startDate: null, startPlace: null, marriageEvent: null }
    : unionStart(unionEvents);
  const { endDate, endPlace, endEvent } = isSingle
    ? { endDate: null, endPlace: null, endEvent: null }
    : unionEnd(unionEvents);

  return {
    key,
    partnerIds,
    partners,
    children,
    outsideChildren,
    unionEvents,
    status,
    startDate,
    startPlace,
    endDate,
    endPlace,
    marriageEvent,
    endEvent,
    isSingle,
    sources,
    childCount: children.length,
    displayName: partners.map(shortName).join(" и ") || "Семья",
    sortDate:
      dateToMs(startDate) ||
      dateToMs(children[0]?.birthday) ||
      dateToMs(partners[0]?.birthday) ||
      0,
    sortName: partners.map(shortName).join(" ").toLowerCase(),
  };
}

/**
 * @param {Array} people — массив людей из genealogy-data.json
 * @returns {{ families: Array, byPerson: Map<string, Array>, byId: Map<string, object>, childrenOf: Map<string, Array> }}
 */
export function buildFamilyViews(people = []) {
  const list = (Array.isArray(people) ? people : []).filter(
    (person) => person && toId(person.id),
  );
  const byId = new Map(list.map((person) => [toId(person.id), person]));

  // --- 1. Кандидаты в пары ------------------------------------------------
  const pairs = new Map(); // "12-48" -> { key, ids, sources:Set }

  const addPair = (a, b, source) => {
    const idA = toId(a);
    const idB = toId(b);
    if (!idA || !idB || idA === idB) return;
    if (!byId.has(idA) || !byId.has(idB)) return;

    const ids = sortIds([idA, idB]);
    const key = ids.join("-");

    let record = pairs.get(key);
    if (!record) {
      record = { key, ids, sources: new Set() };
      pairs.set(key, record);
    }
    record.sources.add(source);
  };

  for (const person of list) {
    const spouses = Array.isArray(person.spouse) ? person.spouse : [];
    for (const spouseId of spouses) addPair(person.id, spouseId, "spouse");
  }

  for (const person of list) {
    const father = toId(person.father);
    const mother = toId(person.mother);
    if (father && mother && father !== mother) {
      addPair(father, mother, "children");
    }
  }

  if (INCLUDE_EVENT_UNIONS) {
    for (const person of list) {
      const events = Array.isArray(person.events) ? person.events : [];
      for (const event of events) {
        if (!event || !MARRIAGE_TYPES.includes(event.type)) continue;
        const participants = (event.participants || [])
          .map(toId)
          .filter((id) => id && byId.has(id));
        if (participants.length === 2) {
          addPair(participants[0], participants[1], "event");
        }
      }
    }
  }

  // --- 2. Распределение детей --------------------------------------------
  const pairChildren = new Map(); // "12-48" -> Person[]
  const soloChildren = new Map(); // "12"     -> Person[]
  const childrenOf = new Map(); // "12"        -> Person[] (для правой панели)

  for (const child of list) {
    const father = toId(child.father);
    const mother = toId(child.mother);

    if (father && byId.has(father)) pushToMap(childrenOf, father, child);
    if (mother && mother !== father && byId.has(mother)) {
      pushToMap(childrenOf, mother, child);
    }

    if (father && mother && father !== mother) {
      const key = sortIds([father, mother]).join("-");
      if (pairs.has(key)) {
        pushToMap(pairChildren, key, child);
      } else if (byId.has(father)) {
        // Второй родитель указан, но человека нет в базе — считаем неполной семьёй.
        pushToMap(soloChildren, father, child);
      } else if (byId.has(mother)) {
        pushToMap(soloChildren, mother, child);
      }
    } else if (father || mother) {
      const known = father || mother;
      if (byId.has(known)) pushToMap(soloChildren, known, child);
    }
  }

  // --- 3. Союзы -----------------------------------------------------------
  const families = [];
  const pairedPeople = new Set();

  for (const record of pairs.values()) {
    const partners = orderPartners(
      record.ids.map((id) => byId.get(id)).filter(Boolean),
    );
    if (!partners.length) continue;

    record.ids.forEach((id) => pairedPeople.add(id));

    const children = (pairChildren.get(record.key) || [])
      .slice()
      .sort(compareByBirth);

    // Дети, у которых известен только один родитель из этой пары.
    const outsideChildren = [];
    const seen = new Set();
    for (const partnerId of record.ids) {
      for (const child of soloChildren.get(partnerId) || []) {
        const childId = toId(child.id);
        if (seen.has(childId)) continue;
        seen.add(childId);
        outsideChildren.push({ person: child, knownParentId: partnerId });
      }
    }
    outsideChildren.sort((a, b) => compareByBirth(a.person, b.person));

    const unionEvents = collectUnionEvents(partners);

    families.push(
      makeFamily({
        key: record.key,
        partnerIds: record.ids,
        partners,
        children,
        outsideChildren,
        unionEvents,
        isSingle: false,
        sources: [...record.sources],
      }),
    );
  }

  // --- 4. Неполные семьи --------------------------------------------------
  // Отдельная карточка — только если у человека вообще нет союзов.
  // Иначе его «одиночные» дети показываются строкой «вне союза» в каждом союзе.
  for (const person of list) {
    const personId = toId(person.id);
    if (pairedPeople.has(personId)) continue;

    const children = (soloChildren.get(personId) || [])
      .slice()
      .sort(compareByBirth);
    if (!children.length) continue;

    families.push(
      makeFamily({
        key: `p${personId}`,
        partnerIds: [personId],
        partners: [person],
        children,
        outsideChildren: [],
        unionEvents: [],
        isSingle: true,
        sources: ["children"],
      }),
    );
  }

  // --- 5. Индексы ---------------------------------------------------------
  families.sort(
    (a, b) =>
      b.sortDate - a.sortDate || a.sortName.localeCompare(b.sortName, "ru"),
  );

  const byPerson = new Map();
  for (const family of families) {
    for (const partnerId of family.partnerIds) {
      pushToMap(byPerson, partnerId, family);
    }
  }
  for (const bucket of byPerson.values()) {
    bucket.sort(
      (a, b) =>
        b.sortDate - a.sortDate || a.sortName.localeCompare(b.sortName, "ru"),
    );
  }

  for (const bucket of childrenOf.values()) {
    bucket.sort(compareByBirth);
  }

  return { families, byPerson, byId, childrenOf };
}

export function familyKeyForIds(ids = []) {
  return sortIds(ids.filter(Boolean)).join("-");
}

export function familyKeyForPerson(personId) {
  return `p${toId(personId)}`;
}
