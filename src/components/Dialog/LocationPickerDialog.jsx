import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  CircularProgress,
  Stack,
  Menu,
  MenuItem,
  Tooltip,
  Snackbar,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlaceIcon from "@mui/icons-material/Place";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import AppButton from "../AppButton";
import MapStyleSwitcher, {
  MapBaseTileLayer,
} from "../MapStyleSwitcher";
import { getBaseLayer } from "../../utils/mapLayers";
import { getMyPosition } from "../../utils/geolocate";
import {
  collectSavedPlaces,
  formatFullAddress,
  formatShortAddress,
  placeKey,
} from "../../utils/address";

const MRU_STORAGE_KEY = "savedPlacesMRU";

// Пин без картинок (дефолтные marker-icon*.png не попадают в бандл vite).
const PIN_ICON = L.divIcon({
  className: "location-picker-pin",
  html: '<div style="width:22px;height:22px;border-radius:50%;background:rgb(59 134 243);border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 10px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:7px;height:7px;border-radius:50%;background:#fff;"></div></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      try {
        map.flyTo(center, Math.max(map.getZoom(), 12), { duration: 0.8 });
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 260);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Пересчёт размеров карты после анимации разворота/сворачивания.
function ResizeOnChange({ expanded }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 340);
    return () => clearTimeout(t);
  }, [expanded, map]);
  return null;
}

function ClickSetter({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Переводит элемент в fixed по заданному прямоугольнику (для FLIP-анимации).
function applyFixedRect(el, rect) {
  el.style.position = "fixed";
  el.style.margin = "0";
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = "1400";
  el.style.borderRadius = "18px";
  el.style.transition =
    "top 320ms cubic-bezier(0.4,0,0.2,1), left 320ms cubic-bezier(0.4,0,0.2,1), width 320ms cubic-bezier(0.4,0,0.2,1), height 320ms cubic-bezier(0.4,0,0.2,1), border-radius 320ms cubic-bezier(0.4,0,0.2,1)";
}

function clearFixedRect(el) {
  el.style.position = "";
  el.style.margin = "";
  el.style.top = "";
  el.style.left = "";
  el.style.width = "";
  el.style.height = "";
  el.style.zIndex = "";
  el.style.borderRadius = "";
  el.style.transition = "";
}

// Пикер точки в стиле iOS: карта-превью + карточка места + поиск,
// подтверждение возвращает координаты + название (reverse-геокодинг).
export default function LocationPickerDialog({
  open,
  onClose,
  initial = null, // { lat, lng } | null
  initialQuery = "",
  onSelect,
}) {
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [place, setPlace] = useState(null); // { name, displayName }
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [baseLayer, setBaseLayer] = useState("osm");
  const [locating, setLocating] = useState(false);
  // Разворот карты на всё окно (grow/shrink-анимация).
  const [expanded, setExpanded] = useState(false);
  // Удерживает место в потоке, пока карта «вынута» в fixed.
  const [pinned, setPinned] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const mapBoxRef = useRef(null);
  const compactRectRef = useRef(null);
  // Последняя известная своя позиция — для стартового центрирования карты.
  const [myPos, setMyPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("myGeoPos"));
      return Array.isArray(saved) && saved.length === 2 ? saved : null;
    } catch {
      return null;
    }
  });
  // Уже сохранённые в приложении места (для повторного выбора).
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [savedQuery, setSavedQuery] = useState("");
  // "picker" — карта и поиск, "saved" — отдельный список сохранённых мест.
  const [view, setView] = useState("picker");
  const [copied, setCopied] = useState(false);

  const readMru = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(MRU_STORAGE_KEY));
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const pushMru = (lat, lng) => {
    const key = placeKey(lat, lng);
    if (!key) return;
    try {
      const next = [key, ...readMru().filter((k) => k !== key)].slice(0, 100);
      localStorage.setItem(MRU_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Подтягиваем все фото и события приложения → уникальные сохранённые места.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [photos, people] = await Promise.all([
          window.photoAPI?.getAllGlobal?.().catch(() => []) || [],
          window.peopleAPI?.getAll?.().catch(() => []) || [],
        ]);
        if (cancelled) return;
        const events = [];
        for (const person of people || []) {
          for (const ev of person.events || []) {
            const lat = Number(ev?.lat);
            const lng = Number(ev?.lng);
            if (lat || lng) {
              events.push({
                lat,
                lng,
                locationName: ev?.place || "",
                date: ev?.date || "",
              });
            }
          }
        }
        const places = collectSavedPlaces(photos || [], events, {
          mru: readMru(),
        });
        if (cancelled) return;
        setSavedPlaces(places);
        // Фоном нормализуем названия из координат (для повторных — из кэша).
        places.slice(0, 60).forEach(async (p) => {
          try {
            const rev = await window.geoAPI?.reverse(p.lat, p.lng);
            if (cancelled || !rev) return;
            const name = formatShortAddress(rev);
            if (!name) return;
            setSavedPlaces((prev) =>
              prev.map((x) => (x.key === p.key ? { ...x, name } : x)),
            );
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setPinned(false);
      return;
    }
    setSearchError("");
    setPlace(null);
    setMenuAnchor(null);
    setView("picker");
    setSavedQuery("");
    setQuery(initialQuery || "");
    if (
      initial &&
      Number.isFinite(Number(initial.lat)) &&
      Number.isFinite(Number(initial.lng))
    ) {
      setPos([Number(initial.lat), Number(initial.lng)]);
    } else {
      setPos(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Живой reverse-геокодинг (с задержкой), чтобы карточка показывала название.
  useEffect(() => {
    if (!pos) {
      setPlace(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const rev = await window.geoAPI?.reverse(pos[0], pos[1]);
        if (!cancelled && rev) {
          setPlace({
            name: formatShortAddress(rev) || rev.name,
            displayName: formatFullAddress(rev) || rev.displayName,
          });
        }
      } catch {
        // ignore
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.[0], pos?.[1]]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const geo = await window.geoAPI?.forward(q);
      if (geo) {
        setPos([geo.lat, geo.lng]);
      } else {
        setSearchError("Ничего не найдено");
      }
    } catch (e) {
      setSearchError(e.message || "Ошибка поиска");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!pos) return;
    setConfirming(true);
    try {
      // Сохраняем полный адрес (displayName), а не короткое название.
      // Имя всегда считаем из координат (единый источник истины).
      const rev = await window.geoAPI
        ?.reverse(pos[0], pos[1])
        .catch(() => null);
      const name =
        formatShortAddress(rev) || rev?.displayName || place?.name || "";
      pushMru(pos[0], pos[1]);
      onSelect?.({ lat: pos[0], lng: pos[1], name });
      onClose?.();
    } finally {
      setConfirming(false);
    }
  };

  const handleLocate = async () => {
    setLocating(true);
    const result = await getMyPosition();
    setLocating(false);
    if (!result) {
      alert("Не удалось определить местоположение");
      return;
    }
    const c = result.pos;
    setMyPos(c);
    try {
      localStorage.setItem("myGeoPos", JSON.stringify(c));
    } catch {}
    setPos(c);
    setPlace(result.name ? { name: result.name, displayName: result.name } : null);
  };

  // Выбор уже сохранённого места — подставляем координаты (имя пересчитается).
  const handlePickSaved = (p) => {
    setPos([p.lat, p.lng]);
    setPlace(p.name ? { name: p.name, displayName: p.name } : null);
    pushMru(p.lat, p.lng);
    setView("picker");
  };

  const handleCopyCoords = async () => {
    if (!pos) return;
    const text = `${pos[0]}, ${pos[1]}`;
    setMenuAnchor(null);
    // В Electron надёжнее системный clipboard через main (IPC).
    if (window.clipboardAPI?.writeText) {
      try {
        await window.clipboardAPI.writeText(text);
        setCopied(true);
        return;
      } catch {
        // переходим к фолбэку
      }
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        return;
      } catch {
        // переходим к фолбэку
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
    } catch {
      // ignore
    }
  };

  // Развернуть карту: фиксируем её текущий прямоугольник и анимируем на всё окно.
  const handleExpand = () => {
    const el = mapBoxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    compactRectRef.current = rect;
    applyFixedRect(el, rect);
    setExpanded(true);
    setPinned(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.top = "0px";
        el.style.left = "0px";
        el.style.width = "100vw";
        el.style.height = "100vh";
        el.style.borderRadius = "0px";
      });
    });
  };

  // Свернуть обратно в исходное окно.
  const handleCollapse = () => {
    const el = mapBoxRef.current;
    const rect = compactRectRef.current;
    setExpanded(false);
    if (!el || !rect) {
      setPinned(false);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.top = `${rect.top}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
        el.style.borderRadius = "18px";
      });
    });
    setTimeout(() => {
      clearFixedRect(el);
      setPinned(false);
    }, 380);
  };

  const handleClose = () => {
    if (expanded) {
      handleCollapse();
      return;
    }
    onClose?.();
  };

  const startCenter = pos || myPos || [55, 60];
  const startZoom = pos ? 12 : myPos ? 11 : 3;

  const title = place?.name || (pos ? "Выбранная точка" : "Точка не выбрана");
  const subtitle =
    place?.displayName ||
    (pos
      ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
      : "Кликните по карте или введите место");

  const savedFilter = savedQuery.trim().toLowerCase();
  const filteredSaved = savedFilter
    ? savedPlaces.filter((p) =>
        (p.name || "").toLowerCase().includes(savedFilter),
      )
    : savedPlaces;

  // Всё, кроме карты, прячем в развёрнутом режиме (остаётся только карта).
  const hiddenSx = {
    visibility: expanded ? "hidden" : "visible",
    opacity: expanded ? 0 : 1,
    transition: "opacity 200ms ease",
  };
  const glassBg = isDark ? "rgba(30, 37, 48, 0.72)" : "rgba(255, 255, 255, 0.86)";
  const glassFg = isDark ? "#fff" : "#1c1c1e";
  const hoverBg = isDark ? "rgba(48, 58, 74, 0.85)" : "rgba(255, 255, 255, 0.95)";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          width: 560,
          maxWidth: "94vw",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2.5, ...hiddenSx }}
        >
          Геопозиции
        </Typography>

        <Box
          ref={mapBoxRef}
          sx={{
            height: 300,
            borderRadius: "18px",
            overflow: "hidden",
            position: "relative",
            bgcolor: "action.hover",
            // Развёрнутая карта перекрывает шапку-«drag» — делаем область кликабельной.
            WebkitAppRegion: "no-drag",
          }}
        >
          <MapContainer
            center={startCenter}
            zoom={startZoom}
            zoomControl={false}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <MapBaseTileLayer layer={getBaseLayer(baseLayer)} />
            <InvalidateSize />
            <ResizeOnChange expanded={expanded} />
            <FlyTo center={pos} />
            <ClickSetter onPick={setPos} />
            {pos && (
              <Marker
                position={pos}
                icon={PIN_ICON}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target.getLatLng();
                    setPos([m.lat, m.lng]);
                  },
                }}
              />
            )}
          </MapContainer>
          <MapStyleSwitcher
            baseLayer={baseLayer}
            onChange={setBaseLayer}
            showLocate
            onLocate={handleLocate}
            locating={locating}
            sx={{ position: "absolute", top: 12, right: 12, zIndex: 1000 }}
          />
          <Tooltip title={expanded ? "Свернуть" : "Развернуть"} placement="right">
            <Box
              onClick={expanded ? handleCollapse : handleExpand}
              sx={{
                position: "absolute",
                // В развёрнутом виде карта уходит под шапку/«светофор» macOS —
                // сдвигаем кнопку вправо и выравниваем по центру системных кнопок.
                bottom: 12,
                left:  12,
                zIndex: 1000,
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: glassFg,
                bgcolor: glassBg,
                boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                transition: "background 0.15s",
                // Кликабельность поверх невидимой шапки (frameless-окно).
                WebkitAppRegion: "no-drag",
                "&:hover": { bgcolor: hoverBg },
              }}
            >
              {expanded ? (
                <FullscreenExitIcon sx={{ fontSize: 18 }} />
              ) : (
                <FullscreenIcon sx={{ fontSize: 18 }} />
              )}
            </Box>
          </Tooltip>
        </Box>

        {pinned && <Box sx={{ height: 300 }} />}

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: "18px",
            bgcolor: "action.hover",
            ...hiddenSx,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PlaceIcon />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "block",
                wordBreak: "break-word",
              }}
            >
              {subtitle}
            </Typography>
          </Box>
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ color: "text.secondary" }}
          >
            <MoreHorizIcon />
          </IconButton>
        </Stack>

        <Typography
          variant="overline"
          sx={{
            display: "block",
            mt: 3,
            mb: 1,
            fontWeight: 700,
            color: "text.secondary",
            ...hiddenSx,
          }}
        >
          Найти место
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Город, адрес или место…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          sx={hiddenSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  size="small"
                  edge="start"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  sx={{ color: "inherit" }}
                >
                  {searching ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SearchIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
            sx: { borderRadius: "12px" },
          }}
        />
        {searchError && (
          <Typography
            variant="caption"
            color="error"
            sx={{ mt: 0.5, display: "block", ...hiddenSx }}
          >
            {searchError}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          pt: 0,
          ...hiddenSx,
        }}
      >
        <AppButton
          preset="secondary"
          onClick={onClose}
          sx={{ px: 2.5, borderRadius: "999px" }}
        >
          Отмена
        </AppButton>
        <AppButton
          preset="primary"
          onClick={handleConfirm}
          disabled={!pos || confirming}
          sx={{ px: 3, borderRadius: "999px" }}
        >
          {confirming ? "Сохранение…" : "Готово"}
        </AppButton>
      </Box>

        {view === "saved" && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2000,
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: "column",
              p: 3,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <IconButton
                size="small"
                onClick={() => setView("picker")}
                sx={{ color: "text.primary" }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Сохранённые места
              </Typography>
            </Stack>
            <TextField
              fullWidth
              size="small"
              placeholder="Поиск мест"
              value={savedQuery}
              onChange={(e) => setSavedQuery(e.target.value)}
              sx={{ mb: 1.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: "12px" },
              }}
            />
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                borderRadius: "14px",
                bgcolor: "action.hover",
                p: 0.5,
              }}
            >
              {filteredSaved.map((p) => (
                <Box
                  key={p.key}
                  onClick={() => handlePickSaved(p)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    p: 1,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <PlaceIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}
                    </Typography>
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
                      {p.count > 1 ? `${p.count} фото` : p.date || ""}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {filteredSaved.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: "block", textAlign: "center", p: 3 }}
                >
                  Ничего не найдено
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {savedPlaces.length > 0 && (
          <MenuItem
            onClick={() => {
              setView("saved");
              setMenuAnchor(null);
            }}
          >
            Сохранённые места
          </MenuItem>
        )}
        <MenuItem onClick={handleCopyCoords} disabled={!pos}>
          Скопировать координаты
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPos(null);
            setPlace(null);
            setMenuAnchor(null);
            onSelect?.({ lat: null, lng: null, name: "" });
            onClose?.();
          }}
        >
          Убрать геопозицию
        </MenuItem>
      </Menu>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Координаты скопированы"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Dialog>
  );
}
