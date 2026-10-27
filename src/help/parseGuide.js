// Разбор USER_GUIDE.md в дерево справки.
//
// Формат файла:
//   # Название руководства          — первый заголовок первого уровня
//   Текст до первой группы          — подзаголовок обложки
//   # Группа {#id}                  — пункт боковой панели; без вложенных
//                                     «##» это самостоятельная страница
//   ## Страница {#id}               — страница внутри группы
//   ### Подраздел                   — подраздел страницы
//
// {#id} необязателен: ссылки вида [текст](#id) ведут на страницу или группу.

const HEADING_ID_RE = /\s*\{#([\w-]+)\}\s*$/;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/;
const SKIP_SUMMARY_RE = /^(#|!\[|\||[-*+] |\d+\. |>|```|_[^_]+_$)/;

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function parseHeading(raw) {
  const match = raw.match(HEADING_ID_RE);
  const title = raw.replace(HEADING_ID_RE, "").trim();
  return { title, id: match ? match[1] : slugify(title) };
}

function cleanBody(lines) {
  const result = [...lines];
  const isFiller = (line) => !line.trim() || /^\s*-{3,}\s*$/.test(line);
  while (result.length && isFiller(result[0])) result.shift();
  while (result.length && isFiller(result[result.length - 1])) result.pop();
  return result.join("\n");
}

function stripInline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummary(body) {
  for (const block of body.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text || SKIP_SUMMARY_RE.test(text)) continue;
    return stripInline(text);
  }
  return "";
}

function extractImage(body) {
  const match = body.match(IMAGE_RE);
  return match ? match[1] : null;
}

function toPlainText(body) {
  return stripInline(
    body
      .replace(/^#+\s*/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\|?[-:| ]+\|?$/gm, " ")
      .replace(/\|/g, " "),
  );
}

function finalize(node) {
  const body = cleanBody(node.lines);
  delete node.lines;
  node.body = body;
  node.image = extractImage(body);
  node.summary = extractSummary(body);
  node.text = toPlainText(body);
  return node;
}

export function parseGuide(markdown) {
  const guide = { title: "", intro: "", nodes: [] };
  const introLines = [];
  let group = null;
  let current = null;
  let inFence = false;

  for (const line of (markdown || "").replace(/\r\n/g, "\n").split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;

    const h1 = !inFence && line.match(/^# (.+)$/);
    const h2 = !inFence && line.match(/^## (.+)$/);

    if (h1 && !guide.title && guide.nodes.length === 0) {
      guide.title = parseHeading(h1[1]).title;
    } else if (h1) {
      group = { type: "group", ...parseHeading(h1[1]), lines: [], children: [] };
      guide.nodes.push(group);
      current = group;
    } else if (h2) {
      const page = {
        type: "page",
        ...parseHeading(h2[1]),
        lines: [],
        parentId: group?.id ?? null,
      };
      if (group) group.children.push(page);
      else guide.nodes.push(page);
      current = page;
    } else if (current) {
      current.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  guide.title = guide.title || "Руководство пользователя";
  guide.intro = extractSummary(cleanBody(introLines));

  guide.nodes = guide.nodes.map((node) => {
    finalize(node);
    if (node.type !== "group") return node;
    node.children.forEach(finalize);
    if (node.children.length === 0) {
      node.type = "page";
      delete node.children;
      return node;
    }
    const first = node.children.find((child) => child.image) || node.children[0];
    node.image = node.image || first?.image || null;
    node.summary = node.summary || node.children[0]?.summary || "";
    return node;
  });

  const byId = new Map();
  const pages = [];
  for (const node of guide.nodes) {
    byId.set(node.id, node);
    if (node.type === "page") pages.push(node);
    for (const child of node.children || []) {
      byId.set(child.id, child);
      pages.push(child);
    }
  }
  guide.byId = byId;
  guide.pages = pages;

  return guide;
}

export function searchGuide(guide, query) {
  const q = query.trim().toLowerCase();
  if (!guide || !q) return [];

  return guide.pages
    .map((page) => {
      const title = page.title.toLowerCase();
      const text = page.text.toLowerCase();
      const titleHit = title.includes(q);
      const textIndex = text.indexOf(q);
      if (!titleHit && textIndex < 0) return null;

      let snippet = page.summary;
      if (textIndex >= 0) {
        const start = Math.max(0, textIndex - 70);
        const end = Math.min(page.text.length, textIndex + q.length + 110);
        snippet =
          (start > 0 ? "…" : "") +
          page.text.slice(start, end).trim() +
          (end < page.text.length ? "…" : "");
      }

      return {
        page,
        parent: page.parentId ? guide.byId.get(page.parentId) : null,
        snippet,
        score: (titleHit ? 2 : 0) + (textIndex >= 0 ? 1 : 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
