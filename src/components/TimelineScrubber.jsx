import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

// "2019-03-21" -> "21 марта 2019 г.", "2019-03" -> "март 2019 г.", остальное как есть.
function formatHeaderLabel(header) {
  const s = String(header ?? "");
  const full = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) {
    const month = MONTHS_GEN[Number(full[2]) - 1];
    return month ? `${Number(full[3])} ${month} ${full[1]} г.` : s;
  }
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const month = MONTHS_GEN[Number(ym[2]) - 1];
    return month ? `${month} ${ym[1]} г.` : s;
  }
  return s;
}

// Тонкий скраббер у правого края в стиле Google Photos: мини-полоса,
// невидимые точки групп, при наведении/перетаскивании — горизонтальная
// линия через экран с датой.
export default function TimelineScrubber({
  headers = [],
  groupOffsets = [],
  activeHeader = "",
  virtuosoRef,
  forceVisible = false,
}) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null); // { index, y }
  const [trackH, setTrackH] = useState(0);

  useEffect(() => {
    const measure = () =>
      setTrackH(trackRef.current?.getBoundingClientRect().height ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // Перезамер при появлении заголовков: первый рендер часто пустой
    // (фото грузятся асинхронно), иначе высота останется 0 навсегда.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.length]);

  // Уникальные годы в порядке заголовков: первый groupIndex года
  // + месяцы года (первый groupIndex каждого месяца).
  const years = useMemo(() => {
    const byYear = new Map();
    headers.forEach((h, idx) => {
      const m = String(h ?? "").match(/^(\d{4})(?:-(\d{2})(?:-\d{2})?)?$/);
      if (!m) return;
      if (!byYear.has(m[1])) {
        byYear.set(m[1], { year: m[1], groupIndex: idx, months: new Map() });
      }
      if (m[2] != null) {
        const entry = byYear.get(m[1]);
        if (!entry.months.has(Number(m[2]))) {
          entry.months.set(Number(m[2]), idx);
        }
      }
    });
    return Array.from(byYear.values()).map((entry) => ({
      year: entry.year,
      groupIndex: entry.groupIndex,
      months: Array.from(entry.months.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([month, monthGroup]) => ({ month, groupIndex: monthGroup })),
    }));
  }, [headers]);

  // Выборка подписей: столько, сколько влезает в трек (как у Google —
  // каждый год или через N лет в зависимости от плотности).
  // Позиция подписи — по индексу первой группы года на общей шкале
  // заголовков, чтобы уровень совпадал с точками и ползунком.
  const shownYears = useMemo(() => {
    if (years.length === 0 || headers.length < 2) return [];
    // Пока высота не замерена — считаем по оценке, чтобы не схлопнуться в один год.
    const effH = trackH > 0 ? trackH : 600;
    const maxLabels = Math.max(2, Math.floor(effH / 30));
    const picked =
      years.length <= maxLabels
        ? years
        : years.filter(
            (_, i) => i % Math.ceil(years.length / maxLabels) === 0,
          );
    const withPos = picked.map((entry) => ({
      ...entry,
      ratio: entry.groupIndex / (headers.length - 1),
    }));
    // Убираем наложения подписей: минимум 22px между соседними.
    const minGap = 22 / Math.max(1, effH);
    const result = [];
    for (const entry of withPos) {
      if (
        result.length === 0 ||
        entry.ratio - result[result.length - 1].ratio >= minGap
      ) {
        result.push(entry);
      }
    }
    return result;
  }, [years, trackH, headers.length]);

  const jumpToGroup = useCallback(
    (groupIndex) => {
      virtuosoRef?.current?.scrollToIndex({
        index: groupOffsets[groupIndex] ?? 0,
        align: "start",
        behavior: "auto",
      });
    },
    [groupOffsets, virtuosoRef],
  );

  const infoByRatio = useCallback(
    (clientY) => {
      const track = trackRef.current;
      if (!track || headers.length === 0) return null;
      const rect = track.getBoundingClientRect();
      const r = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
      const index = Math.min(
        headers.length - 1,
        Math.floor(r * headers.length),
      );
      return { index, y: clientY };
    },
    [headers],
  );

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const info = infoByRatio(e.clientY);
    setHoverInfo(info);
    setDragging(true);
    if (info) {
      setDragIndex(info.index);
      jumpToGroup(info.index);
    }
  };

  const handlePointerMove = (e) => {
    const info = infoByRatio(e.clientY);
    setHoverInfo(info);
    if (dragging && info) {
      setDragIndex(info.index);
      jumpToGroup(info.index);
    }
  };

  const endDrag = () => {
    setDragging(false);
    setDragIndex(null);
  };

  const handleLeave = () => {
    setHoverInfo(null);
  };

  const activeIndex = Math.max(0, headers.indexOf(activeHeader));

  // Все месяцы подряд (для колонки точек).
  const allMonths = useMemo(() => {
    const list = [];
    years.forEach((entry) => {
      entry.months.forEach(({ month, groupIndex }) => {
        list.push({ year: entry.year, month, groupIndex });
      });
    });
    return list;
  }, [years]);

  // Единая колонка точек: истинные позиции месяцев на той же шкале,
  // что у годов и маркера. Минимальный зазор — точки не касаются.
  // Первый месяц каждого пропущенного выборкой года сохраняем,
  // при необходимости вытесняя предыдущую обычную точку.
  // Точки под подписями годов не показываем вообще.
  const railDots = useMemo(() => {
    if (allMonths.length === 0 || headers.length < 2) return [];
    const effH = trackH > 0 ? trackH : 600;
    const shown = new Set(shownYears.map((y) => y.year));
    const mustKeep = new Set();
    years.forEach((entry) => {
      if (!shown.has(entry.year) && entry.months.length > 0) {
        mustKeep.add(entry.months[0].groupIndex);
      }
    });
    const withPos = allMonths.map((entry) => ({
      ...entry,
      ratio: entry.groupIndex / (headers.length - 1),
    }));
    const minGap = 12 / Math.max(1, effH);
    const labelHalf = 14 / Math.max(1, effH);
    const underLabel = (ratio) =>
      shownYears.some((y) => Math.abs(ratio - y.ratio) < labelHalf);
    const result = [];
    for (const entry of withPos) {
      if (underLabel(entry.ratio)) continue;
      const last = result[result.length - 1];
      if (!last || entry.ratio - last.ratio >= minGap) {
        result.push(entry);
        continue;
      }
      if (
        mustKeep.has(entry.groupIndex) &&
        !mustKeep.has(last.groupIndex)
      ) {
        result[result.length - 1] = entry;
      }
    }
    return result.slice(0, 150);
  }, [allMonths, years, shownYears, trackH, headers.length]);
  const previewIndex = hoverInfo?.index;
  const shownIndex = dragIndex ?? previewIndex ?? activeIndex;
  const ratio = headers.length > 1 ? shownIndex / (headers.length - 1) : 0;
  const showLine = hoverInfo != null;

  if (headers.length < 2) return null;

  return (
    <>
      {/* горизонтальная линия + дата */}
      {showLine && (
        <>
          <Box
            sx={{
              position: "fixed",
              right: 28,
              width: 30,
              top: hoverInfo.y,
              height: 2,
              mt: "-1px",
              bgcolor: "primary.main",
              opacity: 0.9,
              zIndex: 199,
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "fixed",
              right: 36,
              top: hoverInfo.y,
              transform: "translateY(-50%)",
              bgcolor: (t) => alpha(t.palette.background.paper, 0.95),
              backdropFilter: "blur(8px)",
              border: "1px solid",
              borderColor: "divider",
              borderLeft: "3px solid",
              borderLeftColor: "primary.main",
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              boxShadow: 3,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 200,
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontFamily: "monospace" }}
            >
              {formatHeaderLabel(headers[shownIndex])}
            </Typography>
          </Box>
        </>
      )}

      <Box
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseLeave={handleLeave}
        sx={{
          position: "fixed",
          right: 0,
          top: 100,
          bottom: 60,
          width: 76,
          zIndex: 200,
          cursor: "row-resize",
          touchAction: "none",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
          pr: 1,
        }}
      >
        {/* подписи лет */}
        {shownYears.map(({ year, groupIndex, ratio: yearRatio }) => {
          return (
            <Typography
              key={year}
              onClick={(e) => {
                e.stopPropagation();
                jumpToGroup(groupIndex);
              }}
              sx={{
                position: "absolute",
                right: 2,
                top: `${(yearRatio * 100).toFixed(2)}%`,
                transform: "translateY(-50%)",
                fontSize: "12px",
                fontWeight: 500,
                color: "text.secondary",
                lineHeight: 1,
                whiteSpace: "nowrap",
                pointerEvents: "auto",
                bgcolor: (t) => alpha(t.palette.background.default, 0.65),
                backdropFilter: "blur(6px)",
                borderRadius: 1,
                px: 0.75,
                py: 0.4,
              }}
            >
              {year}
            </Typography>
          );
        })}
        {/* трек-невидимка: только зона и ось позиционирования */}
        <Box
          sx={{
            width: 4,
            height: "100%",
            borderRadius: 2,
            bgcolor: "transparent",
            position: "relative",
          }}
        >
          {/* колонка точек — истинные позиции месяцев, без подсветки */}
          {railDots.map(({ year, month, groupIndex, ratio: dotRatio }) => {
            return (
              <Box
                key={`${year}-${month}`}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToGroup(groupIndex);
                }}
                sx={{
                  position: "absolute",
                  top: `${(dotRatio * 100).toFixed(2)}%`,
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.35),
                  transition: "background-color 0.15s ease",
                  pointerEvents: "auto",
                }}
              />
            );
          })}

          {/* маркер текущего места — горизонтальная линия */}
          <Box
            sx={{
              position: "absolute",
              top: `${(ratio * 100).toFixed(2)}%`,
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 20,
              height: 3,
              borderRadius: 2,
              bgcolor: "primary.main",
              pointerEvents: "none",
            }}
          />
        </Box>
      </Box>
    </>
  );
}
