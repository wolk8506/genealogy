import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  cloneElement,
} from "react";
import {
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { GroupedVirtuoso } from "react-virtuoso";
import { useNavigate } from "react-router-dom";
import EventIcon from "@mui/icons-material/Event";
import { EVENT_TYPES } from "../Page_Person/Event/EventTypesList";
import TimelineScrubber from "../../components/TimelineScrubber";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import usePhotoThumbs from "../../hooks/usePhotoThumbs";
import { buildTimeline } from "../../utils/timelineGroups";

const THUMB_SIZE = 120;
const EVENT_CARD_WIDTH = THUMB_SIZE * 2 + 8; // как 2 фото + разделитель

function eventTypeIcon(typeName) {
  const found = (EVENT_TYPES || []).find((t) => t.name === typeName);
  return found?.icon || <EventIcon />;
}

function ownerNameOf(allPeople, ownerId) {
  const u = (allPeople || []).find((x) => x.id === ownerId);
  return u
    ? `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim() ||
        "Неизвестно"
    : "Неизвестно";
}

// Веер переполнения: фото веером + счётчик остатка.
function OverflowStack({ photos, count, height, thumbs }) {
  if (count <= 0) return null;
  const fan = (photos || []).slice(0, 3);
  const size = Math.round(height * 0.92);
  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height,
        flexShrink: 0,
      }}
    >
      {fan.map((p, i) => (
        <Box
          key={p.id}
          component="img"
          src={thumbs[p.id]}
          alt=""
          sx={{
            position: "absolute",
            left: 4,
            top: "50%",
            width: size - 8,
            height: size - 8,
            objectFit: "cover",
            borderRadius: 1.5,
            border: "2px solid",
            borderColor: "background.paper",
            boxShadow: 2,
            transform: `translateY(-50%) rotate(${(i - (fan.length - 1) / 2) * 10}deg)`,
          }}
        />
      ))}
      <Box
        sx={{
          position: "absolute",
          right: 0,
          bottom: 0,
          borderRadius: 1.5,
          bgcolor: "rgba(0,0,0,0.72)",
          color: "#fff",
          px: 0.75,
          py: 0.2,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1.4 }}>
          +{count}
        </Typography>
      </Box>
    </Box>
  );
}

function MediaStrip({
  photos,
  events,
  fetchThumb,
  thumbs,
  height = 72,
  photoLimit = 8,
  eventLimit = 3,
  onEventClick,
  eventPersonName,
}) {
  const shownPhotos = (photos || []).slice(0, photoLimit);
  const shownEvents = (events || []).slice(0, eventLimit);
  const overflowPhotos = (photos || []).slice(photoLimit, photoLimit + 3);
  const overflow =
    Math.max(0, (photos || []).length - shownPhotos.length) +
    Math.max(0, (events || []).length - shownEvents.length);

  useEffect(() => {
    shownPhotos.forEach((p) => fetchThumb(p));
    overflowPhotos.forEach((p) => fetchThumb(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ overflow: "hidden", minWidth: 0, flexGrow: 1 }}
    >
      {shownEvents.map((ev, i) => (
        <Box
          key={`ev-${i}`}
          onClick={(e) => {
            e.stopPropagation();
            onEventClick?.(ev);
          }}
          sx={{
            height,
            width: height,
            flexShrink: 0,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            position: "relative",
            overflow: "hidden",
            p: 0.75,
            cursor: onEventClick ? "pointer" : "default",
          }}
        >
          {cloneElement(eventTypeIcon(ev.type), {
            sx: {
              position: "absolute",
              bottom: -8,
              right: -8,
              fontSize: height * 0.75,
              color: "primary.main",
              opacity: 0.08,
              pointerEvents: "none",
            },
          })}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: height > 60 ? "0.72rem" : "0.65rem",
            }}
          >
            {ev.type || "Событие"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: height > 60 ? "0.68rem" : "0.6rem",
            }}
          >
            {eventPersonName?.(ev)}
          </Typography>
        </Box>
      ))}
      {shownPhotos.map((p) => (
        <Box
          key={p.id}
          component="img"
          src={thumbs[p.id]}
          alt=""
          sx={{
            height,
            width: height,
            objectFit: "cover",
            borderRadius: 1.5,
            bgcolor: "action.hover",
            flexShrink: 0,
          }}
        />
      ))}
      <OverflowStack
        photos={overflowPhotos}
        count={overflow}
        height={height}
        thumbs={thumbs}
      />
    </Stack>
  );
}

export default function TimelinePage({
  photos,
  allPeople,
  level,
  setLevel,
  year,
  setYear,
  month,
  setMonth,
  showPhotos,
  showEvents,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const virtuosoRef = useRef(null);
  const pendingFull = useRef(new Set());

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeHeader, setActiveHeader] = useState("");

  const [fullscreen, setFullscreen] = useState(false);
  const [fullIndex, setFullIndex] = useState(0);
  const [fullList, setFullList] = useState([]);
  const [fullPaths, setFullPaths] = useState({});
  const { thumbs, fetchThumb } = usePhotoThumbs();
  // Ширина списка строк — для заполнения ряда по ширине экрана.
  // ResizeObserver + дублирующий window.resize: пересчёт при любом сужении.
  // DEBUG-BADGE ниже — временный, убрать после диагностики.
  const listRef = useRef(null);
  const [listWidth, setListWidth] = useState(0);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth || 0;
      setListWidth((prev) => (prev === w ? prev : w));
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [level]);

  // Сколько фото и плиток событий влезет в ряд: зона счётчиков 167px.
  // События ужимаются первыми, фото — минимум 1 (если есть).
  const photoLimitFor = (stripH, totalPhotos, totalEvents) => {
    const tile = stripH;
    const gap = 6;
    const stackW = Math.round(stripH * 0.92); // как OverflowStack ниже
    const rowGap = 16; // gap: 2 между подписью и полосой
    const usable = Math.max(0, listWidth - 32 - 167 - rowGap);
    const widthOf = (p, e, stacked) => {
      const n = p + e + (stacked ? 1 : 0);
      if (n === 0) return 0;
      return (
        p * tile + e * tile + (stacked ? stackW : 0) + (n - 1) * gap
      );
    };
    const maxEv = Math.min(3, totalEvents);
    const minP = totalPhotos > 0 ? 1 : 0;
    for (let ev = maxEv; ev >= 0; ev--) {
      let p = totalPhotos;
      while (p > 0 && widthOf(p, ev, false) > usable) p -= 1;
      let overflow = totalPhotos - p + (totalEvents - ev);
      if (overflow > 0) {
        while (p > 0 && widthOf(p, ev, true) > usable) p -= 1;
        overflow = totalPhotos - p + (totalEvents - ev);
      }
      if (p >= minP) return { limit: p, evShown: ev };
    }
    return { limit: 0, evShown: 0 };
  };

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const events = useMemo(() => {
    const list = [];
    for (const person of allPeople || []) {
      for (const ev of person.events || []) {
        list.push({ ...ev, personId: person.id });
      }
    }
    return list;
  }, [allPeople]);

  const timeline = useMemo(
    () => buildTimeline(photos || [], events),
    [photos, events],
  );

  const goYears = () => {
    setYear(null);
    setMonth(null);
    setLevel("years");
  };
  const goMonths = (y) => {
    setYear(y ?? null);
    setMonth(null);
    setLevel("months");
  };
  const goDays = (y, m) => {
    if (y !== undefined) setYear(y);
    if (m !== undefined) setMonth(m);
    setLevel("days");
  };

  // Месяцы для уровня months (все или выбранного года).
  const monthsView = useMemo(() => {
    if (year) {
      const y = timeline.years.find((e) => e.year === year);
      return y ? y.months : [];
    }
    return timeline.years.flatMap((y) => y.months);
  }, [timeline, year]);

  // Дни для уровня days: [{ key, label, photos, events }].
  // Фильтры применяются здесь же: пустые дни отбрасываются.
  const daysView = useMemo(() => {
    const days = [];
    const pushMonths = (months) => {
      for (const m of months) {
        for (const d of m.days) {
          const dayPhotos = showPhotos ? d.photos : [];
          const dayEvents = showEvents
            ? timeline.eventsByDay.get(d.key) || []
            : [];
          if (dayPhotos.length === 0 && dayEvents.length === 0) continue;
          days.push({ ...d, photos: dayPhotos, events: dayEvents });
        }
      }
    };
    if (month) {
      const [y, m] = [month.slice(0, 4), month];
      const yearEntry = timeline.years.find((e) => e.year === y);
      const monthEntry = yearEntry?.months.find((e) => e.key === m);
      if (monthEntry) pushMonths([monthEntry]);
    } else if (year) {
      const yearEntry = timeline.years.find((e) => e.year === year);
      if (yearEntry) pushMonths(yearEntry.months);
    } else {
      for (const y of timeline.years) pushMonths(y.months);
    }
    return days;
  }, [timeline, year, month, showPhotos, showEvents]);

  const cols = windowWidth < 1200 ? 3 : windowWidth < 1600 ? 4 : 5;

  // Виртуализация дней: группы по 8 дней для ровных чанков.
  const { dayGroups, dayGroupCounts, dayRows, dayHeaders, dayOffsets } =
    useMemo(() => {
      const perGroup = 8;
      const groups = [];
      const counts = [];
      const rows = [];
      const headers = [];
      const offsets = [];
      let acc = 0;
      for (let i = 0; i < daysView.length; i += perGroup) {
        const chunk = daysView.slice(i, i + perGroup);
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        headers.push(
          chunk.length > 1 ? `${last.label} — ${first.label}` : first.label,
        );
        offsets.push(acc);
        const chunkRows = [];
        for (const day of chunk) {
          const dayPhotos = day.photos;
          for (let k = 0; k < dayPhotos.length; k += cols) {
            chunkRows.push({
              day,
              photos: dayPhotos.slice(k, k + cols),
              firstOfDay: k === 0,
            });
          }
        }
        // Дни без фото, но с событиями — тоже строка.
        for (const day of chunk) {
          if (day.photos.length === 0 && day.events.length > 0) {
            chunkRows.push({ day, photos: [], firstOfDay: true });
          }
        }
        rows.push(...chunkRows);
        counts.push(chunkRows.length);
        acc += chunkRows.length;
        groups.push(chunk);
      }
      // Хвост без даты — отдельной группой в конце (только фото).
      if (
        !month &&
        !year &&
        showPhotos &&
        timeline.undatedPhotos.length > 0
      ) {
        headers.push("Без даты");
        offsets.push(acc);
        const chunkRows = [];
        for (
          let k = 0;
          k < timeline.undatedPhotos.length;
          k += cols
        ) {
          chunkRows.push({
            day: {
              key: "undated",
              label: "Без даты",
              photos: timeline.undatedPhotos.slice(k, k + cols),
              events: [],
            },
            photos: timeline.undatedPhotos.slice(k, k + cols),
          });
        }
        rows.push(...chunkRows);
        counts.push(chunkRows.length);
      }
      return {
        dayGroups: groups,
        dayGroupCounts: counts,
        dayRows: rows,
        dayHeaders: headers,
        dayOffsets: offsets,
      };
    }, [daysView, cols, month, year, timeline.undatedPhotos]);

  const openDayFullscreen = useCallback((dayPhotos, photoId) => {
    setFullList(dayPhotos);
    setFullIndex(Math.max(0, dayPhotos.findIndex((p) => p.id === photoId)));
    setFullscreen(true);
  }, []);

  useEffect(() => {
    if (!fullscreen || !fullList[fullIndex]) return;
    const p = fullList[fullIndex];
    const key = `${p.id}`;
    if (!fullPaths[key] && !pendingFull.current.has(key)) {
      pendingFull.current.add(key);
      window.photoAPI
        ?.getPath(p.owner, p.filename, "webp")
        .then((path) => {
          if (path) setFullPaths((prev) => ({ ...prev, [key]: path }));
        })
        .finally(() => pendingFull.current.delete(key));
    }
  }, [fullscreen, fullIndex, fullList, fullPaths]);

  const handleRangeChanged = useCallback(
    (range) => {
      let cur = 0;
      let acc = 0;
      for (let i = 0; i < dayGroupCounts.length; i++) {
        acc += dayGroupCounts[i];
        if (range.startIndex < acc) {
          cur = i;
          break;
        }
      }
      if (dayHeaders[cur]) setActiveHeader(dayHeaders[cur]);
    },
    [dayGroupCounts, dayHeaders],
  );

  const eventCounts = useMemo(() => {
    const byYear = new Map();
    const byMonth = new Map();
    for (const [key, list] of timeline.eventsByDay) {
      const y = key.slice(0, 4);
      const m = key.slice(0, 7);
      byYear.set(y, (byYear.get(y) || 0) + list.length);
      byMonth.set(m, (byMonth.get(m) || 0) + list.length);
    }
    return { byYear, byMonth };
  }, [timeline]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        bgcolor: "background.default",
        position: "relative",
      }}
    >
      <Box sx={{ flexGrow: 1, mr: 3.5, overflow: "hidden" }}>
        {level === "years" && (
          <Box
            ref={listRef}
            sx={{ height: "100%", overflowY: "auto", px: 2, pb: 2 }}
          >
            <Stack spacing={1.5}>
              {timeline.years.map((y) => {
                const photoCount = showPhotos ? y.count : 0;
                const eventCount = showEvents
                  ? eventCounts.byYear.get(y.year) || 0
                  : 0;
                if (photoCount === 0 && eventCount === 0) return null;
                const sample = showPhotos
                  ? y.months.flatMap((m) =>
                      m.days.flatMap((d) => d.photos),
                    )
                  : [];
                const yearEvents = showEvents
                  ? y.months.flatMap(
                      (m) =>
                        m.days.flatMap(
                          (d) => timeline.eventsByDay.get(d.key) || [],
                        ),
                    )
                  : [];
                const { limit: yearPhotoLimit, evShown: yearEvShown } =
                  photoLimitFor(72, sample.length, yearEvents.length);
                return (
                  <Box
                    key={y.year}
                    onClick={() => goMonths(y.year)}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: isDark
                        ? alpha("#121212", 0.9)
                        : alpha("#f5f5f5", 0.9),
                      cursor: "pointer",
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      overflow: "hidden",
                      minWidth: 0,
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Box sx={{ width: 167, flexShrink: 0 }}>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {y.year}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {[
                          photoCount > 0 ? `Фото: ${photoCount}` : null,
                          eventCount > 0 ? `Событий: ${eventCount}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                    <MediaStrip
                      photos={sample}
                      events={yearEvents}
                      fetchThumb={fetchThumb}
                      thumbs={thumbs}
                      photoLimit={yearPhotoLimit}
                      eventLimit={yearEvShown}
                      onEventClick={(ev) => {
                        const target =
                          ev.personIds?.[0] ?? ev.personId;
                        if (target != null) navigate(`/person/${target}`);
                      }}
                      eventPersonName={(ev) =>
                        (ev.personIds?.length
                          ? ev.personIds
                          : [ev.personId].filter((id) => id != null)
                        )
                          .map((id) => ownerNameOf(allPeople, id))
                          .join(", ")
                      }
                    />
                  </Box>
                );
              })}
              {timeline.years.length === 0 && (
                <Typography color="text.secondary">
                  Нет датированных фото — всё в хвосте «Без даты» на уровне дней.
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {level === "months" && (
          <Box
            ref={listRef}
            sx={{ height: "100%", overflowY: "auto", px: 2, pb: 2 }}
          >
            <Stack spacing={1}>
              {monthsView.map((m) => {
                const photoCount = showPhotos ? m.count : 0;
                const eventCount = showEvents
                  ? eventCounts.byMonth.get(m.key) || 0
                  : 0;
                if (photoCount === 0 && eventCount === 0) return null;
                const sample = showPhotos
                  ? m.days.flatMap((d) => d.photos)
                  : [];
                const monthEvents = showEvents
                  ? m.days.flatMap(
                      (d) => timeline.eventsByDay.get(d.key) || [],
                    )
                  : [];
                const { limit: monthPhotoLimit, evShown: monthEvShown } =
                  photoLimitFor(56, sample.length, monthEvents.length);
                return (
                  <Box
                    key={m.key}
                    onClick={() => goDays(m.key.slice(0, 4), m.key)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: isDark
                        ? alpha("#121212", 0.9)
                        : alpha("#f5f5f5", 0.9),
                      cursor: "pointer",
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      overflow: "hidden",
                      minWidth: 0,
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Box sx={{ width: 167, flexShrink: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {m.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}
                      >
                        {[
                          photoCount > 0 ? `Фото: ${photoCount}` : null,
                          eventCount > 0 ? `Событий: ${eventCount}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                    <MediaStrip
                      photos={sample}
                      events={monthEvents}
                      fetchThumb={fetchThumb}
                      thumbs={thumbs}
                      height={56}
                      photoLimit={monthPhotoLimit}
                      eventLimit={monthEvShown}
                      onEventClick={(ev) => {
                        const target =
                          ev.personIds?.[0] ?? ev.personId;
                        if (target != null) navigate(`/person/${target}`);
                      }}
                      eventPersonName={(ev) =>
                        (ev.personIds?.length
                          ? ev.personIds
                          : [ev.personId].filter((id) => id != null)
                        )
                          .map((id) => ownerNameOf(allPeople, id))
                          .join(", ")
                      }
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {level === "days" && (
          <GroupedVirtuoso
            ref={virtuosoRef}
            style={{ height: "100%" }}
            groupCounts={dayGroupCounts}
            rangeChanged={handleRangeChanged}
            groupContent={(idx) => (
              <Box
                sx={{
                  py: 1,
                  px: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: isDark
                    ? alpha("#121212", 0.9)
                    : alpha("#f5f5f5", 0.9),
                  backdropFilter: "blur(4px)",
                  borderBottom: "1px solid divider",
                  borderRadius: "12px",
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {dayHeaders[idx]}
                </Typography>
              </Box>
            )}
            itemContent={(idx) => {
              const row = dayRows[idx];
              if (!row) return null;
              row.photos.forEach((p) => {
                if (!thumbs[p.id]) fetchThumb(p);
              });
              return (
                <Box sx={{ px: 0, py: 0.5 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ overflowX: "auto", pb: 0.5 }}
                  >
                    {row.photos.map((p) => (
                      <Box
                        key={p.id}
                        component="img"
                        src={thumbs[p.id]}
                        alt={p.title || ""}
                        onClick={() =>
                          openDayFullscreen(
                            row.day.photos.length > 0
                              ? row.day.photos
                              : row.photos,
                            p.id,
                          )
                        }
                        sx={{
                          height: THUMB_SIZE,
                          width: THUMB_SIZE,
                          objectFit: "cover",
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      />
                    ))}
                    {row.firstOfDay &&
                      row.day.events.map((ev, k) => (
                      <Box
                        key={`ev-${k}`}
                        onClick={() => {
                          const target =
                            ev.personIds?.[0] ?? ev.personId;
                          if (target != null)
                            navigate(`/person/${target}`);
                        }}
                        sx={{
                          height: THUMB_SIZE,
                          width: EVENT_CARD_WIDTH,
                          flexShrink: 0,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: isDark
                            ? alpha("#121212", 0.9)
                            : alpha("#f5f5f5", 0.9),
                          position: "relative",
                          overflow: "hidden",
                          p: 1.25,
                          cursor:
                            (ev.personIds?.[0] ?? ev.personId) != null
                              ? "pointer"
                              : "default",
                          "&:hover":
                            (ev.personIds?.[0] ?? ev.personId) != null
                              ? { borderColor: "primary.main" }
                              : undefined,
                        }}
                      >
                        {cloneElement(eventTypeIcon(ev.type), {
                          sx: {
                            position: "absolute",
                            bottom: -12,
                            right: -12,
                            fontSize: 96,
                            color: "primary.main",
                            opacity: 0.07,
                            pointerEvents: "none",
                          },
                        })}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ev.type || "Событие"}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: "block", fontWeight: 600 }}
                        >
                          {(ev.personIds?.length
                            ? ev.personIds
                            : [ev.personId].filter((id) => id != null)
                          )
                            .map((id) => ownerNameOf(allPeople, id))
                            .join(", ")}
                        </Typography>
                        {(ev.date || ev.place) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {[ev.date, ev.place]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            }}
          />
        )}
      </Box>

      <TimelineScrubber
        headers={level === "days" ? dayHeaders : []}
        groupOffsets={level === "days" ? dayOffsets : []}
        activeHeader={activeHeader}
        virtuosoRef={virtuosoRef}
      />

      <PhotoFullscreenViewer
        open={fullscreen}
        index={fullIndex}
        photos={fullList}
        photoPaths={Object.fromEntries(
          fullList.map((p) => [p.id, fullPaths[`${p.id}`]]),
        )}
        thumbPaths={thumbs}
        direction={0}
        hideLabels={false}
        onClose={() => setFullscreen(false)}
        onNext={() =>
          setFullIndex((i) => (i + 1 < fullList.length ? i + 1 : i))
        }
        onPrev={() => setFullIndex((i) => (i - 1 >= 0 ? i - 1 : i))}
        onToggleMaximize={() => {}}
        currentPhotoInfo={fullList[fullIndex] || null}
        allPeople={allPeople}
        allExternal={[]}
      />
    </Box>
  );
}
