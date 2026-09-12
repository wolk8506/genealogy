import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MapIcon from "@mui/icons-material/Map";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import AppButton from "../AppButton";

// Пин без картинок (дефолтные marker-icon*.png не попадают в бандл vite).
const PIN_ICON = L.divIcon({
  className: "location-picker-pin",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#1976d2;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.5);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      try {
        map.flyTo(center, Math.max(map.getZoom(), 10), { duration: 0.8 });
      } catch {
        // игнорируем
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1]]);
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

// Пикер точки на карте: клик/перетаскивание маркера, поиск названия,
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
  const [resolvedName, setResolvedName] = useState("");
  const markerTouched = useRef(false);

  useEffect(() => {
    if (open) {
      markerTouched.current = false;
      setResolvedName("");
      setSearchError("");
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const geo = await window.geoAPI?.forward(q);
      if (geo) {
        markerTouched.current = true;
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
      const rev = await window.geoAPI
        ?.reverse(pos[0], pos[1])
        .catch(() => null);
      const name = rev?.name || rev?.displayName || "";
      setResolvedName(name);
      onSelect?.({ lat: pos[0], lng: pos[1], name });
      onClose?.();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, height: "80vh" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <MapIcon color="primary" />
        Указать точку на карте
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Найти место…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: "10px" },
            }}
          />
          <AppButton
            preset="secondary"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
          >
            {searching ? <CircularProgress size={16} /> : "Найти"}
          </AppButton>
        </Box>
        {searchError && (
          <Typography variant="caption" color="error">
            {searchError}
          </Typography>
        )}
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 320,
            borderRadius: 2,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <MapContainer
            center={pos || [55, 60]}
            zoom={pos ? 10 : 3}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
            <FlyTo center={pos} />
            <ClickSetter
              onPick={(p) => {
                markerTouched.current = true;
                setPos(p);
              }}
            />
            {pos && (
              <Marker
                position={pos}
                icon={PIN_ICON}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target.getLatLng();
                    markerTouched.current = true;
                    setPos([m.lat, m.lng]);
                  },
                }}
              />
            )}
          </MapContainer>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {pos
            ? `Выбрано: ${pos[0].toFixed(5)}, ${pos[1].toFixed(5)} — клик по карте или перетаскивание маркера`
            : "Кликните по карте, чтобы поставить точку"}
          {resolvedName ? ` · ${resolvedName}` : ""}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <AppButton preset="ghost" onClick={onClose}>
          Отмена
        </AppButton>
        <AppButton
          preset="primary"
          onClick={handleConfirm}
          disabled={!pos || confirming}
        >
          {confirming ? "Определение…" : "Выбрать точку"}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
