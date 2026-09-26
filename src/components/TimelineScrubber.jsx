import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

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

// Отступы внутри трека: подписи годов с translateY(-50%) не залезают под AppBar.
const RAIL_PAD_TOP = 22;
const RAIL_PAD_BOTTOM = 16;

function railInnerHeight(trackHeight) {
  return Math.max(1, trackHeight - RAIL_PAD_TOP - RAIL_PAD_BOTTOM);
}

function ratioToTopPct(ratio, trackHeight) {
  const h = Math.max(1, trackHeight);
  const topPx = RAIL_PAD_TOP + ratio * railInnerHeight(h);
  return (topPx / h) * 100;
}

function clientYToRatio(clientY, rect) {
  const innerTop = rect.top + RAIL_PAD_TOP;
  const innerH = railInnerHeight(rect.height);
  return Math.min(1, Math.max(0, (clientY - innerTop) / innerH));
}

function buildLayout(headers, groupOffsets, groupCounts) {
  const n = headers.length;
  if (n === 0) {
    return {
      totalRows: 0,
      rowCounts: [],
      startRatios: [],
      endRatios: [],
      centerRatios: [],
    };
  }

  const rowCounts =
    groupCounts?.length === n
      ? groupCounts
      : groupOffsets.map((off, i) => {
          const next = groupOffsets[i + 1];
          return next != null ? next - off : 1;
        });

  const totalRows = Math.max(
    1,
    rowCounts.reduce((a, b) => a + b, 0),
  );

  const startRatios = groupOffsets.map((off) => off / totalRows);
  const endRatios = rowCounts.map(
    (c, i) => (groupOffsets[i] + c) / totalRows,
  );
  const centerRatios = rowCounts.map(
    (c, i) => (groupOffsets[i] + c * 0.5) / totalRows,
  );

  return { totalRows, rowCounts, startRatios, endRatios, centerRatios };
}

function groupIndexFromRatio(r, groupOffsets, totalRows) {
  const targetRow = Math.min(
    totalRows - 1,
    Math.max(0, Math.floor(r * totalRows)),
  );
  for (let i = groupOffsets.length - 1; i >= 0; i--) {
    if (targetRow >= groupOffsets[i]) return i;
  }
  return 0;
}

// Скраббер в стиле Google Photos: heatmap по плотности, годы, точки месяцев,
// горизонтальная линия и превью при hover/drag.
export default function TimelineScrubber({
  headers = [],
  dateKeys,
  groupOffsets = [],
  groupCounts = [],
  groupWeights = [],
  activeGroupIndex = 0,
  mode = "date",
  getPreviewUrl,
  anchorRef,
  virtuosoRef,
  showCrosshairLine = true,
}) {
  const theme = useTheme();
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const lastJumpRef = useRef(-1);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [trackRect, setTrackRect] = useState(null);
  const [anchorRect, setAnchorRect] = useState(null);

  const dateHeaders = dateKeys?.length === headers.length ? dateKeys : headers;
  const isDateMode = mode === "date";

  const layout = useMemo(
    () => buildLayout(headers, groupOffsets, groupCounts),
    [headers, groupOffsets, groupCounts],
  );

  const maxWeight = useMemo(() => {
    const w =
      groupWeights?.length === headers.length
        ? groupWeights
        : layout.rowCounts;
    return Math.max(1, ...w);
  }, [groupWeights, headers.length, layout.rowCounts]);

  const measureRects = useCallback(() => {
    const track = trackRef.current;
    if (track) setTrackRect(track.getBoundingClientRect());
    const anchor = anchorRef?.current;
    if (anchor) setAnchorRect(anchor.getBoundingClientRect());
  }, [anchorRef]);

  useEffect(() => {
    if (!dragging) return undefined;
    const prev = document.body.style.userSelect;
    const prevWebkit = document.body.style.webkitUserSelect;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.body.style.userSelect = prev;
      document.body.style.webkitUserSelect = prevWebkit;
    };
  }, [dragging]);

  useEffect(() => {
    measureRects();
    const anchor = anchorRef?.current;
    let ro;
    if (anchor && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measureRects);
      ro.observe(anchor);
    }
    window.addEventListener("resize", measureRects);
    window.addEventListener("scroll", measureRects, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measureRects);
      window.removeEventListener("scroll", measureRects, true);
    };
  }, [anchorRef, measureRects, headers.length]);

  const years = useMemo(() => {
    if (!isDateMode) return [];
    const byYear = new Map();
    dateHeaders.forEach((h, idx) => {
      const m = String(h ?? "").match(/^(\d{4})(?:-(\d{2})(?:-\d{2})?)?$/);
      if (!m) return;
      if (!byYear.has(m[1])) {
        byYear.set(m[1], {
          year: m[1],
          groupIndex: idx,
          months: new Map(),
        });
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
  }, [dateHeaders, isDateMode]);

  const ratioForGroup = useCallback(
    (groupIndex, useCenter = false) => {
      if (headers.length === 0) return 0;
      if (useCenter && layout.centerRatios[groupIndex] != null) {
        return layout.centerRatios[groupIndex];
      }
      if (layout.startRatios[groupIndex] != null) {
        return layout.startRatios[groupIndex];
      }
      return headers.length > 1 ? groupIndex / (headers.length - 1) : 0;
    },
    [headers.length, layout.centerRatios, layout.startRatios],
  );

  const shownYears = useMemo(() => {
    if (!isDateMode || years.length === 0 || headers.length < 2) return [];
    const effH = trackRect?.height > 0 ? trackRect.height : 600;
    const innerH = railInnerHeight(effH);
    // ~1 подпись на 20px полезной высоты (как в Google Photos).
    const maxLabels = Math.min(50, Math.max(2, Math.floor(innerH / 20)));
    const picked =
      years.length <= maxLabels
        ? years
        : years.filter(
            (_, i) => i % Math.ceil(years.length / maxLabels) === 0,
          );
    const withPos = picked.map((entry) => ({
      ...entry,
      labelTopPct: ratioToTopPct(ratioForGroup(entry.groupIndex), effH),
    }));
    const minGapPx = 18;
    const minGapPct = (minGapPx / effH) * 100;
    const result = [];
    for (const entry of withPos) {
      if (
        result.length === 0 ||
        entry.labelTopPct - result[result.length - 1].labelTopPct >= minGapPct
      ) {
        result.push(entry);
      }
    }
    return result;
  }, [isDateMode, years, trackRect?.height, headers.length, ratioForGroup]);

  const jumpToGroup = useCallback(
    (groupIndex) => {
      if (groupIndex === lastJumpRef.current) return;
      lastJumpRef.current = groupIndex;
      virtuosoRef?.current?.scrollToIndex({
        index: groupOffsets[groupIndex] ?? 0,
        align: "start",
        behavior: draggingRef.current ? "auto" : "smooth",
      });
    },
    [groupOffsets, virtuosoRef],
  );

  const trackHeight = trackRect?.height ?? 600;

  const infoByClientY = useCallback(
    (clientY) => {
      const rect = trackRect;
      if (!rect || headers.length === 0) return null;
      const r = clientYToRatio(clientY, rect);
      const index = groupIndexFromRatio(
        r,
        groupOffsets,
        layout.totalRows,
      );
      const yOnRail =
        rect.top + RAIL_PAD_TOP + r * railInnerHeight(rect.height);
      return { index, y: yOnRail, ratio: r };
    },
    [trackRect, headers.length, groupOffsets, layout.totalRows],
  );

  const applyScrub = useCallback(
    (info) => {
      if (!info) return;
      setHoverInfo(info);
      setDragIndex(info.index);
      jumpToGroup(info.index);
    },
    [jumpToGroup],
  );

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    lastJumpRef.current = -1;
    applyScrub(infoByClientY(e.clientY));
  };

  const handlePointerMove = (e) => {
    if (dragging) e.preventDefault();
    const info = infoByClientY(e.clientY);
    if (dragging) {
      applyScrub(info);
    } else if (info) {
      setHoverInfo(info);
    }
  };

  const endDrag = (e) => {
    e?.currentTarget?.releasePointerCapture?.(e.pointerId);
    draggingRef.current = false;
    setDragging(false);
    setDragIndex(null);
    lastJumpRef.current = -1;
  };

  const handlePointerLeave = () => {
    if (!dragging) setHoverInfo(null);
  };

  const allMonths = useMemo(() => {
    if (!isDateMode) return [];
    const list = [];
    years.forEach((entry) => {
      entry.months.forEach(({ month, groupIndex }) => {
        list.push({ year: entry.year, month, groupIndex });
      });
    });
    return list;
  }, [years, isDateMode]);

  const railDots = useMemo(() => {
    if (!isDateMode || allMonths.length === 0 || headers.length < 2) {
      return [];
    }
    const effH = trackRect?.height > 0 ? trackRect.height : 600;
    const shown = new Set(shownYears.map((y) => y.year));
    const mustKeep = new Set();
    years.forEach((entry) => {
      if (!shown.has(entry.year) && entry.months.length > 0) {
        mustKeep.add(entry.months[0].groupIndex);
      }
    });
    const withPos = allMonths.map((entry) => ({
      ...entry,
      ratio: ratioForGroup(entry.groupIndex),
    }));
    const minGap = 12 / Math.max(1, effH);
    const labelHalfPx = 14;
    const underLabel = (ratio) =>
      shownYears.some(
        (y) =>
          Math.abs(
            (ratioToTopPct(ratio, effH) - y.labelTopPct) * 0.01 * effH,
          ) < labelHalfPx,
      );
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
    return result.slice(0, 200);
  }, [
    isDateMode,
    allMonths,
    years,
    shownYears,
    trackRect?.height,
    headers.length,
    ratioForGroup,
  ]);

  const heatmapSegments = useMemo(() => {
    if (headers.length < 2) return [];
    const weights =
      groupWeights?.length === headers.length
        ? groupWeights
        : layout.rowCounts;
    return headers.map((_, i) => ({
      start: layout.startRatios[i] ?? 0,
      end: layout.endRatios[i] ?? 1,
      weight: weights[i] || 1,
    }));
  }, [headers, groupWeights, layout]);

  const previewIndex =
    dragIndex ?? hoverInfo?.index ?? activeGroupIndex;
  const markerRatio = ratioForGroup(
    activeGroupIndex,
    true,
  );
  const scrubRatio =
    hoverInfo?.ratio ??
    (dragIndex != null ? ratioForGroup(dragIndex, true) : markerRatio);
  const showScrubUI = dragging || hoverInfo != null;
  const previewUrl = getPreviewUrl?.(previewIndex);
  const previewLabel = formatHeaderLabel(headers[previewIndex]);

  if (headers.length < 2) return null;

  const trackStyle = anchorRect
    ? {
        position: "fixed",
        top: anchorRect.top,
        height: anchorRect.height,
        right: 0,
        width: 76,
      }
    : {
        position: "fixed",
        top: 100,
        bottom: 60,
        right: 0,
        width: 76,
      };

  const lineRight = 76;

  return (
    <>
      {showScrubUI && hoverInfo && (
        <>
          {showCrosshairLine && (
            <Box
              sx={{
                position: "fixed",
                left: anchorRect?.left ?? 0,
                right: lineRight,
                top: hoverInfo.y,
                height: 1,
                bgcolor: "primary.main",
                opacity: 0.45,
                zIndex: 198,
                pointerEvents: "none",
              }}
            />
          )}
          <Box
            sx={{
              position: "fixed",
              right: lineRight + 4,
              top: hoverInfo.y,
              transform: "translateY(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 1,
              zIndex: 200,
              pointerEvents: "none",
            }}
          >
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                alt=""
                sx={{
                  width: 52,
                  height: 52,
                  objectFit: "cover",
                  borderRadius: 1,
                  boxShadow: 4,
                  border: "2px solid",
                  borderColor: "background.paper",
                }}
              />
            )}
            <Box
              sx={{
                bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
                backdropFilter: "blur(10px)",
                border: "1px solid",
                borderColor: "divider",
                borderLeft: "3px solid",
                borderLeftColor: "primary.main",
                borderRadius: 1.5,
                px: 1.5,
                py: 0.75,
                boxShadow: 4,
                maxWidth: 220,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {previewLabel}
              </Typography>
            </Box>
          </Box>
        </>
      )}

      <Box
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={handlePointerLeave}
        sx={{
          ...trackStyle,
          zIndex: 200,
          cursor: "ns-resize",
          touchAction: "none",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
          pr: 0.75,
          overflow: "visible",
          boxSizing: "border-box",
        }}
      >
        {shownYears.map(({ year, groupIndex, labelTopPct }) => (
          <Typography
            key={year}
            onClick={(e) => {
              e.stopPropagation();
              jumpToGroup(groupIndex);
            }}
            sx={{
              position: "absolute",
              right: 2,
              top: `${labelTopPct.toFixed(3)}%`,
              transform: "translateY(-50%)",
              fontSize: "11px",
              fontWeight: 600,
              color: "text.secondary",
              lineHeight: 1,
              whiteSpace: "nowrap",
              pointerEvents: "auto",
              bgcolor: (t) => alpha(t.palette.background.default, 0.72),
              backdropFilter: "blur(6px)",
              borderRadius: 1,
              px: 0.6,
              py: 0.35,
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
          >
            {year}
          </Typography>
        ))}

        <Box
          sx={{
            width: 8,
            position: "absolute",
            top: RAIL_PAD_TOP,
            bottom: RAIL_PAD_BOTTOM,
            right: 4,
          }}
        >
          {/* heatmap — ширина сегмента ∝ плотность фото */}
          {heatmapSegments.map((seg, i) => {
            const hPct = Math.max(0.15, (seg.end - seg.start) * 100);
            const topPct = seg.start * 100;
            const bulge = 2 + (seg.weight / maxWeight) * 5;
            return (
              <Box
                key={`heat-${i}`}
                sx={{
                  position: "absolute",
                  top: `${topPct}%`,
                  height: `${hPct}%`,
                  right: 0,
                  width: bulge,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                  opacity: 0.35 + (seg.weight / maxWeight) * 0.55,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {railDots.map(({ year, month, groupIndex, ratio: dotRatio }) => (
            <Box
              key={`${year}-${month}-${groupIndex}`}
              onClick={(e) => {
                e.stopPropagation();
                jumpToGroup(groupIndex);
              }}
              sx={{
                position: "absolute",
                top: `${(dotRatio * 100).toFixed(3)}%`,
                right: 1,
                transform: "translateY(-50%)",
                width: 5,
                height: 5,
                borderRadius: "50%",
                bgcolor: (t) => alpha(t.palette.text.primary, 0.4),
                pointerEvents: "auto",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: "primary.main",
                  transform: "translateY(-50%) scale(1.3)",
                },
              }}
            />
          ))}

          {/* маркер текущей позиции (синий, как при выборе даты) */}
          <Box
            sx={{
              position: "absolute",
              top: `${((showScrubUI ? scrubRatio : markerRatio) * 100).toFixed(3)}%`,
              right: -1,
              transform: "translateY(-50%)",
              width: 18,
              height: 4,
              borderRadius: 2,
              bgcolor: "primary.main",
              boxShadow: 2,
              pointerEvents: "none",
              transition: dragging ? "none" : "top 0.12s ease-out",
            }}
          />
        </Box>
      </Box>
    </>
  );
}
