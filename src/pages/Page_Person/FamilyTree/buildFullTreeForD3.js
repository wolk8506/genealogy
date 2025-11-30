// buildFullTreeForD3.js
import { buildAncestorTree } from "./buildAncestorTree";
import { buildDescendantTree } from "./buildDescendantTree";

/**
 * Возвращает корень выбранного человека с двумя группами children:
 *  - "Родители" содержит ветку предков (если есть)
 *  - "Потомки" содержит ветку потомков (если есть)
 *
 * Это минимально-инвазивный формат: react-d3-tree рендерит children как обычно,
 * но визуально стороны будут разделены.
 */
export function buildFullTreeForD3(personId, people) {
  const me = people.find((p) => p.id === personId);
  if (!me) return null;

  const meNode = {
    name: [me.firstName, me.lastName].filter(Boolean).join(" ") || "Без имени",
    attributes: {
      id: me.id,
      birthday: me.birthday || "",
      gender: me.gender || "",
    },
    children: [],
  };

  // Получаем стандартные структуры (они возвращают узел с children)
  const ancestorsRoot = buildAncestorTree(personId, people);
  const descendantsRoot = buildDescendantTree(personId, people);

  const parentBranchChildren = Array.isArray(ancestorsRoot?.children)
    ? ancestorsRoot.children
    : [];

  const childrenBranchChildren = Array.isArray(descendantsRoot?.children)
    ? descendantsRoot.children
    : [];

  if (parentBranchChildren.length > 0) {
    meNode.children.push({
      name: "Родители",
      attributes: { group: "parents" },
      children: parentBranchChildren,
    });
  }

  if (childrenBranchChildren.length > 0) {
    meNode.children.push({
      name: "Потомки",
      attributes: { group: "children" },
      children: childrenBranchChildren,
    });
  }

  // Если ни родителей, ни потомков — вернуть обычный узел без children
  if (meNode.children.length === 0) {
    delete meNode.children;
  }

  return meNode;
}
