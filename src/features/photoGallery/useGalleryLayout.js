import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizePhotoDate } from "../../utils/photoDates";
import { INSPECTOR_TRANSITION_MS } from "../../layout/inspectorPanelTransition";

export const UNDATED_GROUP = "Без даты";
export const UNGROUPED_LABEL = "Все фотографии";

const columnsForWidth = (width) =>
  width < 1200 ? 3 : width < 1600 ? 4 : width < 2000 ? 5 : 6;

// Глобальная семантика поиска: каждое слово запроса обязано встретиться в
// тексте фото, хештеги тоже участвуют. Слово из одной строки ведёт себя как
// прежний подстрочный поиск, поэтому переносим его и в персональную галерею.
function matchesSearch(photo, search) {
  const terms = String(search || "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return true;

  const content = `
    ${photo.id || ""}
    ${photo.title || ""}
    ${photo.description || ""}
    ${photo.filename || ""}
    ${photo.hashtags?.join(" ") || ""}
  `.toLowerCase();

  return terms.every((term) => content.includes(term));
}

function matchesPeople(photo, selectedPeople) {
  if (!selectedPeople || selectedPeople.length === 0) return true;
  return selectedPeople.some(
    (person) =>
      photo.owner === person.id || photo.people?.includes(person.id),
  );
}

export function defaultGroupKey(photo, groupBy) {
  if (groupBy === "date") return photo.date?.split("T")[0] || UNDATED_GROUP;
  if (groupBy === "datePhoto") return photo.datePhoto || UNDATED_GROUP;
  return UNGROUPED_LABEL;
}

// Порядок внутри группы задаётся тем же ключом, что и сама группировка:
// по съёмке — для дат фото и владельцев, по дате загрузки — для остальных.
function comparePhotos(a, b, groupBy, sortDir) {
  const datePhotoOf = (p) => normalizePhotoDate(p.datePhoto) || 0;
  const dateOf = (p) => Date.parse(p.date) || 0;
  let r = 0;
  if (groupBy === "owner" || groupBy === "datePhoto" || groupBy === "byType") {
    r = datePhotoOf(a) - datePhotoOf(b) || dateOf(a) - dateOf(b);
  } else {
    r = dateOf(a) - dateOf(b);
  }
  if (r === 0) r = (a.id || 0) - (b.id || 0);
  return sortDir === "asc" ? r : -r;
}

function compareGroupKeys(a, b, sortDir, firstGroupKey) {
  if (firstGroupKey) {
    if (a === firstGroupKey) return -1;
    if (b === firstGroupKey) return 1;
  }
  if (a === b) return 0;
  if (a === UNDATED_GROUP || a === UNGROUPED_LABEL) return 1;
  if (b === UNDATED_GROUP || b === UNGROUPED_LABEL) return -1;
  return sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

/**
 * Единое ядро раскладки обеих галерей.
 *
 * `groupKey` — необязательный переопределяющий решатель ключа группы
 * (именно так персональная галерея добавляет свою группировку «мои / я на
 * фото»), возвращает `undefined`, чтобы отдать решение ядру.
 */
export function useGalleryLayout({
  photos,
  search,
  selectedPeople,
  groupBy,
  sortDir = "desc",
  layoutWidth,
  // Сколько пикселей отняла у layoutWidth боковая обвязка: раскрытый левый
  // ящик навигации и правая панель инспектора. Столбцы и высота строк
  // считаются по ширине без обвязки, иначе её выезд перестраивает сетку и
  // прячет выбранную карточку.
  chromeInset = 0,
  allPeople,
  groupKey,
  firstGroupKey,
}) {
  const ownerNames = useCallback(
    (ownerId) => {
      const person = allPeople?.find((x) => x.id === ownerId);
      if (!person) return "Неизвестно";
      return `${person.lastName || person.maidenName || ""} ${
        person.firstName || ""
      }`.trim();
    },
    [allPeople],
  );

  // База раскладки — ширина галереи при убранной обвязке (рейл слева, панель
  // закрыта). Пока обвязка едет, измеренная ширина меняется каждый кадр, и
  // сетка перестраивалась бы на глазах; базу не трогаем до конца анимации,
  // ряды лишь сжимаются через 1fr. Так же фиксируется и высота: обвязка
  // меняет только ширину карточки. Когда обвязка стоит и открыта, любое
  // изменение ширины — это ресайз окна, и база едет вместе с ним.
  const lastInsetRef = useRef(chromeInset);
  const insetChanged = lastInsetRef.current !== chromeInset;
  const [chromeMoving, setChromeMoving] = useState(false);
  useEffect(() => {
    if (lastInsetRef.current === chromeInset) return undefined;
    lastInsetRef.current = chromeInset;
    setChromeMoving(true);
    const id = setTimeout(
      () => setChromeMoving(false),
      INSPECTOR_TRANSITION_MS,
    );
    return () => clearTimeout(id);
  }, [chromeInset]);

  const chromeRef = useRef({
    base: layoutWidth,
    anchor: layoutWidth,
    skip: false,
  });
  const ch = chromeRef.current;
  if (insetChanged) {
    // первый спокойный кадр после сдвига обвязки: замер ещё догоняет анимацию
    ch.skip = true;
  } else if (chromeMoving) {
    // кадры анимации обвязки раскладку не трогают
  } else if (ch.skip) {
    ch.skip = false;
    ch.anchor = layoutWidth;
  } else if (layoutWidth > 0) {
    if (chromeInset === 0) {
      ch.base = layoutWidth;
      ch.anchor = layoutWidth;
    } else {
      ch.base += layoutWidth - ch.anchor;
      ch.anchor = layoutWidth;
    }
  }
  const baseWidth = ch.base;

  return useMemo(() => {
    const columnsCount = columnsForWidth(baseWidth);
    if (!photos) {
      return {
        displayList: [],
        groupCounts: [],
        photoCountsPerGroup: [],
        flattenedRows: [],
        headers: [],
        columnsCount,
        groupOffsets: [],
        rowHeight: 80,
      };
    }

    const filtered = photos.filter(
      (p) => matchesSearch(p, search) && matchesPeople(p, selectedPeople),
    );

    const resolveKey = (p) => {
      const custom = groupKey ? groupKey(p, groupBy) : undefined;
      if (custom !== undefined && custom !== null) return String(custom);
      if (groupBy === "owner") return ownerNames(p.owner);
      return defaultGroupKey(p, groupBy);
    };

    const groupsMap = new Map();
    filtered.forEach((p) => {
      const key = resolveKey(p);
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key).push(p);
    });

    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) =>
      compareGroupKeys(a, b, sortDir, firstGroupKey),
    );

    const displayList = [];
    const groupCounts = [];
    const photoCountsPerGroup = [];
    const flattenedRows = [];
    const headers = [];
    const groupOffsets = [];
    let rowAcc = 0;

    sortedKeys.forEach((key) => {
      const items = [...groupsMap.get(key)].sort((a, b) =>
        comparePhotos(a, b, groupBy, sortDir),
      );
      headers.push(key);
      groupOffsets.push(rowAcc);
      displayList.push(...items);
      photoCountsPerGroup.push(items.length);

      let added = 0;
      for (let i = 0; i < items.length; i += columnsCount) {
        flattenedRows.push(items.slice(i, i + columnsCount));
        added++;
      }
      groupCounts.push(added);
      rowAcc += added;
    });

    const columnGap = 8;
    // Высота строки равна ширине ячейки по базе раскладки: панель меняет
    // только ширину карточки, снимки не становятся ниже.
    const baseCellWidth = Math.max(
      0,
      (baseWidth - columnGap * (columnsCount - 1)) / columnsCount,
    );

    return {
      displayList,
      groupCounts,
      photoCountsPerGroup,
      flattenedRows,
      headers,
      columnsCount,
      groupOffsets,
      rowHeight: Math.max(80, Math.round(baseCellWidth)),
    };
  }, [
    photos,
    search,
    selectedPeople,
    groupBy,
    sortDir,
    baseWidth,
    ownerNames,
    groupKey,
    firstGroupKey,
  ]);
}

// Первая фотография каждой группы — превью для таймлайн-скраббера.
export function useGroupFirstPhotos(displayList, photoCountsPerGroup) {
  return useMemo(() => {
    const result = [];
    let idx = 0;
    for (let g = 0; g < photoCountsPerGroup.length; g++) {
      result.push(displayList[idx] || null);
      idx += photoCountsPerGroup[g] || 0;
    }
    return result;
  }, [displayList, photoCountsPerGroup]);
}
