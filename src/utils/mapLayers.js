export const MAP_BASE_LAYERS = [
  {
    id: "osm",
    name: "Схема",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    subdomains: [],
  },
  {
    id: "topo",
    name: "Топография",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    maxZoom: 17,
    subdomains: ["a", "b", "c"],
  },
  {
    id: "satellite",
    name: "Спутник",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    subdomains: [],
  },
];

export function getBaseLayer(id) {
  return MAP_BASE_LAYERS.find((l) => l.id === id) || MAP_BASE_LAYERS[0];
}

export function fillTileUrl(layer, z, x, y, s = "") {
  return layer.url
    .replace("{s}", s)
    .replace("{z}", z)
    .replace("{x}", x)
    .replace("{y}", y);
}

function lngLatToTile(lng, lat, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

const THUMB_CENTER = { lat: 48.8584, lng: 2.2945 };
const THUMB_ZOOM = 14;

export function getThumbTiles(layer) {
  const { x, y } = lngLatToTile(THUMB_CENTER.lng, THUMB_CENTER.lat, THUMB_ZOOM);
  const subs = layer.subdomains?.length ? layer.subdomains : [""];
  const tiles = [];
  for (let dy = 0; dy < 2; dy += 1) {
    for (let dx = 0; dx < 2; dx += 1) {
      const s = subs[(dx + dy) % subs.length];
      tiles.push(fillTileUrl(layer, THUMB_ZOOM, x + dx, y + dy, s));
    }
  }
  return tiles;
}
