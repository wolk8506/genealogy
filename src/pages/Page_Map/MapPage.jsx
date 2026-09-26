import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import usePhotoThumbs from "../../hooks/usePhotoThumbs";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import LocationPickerDialog from "../../components/Dialog/LocationPickerDialog";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import {
  getCachedPoints,
  setCachedPoints,
  invalidateMapCache,
  getMapViewState,
  setMapFitted,
  setSavedView,
} from "./mapCache";
import {
  norm,
  GROUP_PRECISION,
  MISS_TTL_MS,
  pointKey,
  locationKeyFromPoint,
  formatGeocodeEta,
} from "./mapHelpers";
import MapLegend from "./MapLegend";
import MapMarkerLayer from "./MapMarkerLayer";

function FitBounds({ points, fitRequestKey = 0 }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const manual = fitRequestKey > 0;
    if (!manual && getMapViewState().mapFitted) return;
    if (!manual) setMapFitted(true);
    try {
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 12);
      } else {
        map.fitBounds(
          points.map((p) => [p.lat, p.lng]),
          { padding: [40, 40] },
        );
      }
    } catch {
      // ignore
    }
  }, [points, map, fitRequestKey]);
  return null;
}

function RememberView() {
  const map = useMap();
  useEffect(() => {
    const { savedView } = getMapViewState();
    if (savedView) {
      try {
        map.setView(savedView.center, savedView.zoom, { animate: false });
      } catch {
        // ignore
      }
    }
    const onMove = () => {
      const c = map.getCenter();
      setSavedView({ center: [c.lat, c.lng], zoom: map.getZoom() });
    };
    map.on("moveend zoomend", onMove);
    return () => {
      map.off("moveend zoomend", onMove);
    };
  }, [map]);
  return null;
}

export default function MapPage({
  showPhotos = true,
  showEvents = true,
  showExternal = true,
  refreshKey = 0,
  clearGeocodeKey = 0,
  dataRevision = 0,
  selectedPeopleIds = [],
  fitBoundsKey = 0,
  focusPointKey = null,
  focusTrigger = 0,
  onStatsChange,
  allPeople = [],
}) {
  const navigate = useNavigate();
  const { thumbs } = usePhotoThumbs();
  const [points, setPoints] = useState(() => getCachedPoints() || []);
  const [allPhotosCache, setAllPhotosCache] = useState([]);
  const [loading, setLoading] = useState(() => getCachedPoints() == null);
  const [progress, setProgress] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState([]);
  const [fullIndex, setFullIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const [fullPaths, setFullPaths] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const loadRun = useRef(0);
  const pendingFull = useRef(new Set());

  const loadData = useCallback(async (force = false, skipGeocodeCache = false) => {
    if (force) {
      invalidateMapCache({ resetView: true });
    } else if (getCachedPoints()) {
      setPoints(getCachedPoints());
      setLoading(false);
    }
    const runId = ++loadRun.current;
    if (!getCachedPoints()) setLoading(true);
    const found = [];
    const queries = new Map();

    const queueQuery = (text, target) => {
      const key = norm(text);
      if (!key) return;
      if (!queries.has(key)) {
        queries.set(key, { text: String(text).trim(), targets: [] });
      }
      queries.get(key).targets.push(target);
    };

    try {
      if (skipGeocodeCache) {
        await window.geoAPI?.clearCache?.();
      }

      const [people, photos, external] = await Promise.all([
        window.peopleAPI?.getAll().catch(() => []) || [],
        window.photoAPI?.getAllGlobal().catch(() => []) || [],
        window.externalAPI?.getAll().catch(() => []) || [],
      ]);
      if (loadRun.current !== runId) return;

      setAllPhotosCache(photos || []);

      const owners = new Map((people || []).map((p) => [p.id, p]));
      const ownerName = (id) => {
        const u = owners.get(id);
        return u
          ? `${u.lastName || u.maidenName || ""} ${u.firstName || ""}`.trim() ||
              "Неизвестно"
          : "Неизвестно";
      };

      for (const person of people || []) {
        (person.events || []).forEach((ev, eventIndex) => {
          const evLat = Number(ev?.lat);
          const evLng = Number(ev?.lng);
          const eventType =
            typeof ev?.type === "object" ? ev.type?.name : ev?.type || "Событие";
          const base = {
            kind: "event",
            personId: person.id,
            eventId: ev.id ?? null,
            eventIndex,
            eventType,
            place: ev?.place ? String(ev.place).trim() : "",
            label: `${eventType} — ${ownerName(person.id)}`,
            sub: ev?.date || "",
          };
          base.key = pointKey(base);
          if (
            Number.isFinite(evLat) &&
            Number.isFinite(evLng) &&
            (evLat || evLng)
          ) {
            found.push({ ...base, lat: evLat, lng: evLng });
          } else if (ev?.place) {
            queueQuery(ev.place, base);
          }
        });
      }

      for (const photo of photos || []) {
        const lat = Number(photo.lat);
        const lng = Number(photo.lng);
        const base = {
          kind: "photo",
          key: pointKey({ kind: "photo", id: photo.id }),
          label: photo.title || photo.filename || "Фото",
          sub: photo.datePhoto || photo.date || "",
          owner: photo.owner,
          filename: photo.filename,
          id: photo.id,
          people: photo.people || [],
          place: photo.locationName || "",
        };
        if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) {
          found.push({ ...base, lat, lng });
        } else if (photo.locationName) {
          queueQuery(photo.locationName, base);
        }
      }

      for (const entity of external || []) {
        if (entity.archived || !entity.address?.trim()) continue;
        const base = {
          kind: "external",
          key: pointKey({ kind: "external", externalId: entity.id }),
          externalId: entity.id,
          place: entity.address.trim(),
          label: entity.name || entity.id,
          sub: "Справочник",
        };
        queueQuery(entity.address, base);
      }

      const jobs = Array.from(queries.values());
      const cache = (await window.geoAPI?.getCache().catch(() => ({}))) || {};
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
          missing.push(job);
        }
      }

      setCachedPoints(found.slice());
      if (loadRun.current === runId) {
        setPoints(found.slice());
        setLoading(false);
        setProgress(
          missing.length > 0
            ? { done: 0, total: missing.length, startedAt: Date.now() }
            : null,
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
            setCachedPoints(found.slice());
            setPoints(found.slice());
          }
        } catch {
          // offline
        }
        done += 1;
        if (loadRun.current === runId) {
          setProgress({
            done,
            total: missing.length,
            startedAt: Date.now(),
          });
        }
      }

      if (loadRun.current === runId) setProgress(null);
    } finally {
      if (loadRun.current === runId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  useEffect(() => {
    if (refreshKey > 0) loadData(true, clearGeocodeKey > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, clearGeocodeKey]);

  const prevDataRevision = useRef(null);
  useEffect(() => {
    if (prevDataRevision.current === null) {
      prevDataRevision.current = dataRevision;
      return;
    }
    if (prevDataRevision.current === dataRevision) return;
    prevDataRevision.current = dataRevision;
    invalidateMapCache();
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRevision]);

  const selectedSet = useMemo(
    () => new Set(selectedPeopleIds),
    [selectedPeopleIds],
  );

  const matchesPersonFilter = useCallback(
    (p) => {
      if (p.kind === "external") return true;
      if (selectedSet.size === 0) return true;
      if (p.kind === "event") return selectedSet.has(p.personId);
      if (p.kind === "photo") {
        if (selectedSet.has(p.owner)) return true;
        return (p.people || []).some((id) => selectedSet.has(id));
      }
      return false;
    },
    [selectedSet],
  );

  const counts = useMemo(() => {
    let photos = 0;
    let events = 0;
    let external = 0;
    for (const p of points) {
      if (p.kind === "photo") photos += 1;
      else if (p.kind === "external") external += 1;
      else events += 1;
    }
    return { photos, events, external };
  }, [points]);

  const visiblePoints = useMemo(
    () =>
      points.filter(
        (p) =>
          matchesPersonFilter(p) &&
          ((p.kind === "photo" && showPhotos) ||
            (p.kind === "event" && showEvents) ||
            (p.kind === "external" && showExternal)),
      ),
    [points, showPhotos, showEvents, showExternal, matchesPersonFilter],
  );

  const visibleCounts = useMemo(() => {
    let photos = 0;
    let events = 0;
    let external = 0;
    for (const p of visiblePoints) {
      if (p.kind === "photo") photos += 1;
      else if (p.kind === "external") external += 1;
      else events += 1;
    }
    return { photos, events, external };
  }, [visiblePoints]);

  const listPoints = useMemo(() => {
    const other = [];
    const photosByLoc = new Map();

    for (const p of visiblePoints) {
      if (p.kind !== "photo") {
        other.push({
          key: p.key || pointKey(p),
          kind: p.kind,
          label: p.label,
          sub: p.sub,
          place: p.place,
          lat: p.lat,
          lng: p.lng,
          photoIds: null,
          photoCount: 0,
          isPhotoGroup: false,
        });
        continue;
      }
      const lk = locationKeyFromPoint(p);
      if (!photosByLoc.has(lk)) photosByLoc.set(lk, []);
      photosByLoc.get(lk).push(p);
    }

    const photoItems = [];
    for (const [lk, photos] of photosByLoc) {
      const place =
        photos.find((x) => x.place)?.place ||
        photos[0]?.place ||
        lk;
      if (photos.length === 1) {
        const p = photos[0];
        photoItems.push({
          key: p.key || pointKey(p),
          kind: "photo",
          label: p.label,
          sub: p.sub,
          place,
          lat: p.lat,
          lng: p.lng,
          photoIds: [p.id],
          photoCount: 1,
          isPhotoGroup: false,
        });
      } else {
        photoItems.push({
          key: `photo-group-${lk}`,
          kind: "photo",
          isPhotoGroup: true,
          label: `${photos.length} фото`,
          sub: photos
            .map((x) => x.label)
            .filter(Boolean)
            .slice(0, 2)
            .join(" · "),
          place,
          lat: photos[0].lat,
          lng: photos[0].lng,
          photoIds: photos.map((x) => x.id),
          photoCount: photos.length,
        });
      }
    }

    return [...other, ...photoItems].sort((a, b) =>
      (a.place || a.label || "").localeCompare(b.place || b.label || ""),
    );
  }, [visiblePoints]);

  const peopleOnMap = useMemo(() => {
    const ids = new Set();
    for (const p of points) {
      if (p.kind === "event" && p.personId != null) ids.add(p.personId);
      if (p.kind === "photo") {
        if (p.owner != null) ids.add(p.owner);
        for (const id of p.people || []) ids.add(id);
      }
    }
    return ids;
  }, [points]);

  useEffect(() => {
    onStatsChange?.({
      photoCount: counts.photos,
      eventCount: counts.events,
      externalCount: counts.external,
      visiblePhotoCount: visibleCounts.photos,
      visibleEventCount: visibleCounts.events,
      visibleExternalCount: visibleCounts.external,
      loading,
      peopleIds: [...peopleOnMap],
      listPoints,
    });
  }, [
    counts.photos,
    counts.events,
    counts.external,
    visibleCounts.photos,
    visibleCounts.events,
    visibleCounts.external,
    loading,
    peopleOnMap,
    listPoints,
    onStatsChange,
  ]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of visiblePoints) {
      const key = locationKeyFromPoint(p);
      if (!map.has(key)) map.set(key, { lat: p.lat, lng: p.lng, items: [] });
      map.get(key).items.push(p);
    }
    return Array.from(map.values());
  }, [visiblePoints]);

  const focusTarget = useMemo(() => {
    if (!focusPointKey) return null;
    const fromList = listPoints.find((x) => x.key === focusPointKey);
    if (fromList?.lat != null && fromList?.lng != null) {
      return { lat: fromList.lat, lng: fromList.lng, trigger: focusTrigger };
    }
    const p = visiblePoints.find((x) => (x.key || pointKey(x)) === focusPointKey);
    if (!p) return null;
    return { lat: p.lat, lng: p.lng, trigger: focusTrigger };
  }, [focusPointKey, focusTrigger, listPoints, visiblePoints]);

  const openPhoto = useCallback(
    (photoId) => {
      const point = points.find((p) => p.kind === "photo" && p.id === photoId);
      if (!point) return;

      const locKey = locationKeyFromPoint(point);
      const idsAtPlace = points
        .filter(
          (p) =>
            p.kind === "photo" &&
            p.id != null &&
            locationKeyFromPoint(p) === locKey,
        )
        .map((p) => p.id);

      const grouped = allPhotosCache
        .filter((p) => idsAtPlace.includes(p.id))
        .sort((a, b) =>
          (b.datePhoto || b.date || "").localeCompare(
            a.datePhoto || a.date || "",
          ),
        );

      const idx = grouped.findIndex((p) => p.id === photoId);
      if (idx < 0) return;

      setViewerPhotos(grouped);
      setSlideDirection(0);
      setFullIndex(idx);
      setFullscreen(true);
    },
    [points, allPhotosCache],
  );

  const handlePhotoNext = useCallback(() => {
    setSlideDirection(1);
    setFullIndex((idx) =>
      idx + 1 < viewerPhotos.length ? idx + 1 : idx,
    );
  }, [viewerPhotos.length]);

  const handlePhotoPrev = useCallback(() => {
    setSlideDirection(-1);
    setFullIndex((idx) => (idx - 1 >= 0 ? idx - 1 : idx));
  }, []);

  useEffect(() => {
    if (!fullscreen || !viewerPhotos[fullIndex]) return;
    const p = viewerPhotos[fullIndex];
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
  }, [fullscreen, fullIndex, viewerPhotos, fullPaths]);

  const handlePointClick = useCallback(
    (p) => {
      if (p.kind === "photo" && p.id != null) {
        openPhoto(p.id);
        return;
      }
      if (p.kind === "event" && p.personId != null) {
        navigate(`/person/${p.personId}`);
        return;
      }
      if (p.kind === "external" && p.externalId) {
        navigate(`/external?selected=${encodeURIComponent(p.externalId)}`);
      }
    },
    [navigate, openPhoto],
  );

  const handleEditLocation = useCallback((p) => {
    setEditTarget(p);
    setLocationPickerOpen(true);
  }, []);

  const saveLocation = useCallback(
    async ({ lat, lng, name }) => {
      if (!editTarget) return;
      const now = new Date().toISOString();
      try {
        if (editTarget.kind === "photo") {
          const photo = allPhotosCache.find((x) => x.id === editTarget.id);
          if (!photo) return;
          await window.photoAPI.addOrUpdateOwnerJson(photo.owner, {
            ...photo,
            lat,
            lng,
            locationName: name || photo.locationName || "",
          });
        } else if (editTarget.kind === "event") {
          const people = await window.peopleAPI.getAll();
          const person = people.find((x) => x.id === editTarget.personId);
          if (!person) return;
          const events = (person.events || []).map((ev, i) => {
            const matches =
              editTarget.eventId != null
                ? ev.id === editTarget.eventId
                : i === editTarget.eventIndex;
            return matches
              ? {
                  ...ev,
                  lat,
                  lng,
                  place: name || ev.place || "",
                  editedAt: now,
                }
              : ev;
          });
          await window.peopleAPI.saveAll(
            people.map((p) =>
              p.id === person.id ? { ...person, events, editedAt: now } : p,
            ),
          );
        }
        invalidateMapCache();
        await loadData(true);
      } finally {
        setLocationPickerOpen(false);
        setEditTarget(null);
      }
    },
    [editTarget, allPhotosCache, loadData],
  );

  const etaLabel = progress
    ? formatGeocodeEta(progress.done, progress.total)
    : null;

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
          <Box sx={{ mt: 1, maxWidth: 480 }}>
            <Typography variant="caption" color="text.secondary">
              Геокодирование: {progress.done}/{progress.total}
              {etaLabel ? ` · осталось ${etaLabel}` : ""} (карта уже показана)
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

      <Box sx={{ flexGrow: 1, mx: 2, mb: 2, borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <style>{`.map-custom-marker{background:transparent!important;border:none!important;}`}</style>
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
          <FitBounds points={visiblePoints} fitRequestKey={fitBoundsKey} />
          <RememberView />
          <MapMarkerLayer
            groups={groups}
            focusTarget={focusTarget}
            onItemClick={handlePointClick}
            onEditLocation={handleEditLocation}
          />
        </MapContainer>
        <MapLegend />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1 }}>
        Координаты фото — из EXIF, названия мест — через Nominatim (с кэшем).
        Shift+«Обновить» — перегеокодировать.
      </Typography>

      <PhotoFullscreenViewer
        open={fullscreen}
        index={fullIndex}
        photos={viewerPhotos}
        photoPaths={Object.fromEntries(
          viewerPhotos.map((p) => [p.id, fullPaths[`${p.id}`]]),
        )}
        thumbPaths={thumbs}
        direction={slideDirection}
        hideLabels={false}
        onClose={() => setFullscreen(false)}
        onNext={handlePhotoNext}
        onPrev={handlePhotoPrev}
        onToggleMaximize={() => {}}
        currentPhotoInfo={viewerPhotos[fullIndex] || null}
        allPeople={allPeople}
        allExternal={[]}
      />

      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => {
          setLocationPickerOpen(false);
          setEditTarget(null);
        }}
        initial={
          editTarget?.lat != null && editTarget?.lng != null
            ? { lat: editTarget.lat, lng: editTarget.lng }
            : null
        }
        initialQuery={editTarget?.place || editTarget?.label || ""}
        onSelect={saveLocation}
      />
    </Box>
  );
}
