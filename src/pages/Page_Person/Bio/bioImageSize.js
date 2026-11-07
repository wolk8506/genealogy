// Размеры иллюстраций в биографии. Хранятся в title изображения:
// `bio-size:sm|md|lg|full` для типовых и `bio-size:45%` для ручных.

export const BIO_SIZE_PREFIX = "bio-size:";

export const BIO_SIZE_PRESETS = {
  sm: 25,
  md: 33.33,
  lg: 50,
  full: 100,
};

export const BIO_SIZE_MIN = 25;
export const BIO_SIZE_MAX = 100;
export const BIO_SIZE_STEP = 5;

export const BIO_SIZE_LABELS = {
  sm: "Маленький",
  md: "Средний",
  lg: "Большой",
  full: "На всю ширину",
};

const PRESET_IDS = Object.keys(BIO_SIZE_PRESETS);

// Типовые размеры — сильные детенты: в них тяжелее промахнуться, чем
// по сетке каждые 5%, и именно их ставит меню «Размер».
const DETENT_RADIUS = 1.8;
const FULL_SNAP_RADIUS = 4;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Нормализованный размер — это имя типового размера либо число процентов.
export function normalizeBioSize(value) {
  const raw = String(value ?? "").trim();
  const text = (raw.startsWith(BIO_SIZE_PREFIX)
    ? raw.slice(BIO_SIZE_PREFIX.length)
    : raw
  )
    .trim()
    .toLowerCase();
  if (PRESET_IDS.includes(text)) return text;
  const percent = Number.parseFloat(text);
  return Number.isFinite(percent)
    ? clamp(Math.round(percent), BIO_SIZE_MIN, BIO_SIZE_MAX)
    : "md";
}

export function readBioSize(title) {
  return normalizeBioSize(title);
}

export function buildBioSizeTitle(size) {
  const normalized = normalizeBioSize(size);
  return `${BIO_SIZE_PREFIX}${
    typeof normalized === "number" ? `${normalized}%` : normalized
  }`;
}

export function percentOfBioSize(size) {
  const normalized = normalizeBioSize(size);
  return typeof normalized === "number"
    ? normalized
    : BIO_SIZE_PRESETS[normalized];
}

export function bioSizeLabel(size) {
  const normalized = normalizeBioSize(size);
  return typeof normalized === "number"
    ? `${normalized}\u00A0%`
    : BIO_SIZE_LABELS[normalized];
}

export function presetStops(maxPercent) {
  return PRESET_IDS.filter((id) => BIO_SIZE_PRESETS[id] <= maxPercent + 1e-6);
}

export function gridStops(maxPercent) {
  const stops = [];
  for (
    let percent = BIO_SIZE_MIN;
    percent <= maxPercent + 1e-6;
    percent += BIO_SIZE_STEP
  ) {
    stops.push(percent);
  }
  return stops.length ? stops : [BIO_SIZE_MIN];
}

// Соседний типовый размер — для Shift+стрелок.
export function stepPresetFromPercent(percent, direction) {
  const ids = direction > 0 ? PRESET_IDS : [...PRESET_IDS].reverse();
  for (const id of ids) {
    const candidate = BIO_SIZE_PRESETS[id];
    if (direction > 0 ? candidate > percent + 0.02 : candidate < percent - 0.02) {
      return id;
    }
  }
  return percentToBioSize(percent);
}

// Все точки, в которые может встать картинка: сетка 5% плюс типовые
// размеры — по ним же идут и шаги с клавиатуры.
export function resizeStops(maxPercent) {
  const stops = [
    ...gridStops(maxPercent),
    ...presetStops(maxPercent).map((id) => BIO_SIZE_PRESETS[id]),
  ];
  return [...new Set(stops)].sort((a, b) => a - b);
}

export function stepBioPercent(percent, direction, maxPercent) {
  const candidates = resizeStops(maxPercent).filter((stop) =>
    direction > 0 ? stop > percent + 0.02 : stop < percent - 0.02,
  );
  if (!candidates.length) return percent;
  return direction > 0 ? candidates[0] : candidates[candidates.length - 1];
}

export function percentToBioSize(percent) {
  return toSizeValue(percent);
}

function toSizeValue(percent) {
  const preset = PRESET_IDS.find(
    (id) => Math.abs(BIO_SIZE_PRESETS[id] - percent) < 0.02,
  );
  return preset ?? Math.round(percent);
}

// Выше «родной» ширины картинки растягивать нет смысла — начинается
// размытие, поэтому это потолок перетаскивания. Потолок поднимаем до
// ближайшей точки сетки, чтобы он сам был брекпоинтом: иначе последняя
// детента оказывается впритык к краю и верх диапазона остаётся без точек.
export function maxPercentFor(naturalWidth, containerWidth) {
  if (!naturalWidth || !containerWidth) return BIO_SIZE_MAX;
  return clamp(
    Math.ceil((naturalWidth / containerWidth) * 100 / BIO_SIZE_STEP) *
      BIO_SIZE_STEP,
    BIO_SIZE_MIN,
    BIO_SIZE_MAX,
  );
}

export function snapBioPercent(rawPercent, maxPercent) {
  const cap = clamp(maxPercent, BIO_SIZE_MIN, BIO_SIZE_MAX);
  const value = clamp(rawPercent, BIO_SIZE_MIN, cap);

  for (const id of PRESET_IDS) {
    const percent = BIO_SIZE_PRESETS[id];
    if (percent > cap + 1e-6) continue;
    const radius = id === "full" ? FULL_SNAP_RADIUS : DETENT_RADIUS;
    if (Math.abs(value - percent) <= radius) return toSizeValue(percent);
  }

  const stops = gridStops(cap);
  let best = stops[0];
  for (const stop of stops) {
    if (Math.abs(value - stop) < Math.abs(value - best)) best = stop;
  }
  return toSizeValue(best);
}

// Мягкое сопротивление за потолком: тянуть дальше можно, но рост
// замедляется, и на фиксацию такое значение не проходит.
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (!overshoot) return 0;
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

// Стиль по проценту: 100% — картинка на всю колонку с исходными
// пропорциями, меньше — квадратная рамка с кропом.
export function bioPercentStyle(percent) {
  if (percent >= BIO_SIZE_MAX) {
    return [
      "width:100%",
      "min-width:100%",
      "max-width:100%",
      "aspect-ratio:auto",
      "height:auto",
      "max-height:520px",
      "object-fit:contain",
    ].join(";");
  }
  const width = `calc(${percent}% - 12px)`;
  return [
    `width:${width}`,
    "min-width:140px",
    `max-width:${width}`,
    "aspect-ratio:1 / 1",
    "height:auto",
  ].join(";");
}

export function bioSizeStyle(size) {
  return bioPercentStyle(percentOfBioSize(size));
}
