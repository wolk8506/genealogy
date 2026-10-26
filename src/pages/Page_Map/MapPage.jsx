import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
  useTheme,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import usePhotoThumbs from "../../hooks/usePhotoThumbs";
import PhotoFullscreenViewer from "../../components/PhotoFullscreenViewer";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  ZoomControl,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
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
import MapStyleSwitcher, {
  MapBaseTileLayer,
} from "../../components/MapStyleSwitcher";
import { getBaseLayer } from "../../utils/mapLayers";
import { getMyPosition } from "../../utils/geolocate";

const EDIT_PIN_ICON = L.divIcon({
  className: "map-edit-pin",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:rgb(59 134 243);border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.5);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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

function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame = null;
    const invalidate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
    };
    const observer = new ResizeObserver(invalidate);
    observer.observe(container);
    invalidate();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function FlyToLocation({ pos, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!pos || !trigger) return;
    try {
      map.flyTo(pos, Math.max(map.getZoom(), 13), { duration: 0.6 });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}

function EditPin({ pos, onMove, flyTrigger }) {
  const map = useMap();
  useEffect(() => {
    if (!pos || !flyTrigger) return;
    try {
      map.flyTo(pos, Math.max(map.getZoom(), 12), { duration: 0.6 });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTrigger]);

  useMapEvents({
    click(e) {
      onMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!pos) return null;
  return (
    <Marker
      position={pos}
      icon={EDIT_PIN_ICON}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const m = e.target.getLatLng();
          onMove([m.lat, m.lng]);
        },
      }}
    />
  );
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
  const theme = useTheme();
  const zoomBg = theme.palette.glass.surface;
  const zoomBgHover = theme.palette.glass.strong;
  const zoomFg = theme.palette.text.primary;
  const zoomDivider = theme.palette.glass.border;
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
  const [baseLayer, setBaseLayer] = useState("osm");
  const [locatePos, setLocatePos] = useState(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [locating, setLocating] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [editPos, setEditPos] = useState(null);
  const [editQuery, setEditQuery] = useState("");
  const [editSearching, setEditSearching] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFlyTrigger, setEditFlyTrigger] = useState(0);
  const [editConfirming, setEditConfirming] = useState(false);
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
    const hasCoords =
      Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng));
    setEditTarget(p);
    setEditPos(hasCoords ? [Number(p.lat), Number(p.lng)] : null);
    setEditQuery(p?.place || p?.label || "");
    setEditError("");
    setLocationPickerOpen(true);
    if (hasCoords) setEditFlyTrigger((k) => k + 1);
  }, []);

  const handleEditCancel = useCallback(() => {
    setLocationPickerOpen(false);
    setEditTarget(null);
    setEditPos(null);
    setEditError("");
  }, []);

  const handleEditSearch = useCallback(async () => {
    const q = editQuery.trim();
    if (!q) return;
    setEditSearching(true);
    setEditError("");
    try {
      const geo = await window.geoAPI?.forward(q);
      if (geo) {
        setEditPos([geo.lat, geo.lng]);
        setEditFlyTrigger((k) => k + 1);
      } else {
        setEditError("Ничего не найдено");
      }
    } catch (e) {
      setEditError(e?.message || "Ошибка поиска");
    } finally {
      setEditSearching(false);
    }
  }, [editQuery]);

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
          setAllPhotosCache((prev) =>
            prev.map((x) =>
              x.id === photo.id
                ? { ...x, lat, lng, locationName: name || x.locationName || "" }
                : x,
            ),
          );
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

        // Обновляем точку на месте — без перезагрузки карты.
        const cached = getCachedPoints() || points;
        const next = cached.map((p) => {
          if (editTarget.kind === "photo") {
            if (p.kind === "photo" && p.id === editTarget.id) {
              return { ...p, lat, lng, place: name || p.place };
            }
            return p;
          }
          const sameEvent =
            p.kind === "event" &&
            p.personId === editTarget.personId &&
            (editTarget.eventId != null
              ? p.eventId === editTarget.eventId
              : p.eventIndex === editTarget.eventIndex);
          return sameEvent ? { ...p, lat, lng, place: name || p.place } : p;
        });
        setCachedPoints(next);
        setPoints(next);
      } finally {
        setLocationPickerOpen(false);
        setEditTarget(null);
        setEditPos(null);
        setEditError("");
      }
    },
    [editTarget, allPhotosCache, points],
  );

  const handleEditConfirm = useCallback(async () => {
    if (!editPos) return;
    setEditConfirming(true);
    try {
      let name = editTarget?.place || "";
      try {
        const rev = await window.geoAPI
          ?.reverse(editPos[0], editPos[1])
          .catch(() => null);
        name = rev?.name || rev?.displayName || name;
      } catch {
        // ignore
      }
      await saveLocation({ lat: editPos[0], lng: editPos[1], name });
    } finally {
      setEditConfirming(false);
    }
  }, [editPos, editTarget, saveLocation]);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    const result = await getMyPosition();
    setLocating(false);
    if (!result) {
      alert("Не удалось определить местоположение");
      return;
    }
    try {
      localStorage.setItem("myGeoPos", JSON.stringify(result.pos));
    } catch {
      // ignore
    }
    setLocatePos(result.pos);
    setLocateTrigger((t) => t + 1);
  }, []);

  const etaLabel = progress
    ? formatGeocodeEta(progress.done, progress.total)
    : null;

  return (
    <Box
      sx={{
        position: "relative",
        height: "calc(100vh - 50px)",
        overflow: "hidden",
      }}
    >
      <style>{`
        .map-custom-marker{background:transparent!important;border:none!important;}
        .leaflet-top .leaflet-control-zoom{margin-top:104px!important;}
        .leaflet-control-zoom.leaflet-bar{
          border:none!important;
          border-radius:18px!important;
          overflow:hidden!important;
          box-shadow:0 2px 12px rgba(0,0,0,0.22)!important;
        }
        .leaflet-control-zoom a{
          width:36px!important;
          height:36px!important;
          line-height:36px!important;
          font-size:20px!important;
          font-weight:400!important;
          background:${zoomBg}!important;
          color:${zoomFg}!important;
          border:none!important;
          -webkit-backdrop-filter:blur(8px);
          backdrop-filter:blur(8px);
        }
        .leaflet-control-zoom a:hover{
          background:${zoomBgHover}!important;
          color:${zoomFg}!important;
        }
        .leaflet-control-zoom-in{
          border-bottom:1px solid ${zoomDivider}!important;
        }
        .leaflet-popup-content-wrapper{
          background:${zoomBg}!important;
          color:${zoomFg}!important;
          border-radius:12px!important;
          box-shadow:0 6px 20px rgba(0,0,0,0.28)!important;
          -webkit-backdrop-filter:blur(8px);
          backdrop-filter:blur(8px);
        }
        .leaflet-popup-tip{
          background:${zoomBg}!important;
          box-shadow:none!important;
        }
        .leaflet-popup-close-button{
          display:none!important;
        }
        .leaflet-popup-content{
          margin:12px 14px!important;
        }
      `}</style>
      <MapContainer
        center={[55, 60]}
        zoom={3}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#aad3df" }}
      >
        <ZoomControl position="topright" />
        <MapBaseTileLayer layer={getBaseLayer(baseLayer)} />
        <FlyToLocation pos={locatePos} trigger={locateTrigger} />
        <FitBounds points={visiblePoints} fitRequestKey={fitBoundsKey} />
        <RememberView />
        <AutoResize />
        <MapMarkerLayer
          groups={groups}
          focusTarget={focusTarget}
          onItemClick={handlePointClick}
          onEditLocation={handleEditLocation}
        />
        {locationPickerOpen && (
          <EditPin
            pos={editPos}
            onMove={setEditPos}
            flyTrigger={editFlyTrigger}
          />
        )}
      </MapContainer>
      <MapLegend />
      <MapStyleSwitcher
        baseLayer={baseLayer}
        onChange={setBaseLayer}
        showLocate
        onLocate={handleLocate}
        locating={locating}
        sx={{ position: "absolute", top: 12, right: 10, zIndex: 1000 }}
      />

      {locationPickerOpen && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            px: 1.5,
            maxWidth: "calc(100% - 32px)",
            bgcolor: zoomBg,
            color: zoomFg,
            borderRadius: 2,
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <TextField
            size="small"
            autoFocus
            placeholder="Найти место…"
            value={editQuery}
            onChange={(e) => setEditQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSearch();
              if (e.key === "Escape") handleEditCancel();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    size="small"
                    edge="start"
                    title="Найти"
                    onClick={handleEditSearch}
                    disabled={editSearching || !editQuery.trim()}
                    sx={{ color: "inherit" }}
                  >
                    {editSearching ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SearchIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: "10px",
                width: 460,
                maxWidth: "45vw",
                bgcolor: "background.paper",
              },
            }}
          />
          <Tooltip title="Подтвердить">
            <span>
              <IconButton
                onClick={handleEditConfirm}
                disabled={!editPos || editConfirming}
                sx={{ color: "success.main" }}
              >
                {editConfirming ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CheckIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Отмена">
            <IconButton
              onClick={handleEditCancel}
              sx={{ color: "error.main" }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
          {editError && (
            <Typography variant="caption" color="error" sx={{ whiteSpace: "nowrap" }}>
              {editError}
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 16,
          zIndex: 1001,
          pointerEvents: "none",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          bgcolor: zoomBg,
          color: zoomFg,
          borderRadius: 2,
          px: 1.5,
          py: 1,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid",
          borderColor: "divider",
          "&:empty": { display: "none" },
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption">
              Загрузка точек…
            </Typography>
          </Box>
        )}
        {progress && (
          <Box>
            <Typography variant="caption">
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
          <Typography variant="body2">
            Нет точек: добавьте фото с координатами или укажите места у событий.
            Для подложки и геокодинга нужен интернет.
          </Typography>
        )}
      </Box>

      <Tooltip
        title="Координаты фото — из EXIF, названия мест — через Nominatim (с кэшем). Shift+«Обновить» — перегеокодировать."
        arrow
        placement="left"
        slotProps={{ tooltip: { sx: { maxWidth: 320 } } }}
      >
        <IconButton
          size="small"
          sx={{
            position: "absolute",
            bottom: 12,
            right: 10,
            zIndex: 1001,
            width: 36,
            height: 36,
            color: zoomFg,
            bgcolor: zoomBg,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
            "&.MuiIconButton-root:hover:not(.Mui-disabled)": {
              backgroundColor: `${zoomBg} !important`,
              backgroundImage: `linear-gradient(${theme.palette.glass.hover}, ${theme.palette.glass.hover}) !important`,
            },
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

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
    </Box>
  );
}
