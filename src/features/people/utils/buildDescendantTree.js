export function buildDescendantTree(personId, people, visited = new Set()) {
  if (visited.has(personId)) {
    console.warn(`🔁 Цикл обнаружен: ${personId}`);
    return null;
  }

  const person = people.find((p) => p.id === personId);
  if (!person) {
    console.warn(`❌ Не найден человек с id=${personId}`);
    return null;
  }

  visited.add(personId);

  const children = (person.children || [])
    .map((childId) => buildDescendantTree(childId, people, new Set(visited)))
    .filter(Boolean);

  return {
    name:
      [person.firstName, person.lastName].filter(Boolean).join(" ") ||
      "Без имени",
    attributes: {
      id: person.id,
      birthday: person.birthday || "",
      gender: person.gender || "", // 👈 добавляем
    },
    children: children.length > 0 ? children : undefined,
  };
}
