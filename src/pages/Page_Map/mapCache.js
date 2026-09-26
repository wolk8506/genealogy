let cachedPoints = null;
let savedView = null;
let mapFitted = false;

export function getCachedPoints() {
  return cachedPoints;
}

export function setCachedPoints(points) {
  cachedPoints = points;
}

export function invalidateMapCache({ resetView = false } = {}) {
  cachedPoints = null;
  if (resetView) {
    savedView = null;
    mapFitted = false;
  }
}

export function getMapViewState() {
  return { savedView, mapFitted };
}

export function setMapFitted(value) {
  mapFitted = value;
}

export function setSavedView(view) {
  savedView = view;
}
