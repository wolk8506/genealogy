/**
 * Возвращает массив семей для текущего человека
 * - учитывает разные типы id (string/number)
 * - учитывает случаи, когда дети указаны только у одного из родителей
 * - логирует диагностическую информацию в консоль
 *
 * person: текущая персона
 * allPeople: массив всех персон
 * options: { spouseField?: 'spouses'|'spouse', childrenField?: 'children' } - при необходимости переопределить имена полей
 */
export function buildFamiliesForPerson(person, allPeople, options = {}) {
  if (!person) return [];

  const spouseField =
    options.spouseField ||
    (person.spouses ? "spouses" : person.spouse ? "spouse" : "spouses");
  const childrenField = options.childrenField || "children";

  // Нормализатор id: приводим к строке для сравнения
  const toKey = (v) => (v === null || v === undefined ? v : String(v));

  const byId = new Map(allPeople.map((p) => [toKey(p.id), p]));

  const personChildrenIds = new Set(
    (Array.isArray(person[childrenField]) ? person[childrenField] : []).map(
      toKey
    )
  );

  const spousesRaw = Array.isArray(person[spouseField])
    ? person[spouseField]
    : person[spouseField]
    ? [person[spouseField]]
    : [];
  const spouses = spousesRaw.map(toKey).filter(Boolean);

  const families = spouses.map((partnerKey) => {
    const partner = byId.get(partnerKey) || null;

    // Собираем кандидатов: дети текущего и дети партнёра (если есть)
    const partnerChildrenIds = new Set(
      (partner && Array.isArray(partner[childrenField])
        ? partner[childrenField]
        : []
      ).map(toKey)
    );

    const candidateIds = new Set([...personChildrenIds, ...partnerChildrenIds]);

    // Также добавим всех людей, у которых father/mother равны person.id или partnerId
    allPeople.forEach((ch) => {
      const chKey = toKey(ch.id);
      const fatherKey = toKey(ch.father);
      const motherKey = toKey(ch.mother);
      if (fatherKey === toKey(person.id) && motherKey === partnerKey)
        candidateIds.add(chKey);
      if (fatherKey === partnerKey && motherKey === toKey(person.id))
        candidateIds.add(chKey);
      // если один из родителей совпадает и другой не указан — добавим в кандидаты, но пометим как потенциального
      if (
        (fatherKey === toKey(person.id) && !motherKey) ||
        (motherKey === toKey(person.id) && !fatherKey)
      )
        candidateIds.add(chKey);
      if (
        (fatherKey === partnerKey && !motherKey) ||
        (motherKey === partnerKey && !fatherKey)
      )
        candidateIds.add(chKey);
    });

    // Фильтрация: считаем общими детьми те, у кого явно указаны оба родителя (в любом порядке),
    // либо те, кто присутствует в children обоих родителей, либо те, у кого один родитель указан и второй совпадает с партнёром/person
    const commonChildrenIds = Array.from(candidateIds).filter((childKey) => {
      const child = byId.get(childKey);
      if (!child) return false;

      const fatherKey = toKey(child.father);
      const motherKey = toKey(child.mother);
      const personKey = toKey(person.id);

      // Явно оба родителя указаны и совпадают с парой
      if (fatherKey && motherKey) {
        const pairMatch =
          (fatherKey === personKey && motherKey === partnerKey) ||
          (fatherKey === partnerKey && motherKey === personKey);
        if (pairMatch) return true;
      }

      // Если ребёнок указан в children у обоих родителей
      const inPersonChildren =
        Array.isArray(person[childrenField]) &&
        person[childrenField].map(toKey).includes(childKey);
      const inPartnerChildren =
        partner &&
        Array.isArray(partner[childrenField]) &&
        partner[childrenField].map(toKey).includes(childKey);
      if (inPersonChildren && inPartnerChildren) return true;

      // Если один из родителей указан у ребёнка и это совпадает с парой — допускаем (на случай неполных данных)
      if (
        (fatherKey === personKey && motherKey === partnerKey) ||
        (fatherKey === partnerKey && motherKey === personKey)
      )
        return true;
      if (
        (fatherKey === personKey && !motherKey && inPartnerChildren) ||
        (motherKey === personKey && !fatherKey && inPartnerChildren)
      )
        return true;
      if (
        (fatherKey === partnerKey && !motherKey && inPersonChildren) ||
        (motherKey === partnerKey && !fatherKey && inPersonChildren)
      )
        return true;

      return false;
    });

    const uniqueChildrenIds = Array.from(new Set(commonChildrenIds)).filter(
      Boolean
    );

    return {
      partnerId: partnerKey,
      partner,
      childrenIds: uniqueChildrenIds,
      children: uniqueChildrenIds.map((id) => byId.get(id)).filter(Boolean),
    };
  });
  return families;
}
