// Палитра маркера в биографии.
//
// В bio.md сохраняется смысловое имя цвета (`data-bio-color="orange"`),
// а не hex: так оттенок можно подстроить под светлую и тёмную тему,
// не меняя уже сохранённые биографии.
export const DEFAULT_BIO_HIGHLIGHT_COLOR = "orange";

export const BIO_HIGHLIGHT_COLORS = [
  { id: "purple", label: "Лиловый", hex: "#B678FF" },
  { id: "pink", label: "Розовый", hex: "#FF6B8A" },
  { id: "orange", label: "Оранжевый", hex: "#FFA92E" },
  { id: "mint", label: "Мятный", hex: "#45D6C1" },
  { id: "blue", label: "Синий", hex: "#4A9BFF" },
];

const COLOR_IDS = new Set(BIO_HIGHLIGHT_COLORS.map((color) => color.id));

export function normalizeBioHighlightColor(value) {
  return COLOR_IDS.has(value) ? value : DEFAULT_BIO_HIGHLIGHT_COLOR;
}

export function getBioHighlightColor(value) {
  const id = normalizeBioHighlightColor(value);
  return BIO_HIGHLIGHT_COLORS.find((color) => color.id === id);
}
