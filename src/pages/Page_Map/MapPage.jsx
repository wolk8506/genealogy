import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import EventIcon from "@mui/icons-material/Event";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    // Автозум — один раз за сессию; дальше видом владеет пользователь.
    if (mapFitted || points.length === 0) return;
    mapFitted = true;
    try {
      map.fitBounds(
        points.map((p) => [p.lat, p.lng]),
        { padding: [40, 40] },
      );
    } catch {
      // одна точка или невалидные координаты — игнорируем
    }
  }, [points, map]);
  return null;
}

function RememberView() {
  const map = useMap();
  useEffect(() => {
    if (savedView) {
      try {
        map.setView(savedView.center, savedView.zoom, { animate: false });
      } catch {
        // игнорируем
      }
    }
    const onMove = () => {
      const c = map.getCenter();
      savedView = { center: [c.lat, c.lng], zoom: map.getZoom() };
    };
    map.on("moveend zoomend", onMove);
    return () => {
      map.off("moveend zoomend", onMove);
    };
  }, [map]);
  return null;
}

function PhotoThumb({ owner, filename, title, compact = false }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let mounted = true;
    window.photoAPI
      ?.getPath(owner, filename, "thumbs")
      .then((p) => {
        if (mounted && p) setSrc(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [owner, filename]);
  if (compact) {
    return (
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1,
          overflow: "hidden",
          flexShrink: 0,
          bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={title || ""}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <CircularProgress size={16} />
        )}
      </Box>
    );
  }
  return (
    <Box sx={{ width: 180 }}>
      {src ? (
        <Box
          component="img"
          src={src}
          alt={title || ""}
          sx={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 1,
            display: "block",
          }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
      <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
        {title || filename}
      </Typography>
    </Box>
  );
}

const norm = (s) => String(s || "").trim().toLowerCase();
const GROUP_PRECISION = 4; // ~11 м: совпавшие места — одна метка

const KIND_COLOR = { photo: "#1976d2", event: "#9c27b0", mixed: "#ed6c02" };

// TTL неудач — зеркало main/handlers/geocode.cjs (MISS_TTL_MS).
const MISS_TTL_MS = 7 * 24 * 3600 * 1000;

// Точки живут на уровне модуля: маршрут размонтируется при уходе со страницы,
// повторный визит должен быть мгновенным без нового шторма запросов.
// Там же храним вьюпорт и факт автозума, чтобы карта не прыгала.
let cachedPoints = null;
let savedView = null; // { center: [lat, lng], zoom }
let mapFitted = false;

export default function MapPage({ showPhotos = true, showEvents = true, refreshKey = 0 }) {
  const [points, setPoints] = useState(() => cachedPoints || []);
  const [loading, setLoading] = useState(() => cachedPoints == null);
  const [progress, setProgress] = useState(null); // { done, total }
  const loadRun = useRef(0);

  const loadData = useCallback(
    async (force = false) => {
      if (force) {
        // Ручное обновление: забываем вид и автозум, пересчитываем всё.
        savedView = null;
        mapFitted = false;
        cachedPoints = null;
      } else if (cachedPoints) {
        // Мгновенно показываем прошлое, ниже — тихая перепроверка
        // локальных данных (удалённое пропадёт, новое подтянется).
        setPoints(cachedPoints);
        setLoading(false);
      }
      const runId = ++loadRun.current;
      if (!cachedPoints) setLoading(true);
      const found = [];
      const queries = new Map(); // norm -> { text, targets: [] }

      const queueQuery = (text, target) => {
        const key = norm(text);
        if (!key) return;
        if (!queries.has(key)) queries.set(key, { text: String(text).trim(), targets: [] });
        queries.get(key).targets.push(target);
      };

      try {
        const [people, photos] = await Promise.all([
          window.peopleAPI?.getAll().catch(() => []) || [],
          window.photoAPI?.getAllGlobal().catch(() => []) || [],
        ]);
        if (loadRun.current !== runId) return;

        const owners = new Map((people || []).map((p) => [p.id, p]));
        const ownerName = (id) => {
          const u = owners.get(id);
          return u
            ? `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim() || "Неизвестно"
            : "Неизвестно";
        };

        // События: координаты сразу, место — через геокодинг.
        for (const person of people || []) {
          for (const ev of person.events || []) {
            const evLat = Number(ev?.lat);
            const evLng = Number(ev?.lng);
            const base = {
              kind: "event",
              place: ev?.place ? String(ev.place).trim() : "",
              label: `${ev?.type || "Событие"} — ${ownerName(person.id)}`,
              sub: ev?.date || "",
            };
            if (
              Number.isFinite(evLat) &&
              Number.isFinite(evLng) &&
              (evLat || evLng)
            ) {
              found.push({ ...base, lat: evLat, lng: evLng });
            } else if (ev?.place) {
              queueQuery(ev.place, base);
            }
          }
        }

        // Фото: координаты сразу, названия — через геокодинг.
        for (const photo of photos || []) {
          const lat = Number(photo.lat);
          const lng = Number(photo.lng);
          const base = {
            kind: "photo",
            label: photo.title || photo.filename || "Фото",
            sub: photo.datePhoto || photo.date || "",
            owner: photo.owner,
            filename: photo.filename,
            id: photo.id,
          };
          if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
            found.push({ ...base, lat, lng });
          } else if (photo.locationName) {
            queueQuery(photo.locationName, base);
          }
        }

        const jobs = Array.from(queries.values());
        // Bulk-кэш одним IPC: известное рисуем сразу, новое — фоном.
        const cache =
          (await window.geoAPI?.getCache().catch(() => ({}))) || {};
        const missing = [];
        for (const job of jobs) {
          const hit = cache[norm(job.text)];
          if (
            hit &&
            !hit.miss &&
            Number.isFinite(Number(hit.lat)) &&
            Number.isFinite(Number(hit.lng))
          ) {
            for (const t of job.targets) {
              found.push({ ...t, lat: Number(hit.lat), lng: Number(hit.lng) });
            }
          } else if (
            !hit?.miss ||
            Date.now() - Date.parse(hit.at) >= MISS_TTL_MS
          ) {
            // miss свежий — пропускаем (ретрай по TTL на бэке);
            // истёкший и отсутствующий — в фоновую очередь
            missing.push(job);
          }
        }

        cachedPoints = found.slice();
        if (loadRun.current === runId) {
          setPoints(found.slice());
          setLoading(false);
          setProgress(
            missing.length > 0 ? { done: 0, total: missing.length } : null,
          );
        }

        let done = 0;
        for (const job of missing) {
          if (loadRun.current !== runId) return;
          try {
            const geo = await window.geoAPI?.forward(job.text);
            if (geo && loadRun.current === runId) {
              const pts = job.targets.map((t) => ({
                ...t,
                lat: geo.lat,
                lng: geo.lng,
              }));
              found.push(...pts);
              cachedPoints = found.slice();
              setPoints(found.slice());
            }
          } catch {
            // недоступен Nominatim/offline — пропускаем точку
          }
          done += 1;
          if (loadRun.current === runId)
            setProgress({ done, total: missing.length });
        }

        if (loadRun.current === runId) setProgress(null);
      } finally {
        if (loadRun.current === runId) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    if (refreshKey > 0) loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const counts = useMemo(() => {
    let photos = 0;
    let events = 0;
    for (const p of points) {
      if (p.kind === "photo") photos += 1;
      else events += 1;
    }
    return { photos, events };
  }, [points]);

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          (p.kind === "photo" && showPhotos) ||
          (p.kind !== "photo" && showEvents),
      ),
    [points, showPhotos, showEvents],
  );

  // Группировка совпадающих точек: одна метка, в попапе — весь список.
  const groups = useMemo(() => {
    const map = new Map();
    for (const p of visiblePoints) {
      const key = `${Number(p.lat).toFixed(GROUP_PRECISION)},${Number(p.lng).toFixed(GROUP_PRECISION)}`;
      if (!map.has(key)) map.set(key, { lat: p.lat, lng: p.lng, items: [] });
      map.get(key).items.push(p);
    }
    return Array.from(map.values());
  }, [visiblePoints]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        position: "relative",
      }}
    >
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Загрузка точек…
            </Typography>
          </Box>
        )}
        {progress && (
          <Box sx={{ mt: 1, maxWidth: 420 }}>
            <Typography variant="caption" color="text.secondary">
              Геокодирование новых: {progress.done}/{progress.total}… (карта уже показана)
            </Typography>
            <LinearProgress
              variant="determinate"
              value={
                progress.total > 0
                  ? Math.round((progress.done / progress.total) * 100)
                  : 0
              }
            />
          </Box>
        )}
        {!loading && points.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Нет точек: добавьте фото с координатами или укажите места у событий.
            Для подложки и геокодинга нужен интернет.
          </Typography>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, mx: 2, mb: 2, borderRadius: 3, overflow: "hidden" }}>
        <MapContainer
          center={[55, 60]}
          zoom={3}
          style={{ height: "100%", width: "100%", background: "#aad3df" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitBounds points={visiblePoints} />
          <RememberView />
          {groups.map((g, i) => {
            const kinds = new Set(g.items.map((p) => p.kind));
            const color =
              kinds.size > 1
                ? KIND_COLOR.mixed
                : KIND_COLOR[g.items[0].kind] || KIND_COLOR.mixed;
            const multi = g.items.length > 1;
            return (
              <CircleMarker
                key={`${g.lat.toFixed(4)},${g.lng.toFixed(4)}-${i}`}
                center={[g.lat, g.lng]}
                radius={multi ? 12 : g.items[0].kind === "photo" ? 7 : 9}
                pathOptions={{
                  color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.7,
                }}
              >
                {multi && (
                  <Tooltip permanent direction="top" offset={[0, -12]} opacity={1}>
                    <span>{g.items.length}</span>
                  </Tooltip>
                )}
                <Popup>
                  {multi ? (
                    <Box
                      sx={{
                        minWidth: 200,
                        maxWidth: 280,
                        maxHeight: 300,
                        overflowY: "auto",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, mb: 1 }}
                      >
                        Здесь: {g.items.length}
                      </Typography>
                      <Stack spacing={1}>
                        {g.items.map((p, j) => (
                          <Box
                            key={`${p.kind}-${p.id ?? p.label}-${j}`}
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            {p.kind === "photo" ? (
                              <PhotoThumb
                                compact
                                owner={p.owner}
                                filename={p.filename}
                                title={p.label}
                              />
                            ) : (
                              <EventIcon
                                fontSize="small"
                                sx={{ color: KIND_COLOR.event }}
                              />
                            )}
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {p.label}
                              </Typography>
                              {(p.sub || p.place) && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block" }}
                                >
                                  {[p.sub, p.place]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : g.items[0].kind === "photo" ? (
                    <PhotoThumb
                      owner={g.items[0].owner}
                      filename={g.items[0].filename}
                      title={g.items[0].label}
                    />
                  ) : (
                    <Box sx={{ minWidth: 150 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {g.items[0].label}
                      </Typography>
                      {g.items[0].sub && (
                        <Typography variant="caption" color="text.secondary">
                          {g.items[0].sub}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ display: "block" }}>
                        📍 {g.items[0].place}
                      </Typography>
                    </Box>
                  )}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2, pb: 1 }}
      >
        Координаты фото — из EXIF, названия мест — через Nominatim (с кэшем).
      </Typography>
    </Box>
  );
}
