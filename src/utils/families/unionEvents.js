// utils/families/unionEvents.js
// События союза: брак, развод, разлука.
// Дата и место брака не хранятся отдельно — они берутся из событий людей.

import { dateToMs, sortIds, toId } from "./familyLabels";

export const MARRIAGE_TYPES = [
  "Брак",
  "Гражданский брак",
  "Религиозный брак",
  "Венчание",
  "Венчание супругов в церкви LDS",
];

export const DIVORCE_TYPES = ["Развод"];
export const SEPARATION_TYPES = ["Разлука"];

const MARRIAGE = new Set(MARRIAGE_TYPES);
const DIVORCE = new Set(DIVORCE_TYPES);
const SEPARATION = new Set(SEPARATION_TYPES);
const UNION_TYPES = new Set([...MARRIAGE, ...DIVORCE, ...SEPARATION]);

export const isMarriageEvent = (event) => MARRIAGE.has(event?.type);
export const isDivorceEvent = (event) => DIVORCE.has(event?.type);
export const isSeparationEvent = (event) => SEPARATION.has(event?.type);
export const isUnionEvent = (event) => UNION_TYPES.has(event?.type);

function participantsOf(event) {
  const raw = Array.isArray(event?.participants) ? event.participants : [];
  return raw.map(toId).filter(Boolean);
}

/** Насколько запись «богатая» — чтобы при дубле выбрать лучшую. */
function eventScore(event) {
  let score = 0;
  if (event?.place) score += 2;
  if (event?.notes) score += 2;
  if (event?.description) score += 2;
  if (event?.lat != null && event?.lng != null) score += 2;
  if (event?.photos?.length) score += 1;
  return score;
}

function eventKey(event, ownerId) {
  const participants = sortIds(participantsOf(event)).join(",");
  return [
    event?.type || "",
    event?.date || "",
    event?.place || "",
    participants || `owner:${ownerId}`,
  ].join("|");
}

export function sortEventsByDate(events = []) {
  return [...events].sort((a, b) => {
    const da = dateToMs(a?.date);
    const db = dateToMs(b?.date);
    if (da === db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
}

/**
 * Собирает события союза из событий партнёров.
 * - событие принадлежит паре, если участники пусты (записано у одного из супругов)
 *   либо все указанные участники входят в пару;
 * - дубли (одно событие сохранено у обоих) схлопываются по типу, дате, месту и участникам.
 */
export function collectUnionEvents(partners = []) {
  const people = (partners || []).filter(Boolean);
  if (!people.length) return [];

  const partnerIds = new Set(people.map((person) => toId(person.id)));
  const byKey = new Map();

  for (const person of people) {
    const ownerId = toId(person.id);
    const events = Array.isArray(person.events) ? person.events : [];

    events.forEach((event, index) => {
      if (!event || !isUnionEvent(event)) return;

      const participants = participantsOf(event);
      const belongsToUnion =
        participants.length === 0 ||
        participants.every((id) => partnerIds.has(id));
      if (!belongsToUnion) return;

      const key = eventKey(event, ownerId);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, {
          ...event,
          __owners: [ownerId],
          __order: index,
        });
        return;
      }

      const keepNew = eventScore(event) >= eventScore(existing);
      byKey.set(key, {
        ...(keepNew ? event : existing),
        __owners: [...new Set([...existing.__owners, ownerId])],
        __order: Math.min(existing.__order, index),
      });
    });
  }

  return sortEventsByDate([...byKey.values()]);
}

/** Статус союза по событиям и датам смерти. */
export function deriveUnionStatus(partners = [], events = []) {
  if (events.some(isDivorceEvent)) return "divorced";
  if (events.some(isSeparationEvent)) return "separated";
  if ((partners || []).filter(Boolean).some((person) => person.died)) {
    return "widowed";
  }
  if (events.some(isMarriageEvent)) return "married";
  return "unknown";
}

/** Дата и место начала союза — по самому раннему событию брака. */
export function unionStart(events = []) {
  const marriages = sortEventsByDate(events.filter(isMarriageEvent));
  const first = marriages[0];
  return {
    startDate: first?.date || null,
    startPlace: first?.place || null,
    marriageEvent: first || null,
  };
}

/** Дата окончания — по самому раннему разводу или разлуке. */
export function unionEnd(events = []) {
  const endings = sortEventsByDate(
    events.filter((event) => isDivorceEvent(event) || isSeparationEvent(event)),
  );
  const first = endings[0];
  return {
    endDate: first?.date || null,
    endPlace: first?.place || null,
    endEvent: first || null,
  };
}
