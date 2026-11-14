# Architecture (for agents)

## Runtime

```mermaid
flowchart LR
  subgraph main [Electron main]
    Handlers[handlers/*.cjs]
    FS[Genealogy folder on disk]
  end
  subgraph preload [preload.js]
    APIs[contextBridge APIs]
  end
  subgraph renderer [React renderer]
    Pages[pages + layout]
    Services[services e.g. face-api]
  end
  Handlers --> FS
  APIs --> Handlers
  Pages --> APIs
  Pages --> Services
```

- **Main**: file I/O, dialogs, Sharp, SQLite (`genealogy.sqlite` via `src/main/db/faceDb.cjs`), JSON under `~/Documents/Genealogy/` and `people/{id}/`.
- **Preload**: `photoAPI`, `peopleAPI`, `faceAPI`, `avatarAPI`, `appAPI`, … — no direct `fs` in renderer.
- **Renderer**: UI, `@vladmandic/face-api` (local models in `public/face-models/`).

## Data layout

```mermaid
flowchart TB
  Root[~/Documents/Genealogy]
  Root --> PeopleJson[genealogy-data.json]
  Root --> Sqlite[genealogy.sqlite]
  Root --> People[people/id/]
  People --> PhotosJson[photos.json]
  People --> PhotosDir[photos/webp thumbs original]
  Sqlite --> FaceRefs[face_references scan_state]
  Sqlite --> Geocode[geocode_cache]
  PhotosJson --> FaceMeta[faces array per photo]
```

- **People list**: `genealogy-data.json` (`schemaVersion` + `people`) — `dataStore.cjs`, atomic writes.
- **Per photo**: `photos.json` face record: `id`, `personId`, `box` (0–1), optional `descriptor`, `suggestedPersonId`, `suggestDistance`.
- **Face index (main)**: `genealogy.sqlite` — reference rows + batch scan state; **geocode** cache in the same DB. Renderer uses `faceAPI` (`face.cjs` → `faceDb.cjs`).
- **Legacy**: on first open, data from `face-index.json` is imported, file renamed to `face-index.migrated-*.json.bak`. Backup/import ZIP includes `genealogy.sqlite` (+ wal/shm).

## Navigation (high level)

```mermaid
flowchart TB
  MainLayout[MainLayout]
  MainLayout --> Home["/ People list"]
  MainLayout --> Gallery["/globalPhotoGallery"]
  MainLayout --> Settings["/settings ArchivedPeoplePage"]
  MainLayout --> Person["/person/:id"]
  Gallery --> PhotoEdit[PhotoMetaUpdateDialog]
  Gallery --> PhotoFS[PhotoFullscreenViewer]
  Settings --> FaceScan[FaceScanMasterCard]
  MainLayout --> FaceReviewRoute["/settings/faces/review"]
  MainLayout --> FaceNoFacesRoute["/settings/faces/no-faces"]
  FaceReviewRoute --> FacesQueueReview[FaceReviewQueuePage]
  FaceNoFacesRoute --> FacesQueueNoFaces[FaceNoFacesQueuePage]
  FacesQueueReview --> FacesQueueView[FacesQueueView mode=review]
  FacesQueueNoFaces --> FacesQueueView
```

- **Face queues** are full-page routes (not a global modal). Shared UI: `FacesQueueView.jsx`; thin wrappers set `mode`: `review` | `noFaces`.
- **Counters**: `useFaceReviewStore` (`pendingCount`, `noFacesCount`) — updated from `MainLayout` when photos load; entry from `FaceScanMasterCard` or notifications → `navigate("/settings/faces/...")`.

## Photos & faces flow

```mermaid
sequenceDiagram
  participant UI as Editor or ScanMaster
  participant Detect as faceRecognition.js
  participant API as photoAPI faceAPI
  participant Disk as photos.json and SQLite
  UI->>Detect: detect on webp URL
  Detect-->>UI: faces + optional suggest
  UI->>API: addOrUpdateOwnerJson
  API->>Disk: merge photo entry
  UI->>API: saveIndex references on confirm
```

**Batch scan**: `FaceScanMasterCard` → `faceScanService.js` → `getAllGlobal` → detect/suggest → `addOrUpdateOwnerJson`.

**Review labels**: user opens `/settings/faces/review` → `FacesQueueView` (`mode="review"`) → confirm `personId` → `addOrUpdateOwnerJson` + `faceAPI.saveIndex` (SQLite references).

**Photos without faces**: `/settings/faces/no-faces` → `FacesQueueView` (`mode="noFaces"`) — queue for scanning/marking.

**Merge person IDs (IPC)**: `faceAPI.mergePersonIds` in `face.cjs` — use only when a UI flow calls it; no dedicated merge dialog in tree today.

## When you change architecture

Propose updates to this file in the same task; **get user approval** before editing (see `AGENTS.md`).
