import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Popover,
  Tooltip,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { TileLayer } from "react-leaflet";
import { MAP_BASE_LAYERS, getThumbTiles } from "../utils/mapLayers";
import MapFillIcon from "./svg/MapFillIcon";
import GlobeEuropeAfricaIcon from "./svg/GlobeEuropeAfricaIcon";
import GlobeAmericasFillIcon from "./svg/GlobeAmericasFillIcon";
import LocationArrowFillIcon from "./svg/LocationArrowFillIcon";

const LAYER_ICONS = {
  osm: MapFillIcon,
  topo: GlobeEuropeAfricaIcon,
  satellite: GlobeAmericasFillIcon,
};

export function MapBaseTileLayer({ layer }) {
  const props = { url: layer.url, maxZoom: layer.maxZoom };
  if (layer.subdomains?.length) props.subdomains = layer.subdomains;
  return <TileLayer key={layer.id} {...props} />;
}

function LayerThumb({ layer, selected, onSelect, isDark }) {
  const tiles = getThumbTiles(layer);
  return (
    <Box
      onClick={() => onSelect(layer.id)}
      sx={{ width: 76, cursor: "pointer", textAlign: "center", flexShrink: 0 }}
    >
      <Box
        sx={{
          width: 76,
          height: 76,
          borderRadius: "16px",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          bgcolor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          outline: selected ? "3px solid" : "3px solid transparent",
          outlineColor: selected ? "primary.main" : "transparent",
          "& img": {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          },
        }}
      >
        {tiles.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ))}
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 0.5,
          fontWeight: selected ? 700 : 500,
          color: selected ? "primary.main" : "text.primary",
          lineHeight: 1.15,
        }}
      >
        {layer.name}
      </Typography>
    </Box>
  );
}

export default function MapStyleSwitcher({
  baseLayer,
  onChange,
  sx,
  onLocate,
  locating = false,
  showLocate = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const CurrentLayerIcon = LAYER_ICONS[baseLayer] || LAYER_ICONS.osm;

  const glassBg = theme.palette.glass.surface;
  const popoverBg = theme.palette.glass.strong;
  const glassFg = theme.palette.text.primary;
  const hoverBg = theme.palette.glass.hover;
  const btnSx = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: glassFg,
    transition: "background 0.15s",
    "&:hover": { bgcolor: hoverBg },
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          // p: "4px",
          borderRadius: "18px",
          overflow: "hidden",
          bgcolor: glassBg,
          boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          ...sx,
        }}
      >
        <Tooltip title="Режим карты" placement="left">
          <Box onClick={() => setOpen((o) => !o)} sx={btnSx}>
            <CurrentLayerIcon sx={{ fontSize: 16 }} />
          </Box>
        </Tooltip>
        {showLocate && (
          <Tooltip title="Моё местоположение" placement="left">
            <Box
              onClick={onLocate}
              sx={{ ...btnSx, cursor: locating ? "default" : "pointer" }}
            >
                {locating ? (
                  <CircularProgress size={18} sx={{ color: "inherit" }} />
                ) : (
                  <LocationArrowFillIcon sx={{ fontSize: 16 }} />
                )}
            </Box>
          </Tooltip>
        )}
        <Box
          ref={anchorRef}
          sx={{ position: "absolute", top: 60, right: 45, width: 0, height: 0 }}
        />
      </Box>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "center", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "22px",
              p: 2,
              bgcolor: popoverBg,
              color: glassFg,
              backgroundImage: "none",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              overflow: "visible",
              "&::before": {
                content: '""',
                position: "absolute",
                top: "30%",
                right: -9,
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderLeft: `9px solid ${popoverBg}`,
              },
            },
          },
        }}
      >
        <Typography
          sx={{ textAlign: "center", fontWeight: 700, fontSize: "0.95rem", mb: 1.5 }}
        >
          Режимы карты
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25 }}>
          {MAP_BASE_LAYERS.map((layer) => (
            <LayerThumb
              key={layer.id}
              layer={layer}
              isDark={isDark}
              selected={layer.id === baseLayer}
              onSelect={(id) => onChange(id)}
            />
          ))}
        </Box>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 1.75,
            mx: "auto",
            maxWidth: 248,
            textAlign: "center",
            color: glassFg,
            opacity: 0.55,
          }}
        >
          © OpenStreetMap, OpenTopoMap и другие поставщики данных
        </Typography>
      </Popover>
    </>
  );
}
