export const ENTITY_TYPES = {
  person: { label: "Человек", icon: "person" },
  pet: { label: "Питомец", icon: "pet" },
};

export const RELATION_TYPES = {
  // Крёстные и крестники
  godfather: "Крёстный",
  godmother: "Крёстная",
  godson: "Крёстник",
  goddaughter: "Крёстница",

  // Прямые родственники
  father: "Отец",
  mother: "Мать",
  son: "Сын",
  daughter: "Дочь",
  brother: "Брат",
  sister: "Сестра",
  cousin_m: "Двоюродный брат",
  cousin_f: "Двоюродная сестра",
  nephew: "Племянник",
  niece: "Племянница",
  relative: "Родственник",

  // Друзья и социальный круг
  friend_m: "Друг",
  friend_f: "Подруга",
  classmate: "Одноклассник",
  groupmate: "Одногруппник",
  colleague: "Коллега",
  neighbor: "Сосед",
  acquaintance: "Знакомый",

  // Наставники и воспитатели
  teacher: "Учитель",
  trainer: "Тренер",
  nanny: "Няня / воспитатель",

  // Другое
  pet_owner: "Хозяин питомца",
  other: "Другое",
};

export function getEntityTypeLabel(type) {
  return ENTITY_TYPES[type]?.label || type;
}

export function getRelationTypeLabel(type) {
  return RELATION_TYPES[type] || type;
}

export function getExternalEntityLabel(entity) {
  if (!entity) return "";
  const typeLabel =
    entity.type === "pet" ? " 🐾" : "";
  return `${entity.name || entity.id}${typeLabel}`;
}

export function getExternalEntityInitials(entity) {
  if (!entity?.name) return entity?.type === "pet" ? "🐾" : "?";
  const parts = entity.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function findPersonById(people = [], id) {
  if (id == null || id === "") return null;
  const numId = Number(id);
  if (Number.isNaN(numId)) return null;
  return people.find((p) => Number(p.id) === numId) || null;
}

export function normalizeRelation(relation) {
  if (!relation) return null;

  const explicitKind = relation.targetKind;
  const hasPersonId =
    relation.mainPersonId != null && relation.mainPersonId !== "";
  const hasExternalId =
    relation.mainExternalEntityId != null &&
    String(relation.mainExternalEntityId).trim() !== "";

  let targetKind = explicitKind;
  if (targetKind !== "person" && targetKind !== "external") {
    if (hasExternalId) targetKind = "external";
    else if (hasPersonId) targetKind = "person";
  }

  if (targetKind !== "person" && targetKind !== "external") return null;

  let mainPersonId = null;
  let mainExternalEntityId = null;

  if (targetKind === "person") {
    mainPersonId = hasPersonId ? Number(relation.mainPersonId) : null;
    if (mainPersonId == null || Number.isNaN(mainPersonId)) return null;
  }

  if (targetKind === "external") {
    mainExternalEntityId = hasExternalId
      ? String(relation.mainExternalEntityId).trim()
      : null;
    if (!mainExternalEntityId) return null;
  }

  return {
    id: relation.id || `R${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    targetKind,
    mainPersonId,
    mainExternalEntityId,
    relationType: relation.relationType || "other",
    dates: relation.dates || "",
    notes: relation.notes || "",
  };
}

export function normalizeRelations(relations = []) {
  if (!Array.isArray(relations)) return [];
  return relations.map(normalizeRelation).filter(Boolean);
}

export function collectRelationsForSave(relations = [], pendingRelation = null) {
  const saved = normalizeRelations(relations);
  const pending = normalizeRelation(pendingRelation);
  if (!pending) return saved;

  const alreadyAdded = saved.some(
    (r) =>
      r.targetKind === pending.targetKind &&
      r.mainPersonId === pending.mainPersonId &&
      r.mainExternalEntityId === pending.mainExternalEntityId &&
      r.relationType === pending.relationType,
  );
  return alreadyAdded ? saved : [...saved, pending];
}

/** Объединённый список для Autocomplete на фото: родственники + внешние */
export function buildFaceTagOptions(allPeople = [], allExternal = []) {
  const peopleOptions = allPeople.map((p) => ({
    kind: "person",
    id: p.id,
    label: `${p.id} :: ${[p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") || "Без имени"}`,
    data: p,
  }));

  const externalOptions = allExternal.map((e) => ({
    kind: "external",
    id: e.id,
    label: `${e.id} :: ${getExternalEntityLabel(e)} (справочник)`,
    data: e,
  }));

  return [...peopleOptions, ...externalOptions];
}

export function faceTagOptionFromFace(face, allPeople, allExternal) {
  if (face.personId != null) {
    const p = allPeople.find((x) => x.id === face.personId);
    if (p) {
      return {
        kind: "person",
        id: p.id,
        label: `${p.id} :: ${[p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") || "Без имени"}`,
        data: p,
      };
    }
  }
  if (face.externalEntityId) {
    const e = allExternal.find((x) => x.id === face.externalEntityId);
    if (e) {
      return {
        kind: "external",
        id: e.id,
        label: `${e.id} :: ${getExternalEntityLabel(e)} (справочник)`,
        data: e,
      };
    }
  }
  return null;
}

export function applyFaceTagOption(face, option) {
  if (!option) {
    return { ...face, personId: null, externalEntityId: undefined };
  }
  if (option.kind === "person") {
    return {
      ...face,
      personId: option.id,
      externalEntityId: undefined,
      suggestedPersonId: undefined,
      suggestedExternalEntityId: undefined,
      suggestDistance: undefined,
      skipReview: undefined,
    };
  }
  return {
    ...face,
    personId: null,
    externalEntityId: option.id,
    suggestedPersonId: undefined,
    suggestedExternalEntityId: undefined,
    suggestDistance: undefined,
    skipReview: undefined,
  };
}

export function findExternalById(entities = [], id) {
  if (!id) return null;
  return entities.find((e) => e.id === id) || null;
}

export function splitEventParticipantOptions(selected = []) {
  const participants = [];
  const externalParticipants = [];

  for (const opt of selected) {
    if (opt?.kind === "person" && opt.id != null) {
      participants.push(Number(opt.id));
    } else if (opt?.kind === "external" && opt.id) {
      externalParticipants.push(String(opt.id));
    }
  }

  return { participants, externalParticipants };
}

export function eventParticipantOptionsFromEvent(event, allPeople = [], allExternal = []) {
  if (!event) return [];
  const allOptions = buildFaceTagOptions(allPeople, allExternal);
  const selected = [];

  for (const id of event.participants || []) {
    const opt = allOptions.find(
      (o) => o.kind === "person" && Number(o.id) === Number(id),
    );
    if (opt) selected.push(opt);
  }

  for (const id of event.externalParticipants || []) {
    const opt = allOptions.find((o) => o.kind === "external" && o.id === id);
    if (opt) selected.push(opt);
  }

  return selected;
}
