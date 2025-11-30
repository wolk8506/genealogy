export function buildAncestorTree(personId, people, visited = new Set()) {
  if (visited.has(personId)) {
    console.warn(`🔁 Цикл в предках: ${personId}`);
    return null;
  }

  const person = people.find((p) => p.id === personId);
  if (!person) return null;

  const newVisited = new Set(visited);
  newVisited.add(personId);

  const parents = [person.father, person.mother]
    .filter(Boolean)
    .map((parentId) => buildAncestorTree(parentId, people, newVisited))
    .filter(Boolean);

  return {
    name:
      [person.firstName, person.lastName].filter(Boolean).join(" ") ||
      "Без имени",
    attributes: {
      id: person.id,
      birthday: person.birthday || "",
      gender: person.gender || "",
    },
    children: parents.length > 0 ? parents : undefined, // 👈 переворачиваем вверх
  };
}
