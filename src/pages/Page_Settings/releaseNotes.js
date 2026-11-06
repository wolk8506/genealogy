// Текст релиза приходит из фиды electron-updater — это markdown-описание
// релиза на GitHub, собранное из блока журнала изменений нужной версии.
// Окно обновления и карточка «Обновление системы» показывают его группами:
// метка раздела («Страница человека») и её пункты.

const BULLET_RE = /^[-*•]\s+\S/;
const LABEL_RE = /^\*\*([^*:]+):?\*\*$/;
const HEADING_RE = /^#{1,6}\s/;

function clean(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
}

function toText(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item : item?.note))
      .filter(Boolean)
      .join("\n");
  }
  return typeof raw === "string" ? raw : "";
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
