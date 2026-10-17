import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PlaceIcon from "@mui/icons-material/Place";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import AppButton from "../AppButton";

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

function ClickSetter({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
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

  useEffect(() => {
    if (!open) return;
    setSearchError("");
    setPlace(null);
    setMenuAnchor(null);
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
          setPlace({ name: rev.name, displayName: rev.displayName });
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
      let name = place?.name || "";
      if (!name) {
        const rev = await window.geoAPI
          ?.reverse(pos[0], pos[1])
          .catch(() => null);
        name = rev?.name || rev?.displayName || "";
      }
      onSelect?.({ lat: pos[0], lng: pos[1], name });
      onClose?.();
    } finally {
      setConfirming(false);
    }
  };

  const title = place?.name || (pos ? "Выбранная точка" : "Точка не выбрана");
  const subtitle =
    place?.displayName ||
    (pos
      ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`
      : "Кликните по карте или введите место");

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
        >
          Геопозиции
        </Typography>

        <Box
          sx={{
            height: 300,
            borderRadius: "18px",
            overflow: "hidden",
            position: "relative",
            bgcolor: "action.hover",
          }}
        >
          <MapContainer
            center={pos || [55, 60]}
            zoom={pos ? 12 : 3}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <InvalidateSize />
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
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mt: 2, p: 1.5, borderRadius: "18px", bgcolor: "action.hover" }}
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
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
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
            sx={{ mt: 0.5, display: "block" }}
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

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            setPos(null);
            setPlace(null);
            setMenuAnchor(null);
          }}
        >
          Убрать геопозицию
        </MenuItem>
      </Menu>
    </Dialog>
  );
}
