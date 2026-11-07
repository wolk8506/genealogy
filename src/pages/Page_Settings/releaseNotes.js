// Текст релиза приходит из фиды electron-updater. GitHub отдаёт описание
// уже размеченным — в фиде это HTML, а не markdown из журнала изменений,
// поэтому разметка сначала сводится к строкам, которые понимает парсер:
// метка группы — «**Текст:**», пункт — «- текст». Окно обновления и карточка
// «Обновление системы» показывают результат группами.

const BULLET_RE = /^[-*•]\s+\S/;
const LABEL_RE = /^\*\*([^*:]+):?\*\*$/;
const HEADING_RE = /^#{1,6}\s/;
const TAG_RE = /<[a-z/!][^>]*>/i;

const BLOCK_CLOSE_RE = /<\/(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|table|tr)>/gi;

const ENTITIES = {
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  "#039": "'",
  apos: "'",
  nbsp: " ",
  amp: "&",
};

function fromHtml(html) {
  return (
    html
      .replace(/<li[^>]*>\s*/gi, "- ")
      .replace(/<\/?strong[^>]*>/gi, "**")
      // в «свободном» списке GitHub кладёт текст в <p> — перенос ставим
      // только на его закрытии, чтобы пункт не разрывался пополам
      .replace(/<\/p>\s*(?=<\/li>)/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(BLOCK_CLOSE_RE, "\n")
      .replace(/<[^>]+>/g, "")
      // сущности раскрываем в конце: <code>&lt;u&gt;</code> — это текст,
      // а не тег, и вырезать его вместе с разметкой нельзя
      .replace(/&(#0?39|[a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
  );
}

function clean(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function toText(raw) {
  const notes = Array.isArray(raw)
    ? raw
        .map((item) => (typeof item === "string" ? item : item?.note))
        .filter(Boolean)
        .join("\n")
    : typeof raw === "string"
      ? raw
      : "";
  return TAG_RE.test(notes) ? fromHtml(notes) : notes;
}

export function parseReleaseNotes(raw) {
  const groups = [];
  let current = null;

  for (const line of toText(raw).split("\n")) {
    const text = line.trim();
    if (!text || HEADING_RE.test(text)) {
      continue;
    }

    const label = text.match(LABEL_RE);
    if (label) {
      current = { title: clean(label[1]), items: [] };
      groups.push(current);
      continue;
    }

    if (!BULLET_RE.test(text)) {
      continue;
    }
    if (!current) {
      current = { title: "", items: [] };
      groups.push(current);
    }
    const item = clean(text.replace(/^[-*•]\s+/, ""));
    if (item) {
      current.items.push(item);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}
