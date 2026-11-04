// pages/Page_GenealogyTree/treeModel.js
// Модель генеалогического дерева: граф родственников и раскладки.
// Люди — узлы, пары — соединительные линии, дети привязываются к паре.
// Раскладки возвращают только координаты и связи по id; рендер живёт отдельно.

export const CARD_W = 196;
export const CARD_H = 60;
export const COUPLE_GAP = 18;
export const GROUP_GAP = 64;
export const LEVEL_STEP = 148;
const FAN_RING = 220;
const FAN_INNER = 118;
const RADIAL_RING = 260;
const RADIAL_SPOUSE_STEP = 132;
const RADIAL_NODE_RADIUS = 26;
const RADIAL_ROOT_RADIUS = 40;

const idOf = (value) => {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
};

// Узел дерева — не человек, а его появление в конкретной ветке. Один человек
// может встретиться несколько раз (например, супруг двух братьев), поэтому
// каждому узлу нужен собственный ключ: по нему рисуются связи и React-список.
let layoutKeySeq = 0;
const makeNodeKey = (personId) => `${idOf(personId)}~${layoutKeySeq++}`;

/**
 * Строит индексированный граф по людям из хранилища.
 * Архивированные и отсутствующие родственники игнорируются.
 */
export function buildFamilyGraph(allPeople = []) {
  const people = (allPeople || []).filter((p) => p && !p.archived);
  const byId = new Map(people.map((p) => [String(p.id), p]));

  const parentIndex = new Map(); // ребёнок -> родители
  const childIndex = new Map(); // родитель -> дети
  const explicitSpouses = new Map();
  const explicitSiblings = new Map();

  const add = (map, key, value) => {
    const id = idOf(key);
    const rel = idOf(value);
    if (!id || !rel || !byId.has(rel)) return;
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(rel);
  };

  people.forEach((person) => {
    const pid = String(person.id);
    if (!parentIndex.has(pid)) parentIndex.set(pid, new Set());
    if (!childIndex.has(pid)) childIndex.set(pid, new Set());

    if (person.father != null) {
      add(parentIndex, pid, person.father);
      add(childIndex, person.father, pid);
    }
    if (person.mother != null) {
      add(parentIndex, pid, person.mother);
      add(childIndex, person.mother, pid);
    }

    (Array.isArray(person.children) ? person.children : []).forEach((childId) => {
      add(parentIndex, childId, pid);
      add(childIndex, pid, childId);
    });

    (Array.isArray(person.spouse) ? person.spouse : []).forEach((spouseId) => {
      add(explicitSpouses, pid, spouseId);
      add(explicitSpouses, spouseId, pid);
    });

    (Array.isArray(person.siblings) ? person.siblings : []).forEach((siblingId) => {
      add(explicitSiblings, pid, siblingId);
      add(explicitSiblings, siblingId, pid);
    });
  });

  const parentsOf = (id) =>
    Array.from(parentIndex.get(String(id)) || []).filter((pid) => byId.has(pid));

  const childrenOf = (id) =>
    Array.from(childIndex.get(String(id)) || []).filter((cid) => byId.has(cid));

  const spousesOf = (id) => {
    const key = String(id);
    const result = new Set(explicitSpouses.get(key) || []);
    // Общие дети тоже делают людей партнёрами, даже если spouse не заполнен.
    childrenOf(key).forEach((childId) => {
      parentsOf(childId).forEach((parentId) => {
        if (parentId !== key) result.add(parentId);
      });
    });
    result.delete(key);
    return Array.from(result).filter((sid) => byId.has(sid));
  };

  const siblingsOf = (id) => {
    const key = String(id);
    const result = new Set(explicitSiblings.get(key) || []);
    parentsOf(key).forEach((parentId) => {
      childrenOf(parentId).forEach((siblingId) => {
        if (siblingId !== key) result.add(siblingId);
      });
    });
    result.delete(key);
    return Array.from(result).filter((sid) => byId.has(sid));
  };

  const childrenOfPair = (a, b) => {
    const first = idOf(a);
    const second = idOf(b);
    if (!first || !second) return [];
    return childrenOf(first).filter((childId) =>
      parentsOf(childId).includes(second),
    );
  };

  return {
    people,
    byId,
    parentsOf,
    childrenOf,
    spousesOf,
    siblingsOf,
    childrenOfPair,
  };
}

/** Все предки и потомки выбранного человека плюс их супруги — для подсветки. */
export function collectPathIds(graph, personId) {
  const start = idOf(personId);
  if (!graph || !start || !graph.byId.has(start)) return new Set();

  const set = new Set([start]);
  const up = [start];
  while (up.length) {
    const current = up.pop();
    graph.parentsOf(current).forEach((id) => {
      if (set.has(id)) return;
      set.add(id);
      up.push(id);
    });
  }

  const down = [start];
  while (down.length) {
    const current = down.pop();
    graph.childrenOf(current).forEach((id) => {
      if (set.has(id)) return;
      set.add(id);
      down.push(id);
    });
  }

  // Супруги на пути не должны «гаснуть» рядом с подсвеченным человеком.
  Array.from(set).forEach((id) => {
    graph.spousesOf(id).forEach((spouseId) => set.add(spouseId));
  });

  return set;
}

function cardBounds(nodes) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.x - CARD_W / 2);
    maxX = Math.max(maxX, node.x + CARD_W / 2);
    minY = Math.min(minY, node.y - CARD_H / 2);
    maxY = Math.max(maxY, node.y + CARD_H / 2);
  });

  return { minX, maxX, minY, maxY };
}

function shiftBlock(block, dx, dy) {
  if (!block) return null;
  return {
    ...block,
    nodes: block.nodes.map((node) => ({
      ...node,
      x: node.x + dx,
      y: node.y + dy,
    })),
    anchorX: block.anchorX + dx,
    anchorY: block.anchorY + dy,
  };
}

/**
 * Человек в центре, супруги — по сторонам. Так пары остаются соседними,
 * а линии детей не начинаются поверх чужих карточек.
 */
function orderFamilyRow(personId, spouseIds) {
  const left = [];
  const right = [];
  spouseIds.forEach((spouseId, index) => {
    if (index % 2 === 0) right.push(spouseId);
    else left.push(spouseId);
  });
  return [...left.reverse(), personId, ...right];
}

function finishBlock(nodes, links, couples, anchorKey) {
  if (!nodes.length) return null;

  const { minX, minY } = cardBounds(nodes);
  const shiftedNodes = nodes.map((node) => ({
    ...node,
    x: node.x - minX,
    y: node.y - minY,
  }));

  const anchor = shiftedNodes.find((node) => node.key === anchorKey);
  const bounds = cardBounds(shiftedNodes);

  return {
    nodes: shiftedNodes,
    links,
    couples,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    minX: 0,
    minY: 0,
    anchorX: anchor ? anchor.x : 0,
    anchorY: anchor ? anchor.y : 0,
    anchorKey,
    anchorId: anchor ? anchor.id : null,
  };
}

/**
 * Дерево потомков: человек сверху, все супруги рядом, дети — под своей парой.
 */
function buildDescendantBlock(personId, level, ctx) {
  const id = String(personId);
  const person = ctx.graph.byId.get(id);
  if (!person || ctx.seen.has(id)) return null;

  ctx.seen.add(id);

  const spouses = ctx.graph.spousesOf(id);
  spouses.forEach((spouseId) => ctx.seen.add(spouseId));
  const rowIds = orderFamilyRow(id, spouses);

  // Дети группируются по второму родителю, чтобы линия шла от конкретной пары.
  const groups = new Map();
  ctx.graph.childrenOf(id).forEach((childId) => {
    if (ctx.seen.has(childId)) return;
    const parents = ctx.graph.parentsOf(childId);
    const other = parents.find((parentId) => parentId !== id);
    const partner = other && spouses.includes(other) ? other : null;
    const key = partner || "single";
    if (!groups.has(key)) groups.set(key, { partnerId: partner, kids: [] });
    groups.get(key).kids.push(childId);
  });

  const groupBlocks = [];
  groups.forEach((group) => {
    const childBlocks = [];
    group.kids.forEach((childId) => {
      const block = buildDescendantBlock(childId, level + 1, ctx);
      if (block) childBlocks.push(block);
    });
    if (!childBlocks.length) return;

    let cursor = 0;
    const placed = [];
    childBlocks.forEach((block) => {
      placed.push(shiftBlock(block, cursor, 0));
      cursor += block.width + GROUP_GAP;
    });

    groupBlocks.push({
      partnerId: group.partnerId,
      blocks: placed,
      width: Math.max(0, cursor - GROUP_GAP),
    });
  });

  // Группы детей выстраиваются слева направо по позиции своей пары в ряду,
  // иначе связи супругов с общими детьми ложатся крест-накрест.
  const rowIndex = new Map(rowIds.map((rowId, index) => [rowId, index]));
  const groupOrder = (group) =>
    rowIndex.get(group.partnerId || id) ?? rowIds.length;
  groupBlocks.sort((a, b) => groupOrder(a) - groupOrder(b));

  const rowWidth =
    rowIds.length * CARD_W + Math.max(0, rowIds.length - 1) * COUPLE_GAP;
  const groupsWidth = groupBlocks.reduce(
    (sum, group) => sum + group.width,
    0,
  ) + Math.max(0, groupBlocks.length - 1) * GROUP_GAP;
  const width = Math.max(rowWidth, groupsWidth);

  const rowStart = groupsWidth > rowWidth ? (groupsWidth - rowWidth) / 2 : 0;
  const groupsStart = rowWidth >= groupsWidth ? (rowWidth - groupsWidth) / 2 : 0;

  const rowKeys = new Map();
  const nodes = rowIds.map((rowId, index) => {
    const key = makeNodeKey(rowId);
    rowKeys.set(rowId, key);
    return {
      key,
      id: rowId,
      person: ctx.graph.byId.get(rowId),
      x: rowStart + CARD_W / 2 + index * (CARD_W + COUPLE_GAP),
      y: 0,
      level,
    };
  });

  const links = [];
  const couples = rowIds
    .filter((rowId) => rowId !== id)
    .map((spouseId) => ({ a: rowKeys.get(id), b: rowKeys.get(spouseId) }));

  let cursor = groupsStart;
  groupBlocks.forEach((group) => {
    const from = group.partnerId
      ? [rowKeys.get(id), rowKeys.get(group.partnerId)]
      : [rowKeys.get(id)];
    group.blocks.forEach((block) => {
      const dy = LEVEL_STEP - block.anchorY;
      const shifted = shiftBlock(block, cursor, dy);
      nodes.push(...shifted.nodes);
      links.push(...shifted.links);
      couples.push(...shifted.couples);
      links.push({ from, to: shifted.anchorKey });
    });
    cursor += group.width + GROUP_GAP;
  });

  return finishBlock(nodes, links, couples, rowKeys.get(id));
}

/**
 * Дерево предков: человек снизу, родители и их предки — выше.
 */
function buildAncestorBlock(personId, level, ctx, includeSpouses = false) {
  const id = String(personId);
  const person = ctx.graph.byId.get(id);
  if (!person || ctx.seen.has(id)) return null;

  ctx.seen.add(id);

  const spouses = includeSpouses ? ctx.graph.spousesOf(id) : [];
  spouses.forEach((spouseId) => ctx.seen.add(spouseId));

  const orderedRow = orderFamilyRow(id, spouses);
  const rowKeys = new Map();
  const nodes = orderedRow.map((rowId, index) => {
    const key = makeNodeKey(rowId);
    rowKeys.set(rowId, key);
    return {
      key,
      id: rowId,
      person: ctx.graph.byId.get(rowId),
      x: index * (CARD_W + COUPLE_GAP),
      y: 0,
      level,
    };
  });
  const nodeKey = rowKeys.get(id);
  const couples = orderedRow
    .filter((rowId) => rowId !== id)
    .map((spouseId) => ({ a: nodeKey, b: rowKeys.get(spouseId) }));

  const parentIds = ctx.graph
    .parentsOf(id)
    .filter((parentId) => !ctx.seen.has(parentId));

  const parentBlocks = parentIds
    .map((parentId) => buildAncestorBlock(parentId, level - 1, ctx, false))
    .filter(Boolean);

  const links = [];

  if (parentBlocks.length) {
    // Родители — пара, поэтому их блоки ставятся вплотную, как супруги в
    // дереве потомков. С широким интервалом между ветвями они перестают
    // выглядеть парой, и связь к ребёнку идёт длинной вертикалью.
    const parentGap = parentBlocks.length === 2 ? COUPLE_GAP : GROUP_GAP;

    let placeCursor = 0;
    const placed = parentBlocks.map((block) => {
      const shifted = shiftBlock(block, placeCursor, 0);
      placeCursor += block.width + parentGap;
      return shifted;
    });

    const pairX =
      placed.reduce((sum, block) => sum + block.anchorX, 0) / placed.length;

    const finalParentKeys = [];
    placed.forEach((block) => {
      const shifted = shiftBlock(block, -pairX, 0);
      const dy = -LEVEL_STEP - shifted.anchorY;
      const finalBlock = shiftBlock(shifted, 0, dy);
      nodes.push(...finalBlock.nodes);
      links.push(...finalBlock.links);
      couples.push(...finalBlock.couples);
      finalParentKeys.push(finalBlock.anchorKey);
    });

    links.push({ from: finalParentKeys, to: nodeKey });
    if (finalParentKeys.length === 2) {
      couples.push({ a: finalParentKeys[0], b: finalParentKeys[1] });
    }
  }

  return finishBlock(nodes, links, couples, nodeKey);
}

/**
 * Полное дерево: предки сверху, потомки снизу, братья и сёстры — на уровне
 * выбранного человека. Супруги показываются у всех, у кого они есть.
 */
function buildFullBlock(graph, rootId) {
  const root = String(rootId);

  const descCtx = { graph, seen: new Set() };
  const desc = buildDescendantBlock(root, 0, descCtx);
  if (!desc) return null;

  const ancCtx = { graph, seen: new Set() };
  const anc = buildAncestorBlock(root, 0, ancCtx, false);

  let nodes = [...desc.nodes];
  let links = [...desc.links];
  let couples = [...desc.couples];
  const rootKey = desc.anchorKey;

  if (anc) {
    const shifted = shiftBlock(
      anc,
      desc.anchorX - anc.anchorX,
      desc.anchorY - anc.anchorY,
    );
    // Корень уже есть в блоке потомков: узел предков — его клон, поэтому
    // заменяем ключ и не добавляем вторую карточку.
    const remap = (key) =>
      key === shifted.anchorKey ? rootKey : key;

    shifted.nodes.forEach((node) => {
      if (node.key !== shifted.anchorKey) nodes.push(node);
    });
    shifted.links.forEach((link) => {
      links.push({
        ...link,
        from: link.from.map(remap),
        to: remap(link.to),
      });
    });
    shifted.couples.forEach((couple) => {
      couples.push({
        a: remap(couple.a),
        b: remap(couple.b),
      });
    });
  }

  // Братья и сёстры — только на уровне выбранного человека.
  const existingIds = new Set(nodes.map((node) => node.id));
  const siblings = graph
    .siblingsOf(root)
    .filter((siblingId) => !existingIds.has(siblingId));

  if (siblings.length) {
    const rootNode = nodes.find((node) => node.key === rootKey);
    const rowNodes = nodes.filter(
      (node) => node.level === 0 && Math.abs(node.y - rootNode.y) < 1,
    );
    const rightmost = Math.max(...rowNodes.map((node) => node.x));

    const keyByPerson = new Map();
    nodes.forEach((node) => {
      if (!keyByPerson.has(node.id)) keyByPerson.set(node.id, node.key);
    });
    const parentKeys = graph
      .parentsOf(root)
      .map((parentId) => keyByPerson.get(parentId))
      .filter(Boolean);

    let x = rightmost + CARD_W + GROUP_GAP;
    const siblingKeys = [];
    siblings.forEach((siblingId) => {
      const key = makeNodeKey(siblingId);
      nodes.push({
        key,
        id: siblingId,
        person: graph.byId.get(siblingId),
        x,
        y: rootNode.y,
        level: 0,
      });
      siblingKeys.push(key);
      x += CARD_W + GROUP_GAP;
    });

    // Братья и сёстры подключаются теми же изогнутыми связями от пары
    // родителей, что и остальные дети. Без видимых родителей связей нет.
    if (parentKeys.length) {
      siblingKeys.forEach((key) => links.push({ from: parentKeys, to: key }));
    }
  }

  return finishBlock(nodes, links, couples, rootKey);
}

/**
 * Радиальная раскладка — экспериментальная. Потомки расходятся кольцами,
 * каждому поддереву достаётся свой сектор, поэтому ветви не пересекаются.
 * Супруги рисуются компактными кружками рядом со своим человеком.
 */
function buildRadialBlock(graph, rootId) {
  const root = String(rootId);
  const desc = buildDescendantBlock(root, 0, {
    graph,
    seen: new Set(),
  });
  if (!desc) return null;

  const nodeByKey = new Map(desc.nodes.map((node) => [node.key, node]));
  const childrenMap = new Map();
  const rootKey = desc.anchorKey;

  desc.links.forEach((link) => {
    const parent = link.from[0];
    const child = link.to;
    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
    childrenMap.get(parent).push(child);
  });

  const weightMemo = new Map();
  const weightOf = (key) => {
    if (weightMemo.has(key)) return weightMemo.get(key);
    const kids = (childrenMap.get(key) || []).filter((kid) =>
      nodeByKey.has(kid),
    );
    const weight =
      1 + kids.reduce((sum, kid) => sum + weightOf(kid), 0);
    weightMemo.set(key, weight);
    return weight;
  };

  const positions = new Map();
  const positionNode = (key, position) => {
    positions.set(key, position);
  };

  positionNode(rootKey, { x: 0, y: 0, angle: 0 });

  // Полукруг: дерево растёт вверх от выбранного человека. Так оно вдвое
  // компактнее по высоте и целиком влезает в широкий экран.
  const levelCounts = new Map();
  desc.nodes.forEach((node) => {
    const level = Math.max(node.level, 1);
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
  });

  const radiusByLevel = new Map();
  const maxLevel = Math.max(0, ...Array.from(levelCounts.keys()));
  let previousRadius = 0;
  for (let level = 1; level <= maxLevel; level += 1) {
    const count = levelCounts.get(level) || 1;
    const needed = (count * 122) / Math.PI;
    const radius = Math.max(level * RADIAL_RING, needed, previousRadius + 170);
    radiusByLevel.set(level, radius);
    previousRadius = radius;
  }

  const radiusFor = (level) =>
    radiusByLevel.get(Math.max(level, 1)) ||
    Math.max(level, 1) * RADIAL_RING;

  const placeChildren = (key, a0, a1) => {
    const kids = (childrenMap.get(key) || []).filter((kid) =>
      nodeByKey.has(kid),
    );
    if (!kids.length) return;

    const total = kids.reduce((sum, kid) => sum + weightOf(kid), 0) || 1;
    let cursor = a0;

    kids.forEach((kid) => {
      const span = ((a1 - a0) * weightOf(kid)) / total;
      const angle = cursor + span / 2;
      const node = nodeByKey.get(kid);
      const radius = radiusFor(node.level);
      positionNode(kid, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle,
      });
      placeChildren(kid, cursor, cursor + span);
      cursor += span;
    });
  };

  placeChildren(rootKey, -Math.PI, 0);

  // Супруги выбранного человека — под корнем, но со сдвигом в сторону:
  // прямо под кругом стоит подпись, и линия пары прошла бы по ней.
  const rootSpouses = desc.nodes.filter(
    (node) => node.level === 0 && node.key !== rootKey,
  );
  rootSpouses.forEach((node, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const ring = Math.floor(index / 2) + 1;
    positionNode(node.key, {
      x: side * ring * RADIAL_SPOUSE_STEP,
      y: 112,
      angle: Math.PI / 2,
    });
  });

  // Супруга привязываем к его человеку по парам раскладки: у человека может
  // быть несколько браков, и копии одного супруга должны встать каждая к
  // своему партнёру, а не к первому найденному.
  const partnerByKey = new Map();
  desc.couples.forEach((couple) => {
    if (!partnerByKey.has(couple.b)) partnerByKey.set(couple.b, couple.a);
    if (!partnerByKey.has(couple.a)) partnerByKey.set(couple.a, couple.b);
  });

  // Супруги встают «лепестками» вокруг своего человека. Направление подбираем
  // по свободному месту: кружок не должен наезжать на людей и вставать на
  // линии связей партнёра с родителями и детьми.
  const spouseGap = RADIAL_NODE_RADIUS * 2 + 12;
  const spouseDistance = RADIAL_NODE_RADIUS * 2 + 30;
  const segmentDistance = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    const t = length2
      ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2))
      : 0;
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  };

  const partnerSegments = (partnerKey) =>
    desc.links
      .map((link) => {
        if (link.from.includes(partnerKey)) return link.to;
        if (link.to === partnerKey) return link.from[0];
        return null;
      })
      .filter(Boolean)
      .map((otherKey) => positions.get(otherKey))
      .filter(Boolean);

  desc.nodes.forEach((node) => {
    if (positions.has(node.key)) return;

    const partnerKey = partnerByKey.get(node.key);
    const partner = partnerKey ? positions.get(partnerKey) : null;

    if (!partner) {
      const radius = radiusFor(node.level);
      positionNode(node.key, {
        x: 0,
        y: -radius,
        angle: -Math.PI / 2,
      });
      return;
    }

    // Кроме связей партнёра, обходим линии к уже поставленным его супругам:
    // иначе новый кружок сядет на отрезок между человеком и другим супругом.
    const spouseSegments = desc.nodes
      .filter(
        (other) =>
          other.key !== node.key &&
          positions.has(other.key) &&
          partnerByKey.get(other.key) === partnerKey,
      )
      .map((other) => positions.get(other.key));

    const segments = [...partnerSegments(partnerKey), ...spouseSegments];
    const placed = Array.from(positions.entries()).map(([key, position]) => ({
      key,
      ...position,
      radius: key === rootKey ? RADIAL_ROOT_RADIUS : RADIAL_NODE_RADIUS,
    }));
    let best = null;

    for (let step = 0; step < 24; step += 1) {
      // Начинаем с касательной к кольцу: там супруг стоит рядом с человеком.
      const direction = partner.angle + Math.PI / 2 + (step * Math.PI) / 12;

      for (let extra = 0; extra <= 6; extra += 1) {
        const distance = spouseDistance + extra * 16;
        const x = partner.x + Math.cos(direction) * distance;
        const y = partner.y + Math.sin(direction) * distance;
        const free = placed.every(
          (other) => Math.hypot(other.x - x, other.y - y) >= spouseGap,
        );
        if (!free) continue;

        let clearance = Infinity;
        segments.forEach((other) => {
          clearance = Math.min(
            clearance,
            segmentDistance(x, y, partner.x, partner.y, other.x, other.y) -
              RADIAL_NODE_RADIUS,
          );
        });
        // Новая линия пары не должна проходить сквозь уже поставленный кружок:
        // иначе второй супруг встанет на луч первого и линия ляжет по кружку.
        placed.forEach((other) => {
          if (other.key === partnerKey) return;
          clearance = Math.min(
            clearance,
            segmentDistance(other.x, other.y, partner.x, partner.y, x, y) -
              other.radius,
          );
        });
        if (!best || clearance > best.clearance) {
          best = { x, y, angle: direction, clearance };
        }
        break;
      }
    }

    if (!best) {
      const direction = partner.angle + Math.PI / 2;
      best = {
        x: partner.x + Math.cos(direction) * spouseDistance,
        y: partner.y + Math.sin(direction) * spouseDistance,
        angle: direction,
      };
    }

    positionNode(node.key, {
      x: best.x,
      y: best.y,
      angle: best.angle,
    });
  });

  const nodes = desc.nodes.map((node) => {
    const position = positions.get(node.key) || { x: 0, y: 0, angle: 0 };
    // Корень — тоже круг, только крупнее: середина радиального дерева
    // не должна выбиваться из ряда компактных кружков.
    return {
      ...node,
      x: position.x,
      y: position.y,
      angle: position.angle,
      compact: true,
      radius:
        node.key === rootKey ? RADIAL_ROOT_RADIUS : RADIAL_NODE_RADIUS,
    };
  });

  const block = finishBlock(nodes, desc.links, desc.couples, rootKey);
  return block ? { ...block, radial: true } : block;
}

/**
 * Веер предков: секторы по поколениям, корень — центральный полукруг.
 */
function buildFanBlock(graph, rootId) {
  const root = String(rootId);
  if (!graph.byId.has(root)) return null;

  const nodes = [];
  const seen = new Set();

  const place = (personId, level, a0, a1) => {
    const id = idOf(personId);
    if (!id || !graph.byId.has(id) || seen.has(id)) return;

    const person = graph.byId.get(id);
    seen.add(id);

    const mid = (a0 + a1) / 2;
    const radius = level * FAN_RING;
    const node = {
      key: makeNodeKey(id),
      id,
      person,
      x: level === 0 ? 0 : Math.cos(mid) * radius,
      y: level === 0 ? 0 : Math.sin(mid) * radius,
      level,
    };

    // Корень тоже сектор: центральный полукруг до первой кольцевой границы,
    // чтобы он выглядел частью веера, а не отдельной карточкой.
    node.sector = {
      a0,
      a1,
      inner: level === 0 ? 0 : level === 1 ? FAN_INNER : (level - 1) * FAN_RING,
      outer: level === 0 ? FAN_INNER : level * FAN_RING,
    };

    nodes.push(node);

    // Родителей берём из графа: они могут быть заданы и через children,
    // и без явного поля father/mother. Мужчина занимает левую половину.
    const parents = graph
      .parentsOf(id)
      .filter((parentId) => !seen.has(parentId));
    const fatherId =
      parents.find(
        (parentId) => graph.byId.get(parentId)?.gender === "male",
      ) || parents[0];
    const motherId = parents.find((parentId) => parentId !== fatherId);

    if (level === 0) {
      if (fatherId && motherId) {
        place(fatherId, 1, -Math.PI, -Math.PI / 2);
        place(motherId, 1, -Math.PI / 2, 0);
      } else if (fatherId) {
        place(fatherId, 1, -Math.PI, 0);
      } else if (motherId) {
        place(motherId, 1, -Math.PI, 0);
      }
      return;
    }

    if (fatherId && motherId) {
      place(fatherId, level + 1, a0, mid);
      place(motherId, level + 1, mid, a1);
    } else if (fatherId) {
      place(fatherId, level + 1, a0, a1);
    } else if (motherId) {
      place(motherId, level + 1, a0, a1);
    }
  };

  place(root, 0, -Math.PI, 0);

  const maxR = nodes.reduce(
    (max, node) => Math.max(max, node.sector?.outer || 0),
    FAN_RING,
  );

  return {
    nodes,
    links: [],
    couples: [],
    width: maxR * 2 + CARD_W,
    height: maxR + CARD_H,
    minX: -maxR - CARD_W / 2,
    minY: -maxR - CARD_H / 2,
    anchorX: 0,
    anchorY: 0,
    anchorKey: nodes[0]?.key || null,
    anchorId: root,
    isFan: true,
  };
}

export function buildTreeLayout(graph, rootPersonId, mode = "descendants") {
  const root = idOf(rootPersonId);
  if (!graph || !root || !graph.byId.has(root)) return null;

  layoutKeySeq = 0;

  switch (mode) {
    case "ancestors": {
      const block = buildAncestorBlock(
        root,
        0,
        { graph, seen: new Set() },
        true,
      );
      return block ? { ...block, mode } : null;
    }
    case "full": {
      const block = buildFullBlock(graph, root);
      return block ? { ...block, mode } : null;
    }
    case "radial": {
      const block = buildRadialBlock(graph, root);
      return block ? { ...block, mode } : null;
    }
    case "fan": {
      const block = buildFanBlock(graph, root);
      return block ? { ...block, mode } : null;
    }
    case "descendants":
    default: {
      const block = buildDescendantBlock(
        root,
        0,
        { graph, seen: new Set() },
      );
      return block ? { ...block, mode: "descendants" } : null;
    }
  }
}
