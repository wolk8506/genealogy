import {
  detectFacesFromImageUrl,
  suggestPersonsForFaces,
  DEFAULT_MATCH_THRESHOLD,
} from "./faceRecognition";
import {
  normalizeFaces,
  countPendingReviewFaces,
  countNoFacePhotos,
  hasPendingReviewFaces,
} from "../utils/photoFaces";
import {
  normalizeFaceIndex,
  enrichFacesWithDescriptors,
  rebuildFaceIndex,
} from "../utils/faceIndex";

let cancelRequested = false;
let pauseRequested = false;

export function requestFaceScanCancel() {
  cancelRequested = true;
}

export function requestFaceScanPause() {
  pauseRequested = true;
}

export function resumeFaceScanPause() {
  pauseRequested = false;
}

export function resetFaceScanControl() {
  cancelRequested = false;
  pauseRequested = false;
}

function waitWhilePaused() {
  return new Promise((resolve) => {
    const tick = () => {
      if (cancelRequested || !pauseRequested) {
        resolve(!cancelRequested);
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

function yieldToUi() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function filterPhotos(photos, options) {
  const { scope = "all", ownerIds = [], skipWithFaces = true } = options;

  return photos.filter((photo) => {
    if (scope === "owners" && ownerIds.length > 0) {
      if (!ownerIds.includes(Number(photo.owner))) return false;
    }

    const photoFaces = normalizeFaces(photo.faces);

    if (skipWithFaces && (!photoFaces.length || !hasPendingReviewFaces(photoFaces))) {
      return false;
    }

    return Boolean(photo.owner && photo.filename);
  });
}

/**
 * @param {object} options
 * @param {(progress: object) => void} onProgress
 */
export async function runFaceScan(options, onProgress) {
  resetFaceScanControl();

  const {
    mode = "detect",
    matchThreshold = DEFAULT_MATCH_THRESHOLD,
    scope = "all",
    ownerIds = [],
    skipWithFaces = true,
    resumeFromIndex = 0,
  } = options;

  const allPhotos = await window.photoAPI.getAllGlobal();
  const targets = filterPhotos(allPhotos, { scope, ownerIds, skipWithFaces });
  const total = targets.length;

  let index = normalizeFaceIndex(await window.faceAPI.loadIndex());
  const references = index.references;

  let processed = 0;
  let facesFound = 0;
  let skipped = 0;

  onProgress?.({
    current: 0,
    total,
    percent: 0,
    currentFile: "",
    facesFound: 0,
    status: "running",
  });

  for (let i = resumeFromIndex; i < targets.length; i += 1) {
    if (cancelRequested) {
      await window.faceAPI.saveScanState({
        lastRun: new Date().toISOString(),
        processed,
        skipped,
        total,
        resumeFromIndex: i,
        options,
        cancelled: true,
      });
      onProgress?.({
        current: processed,
        total,
        percent: total ? Math.round((processed / total) * 100) : 0,
        currentFile: "",
        facesFound,
        status: "cancelled",
      });
      return { cancelled: true, processed, facesFound, skipped };
    }

    if (pauseRequested) {
      const shouldContinue = await waitWhilePaused();
      if (!shouldContinue) {
        await window.faceAPI.saveScanState({
          lastRun: new Date().toISOString(),
          processed,
          skipped,
          total,
          resumeFromIndex: i,
          options,
          paused: true,
        });
        onProgress?.({
          current: processed,
          total,
          percent: total ? Math.round((processed / total) * 100) : 0,
          currentFile: "",
          facesFound,
          status: "paused",
        });
        return { paused: true, processed, facesFound, skipped, resumeFromIndex: i };
      }
    }

    const photo = targets[i];

    try {
      const imageUrl = await window.photoAPI.getPath(
        photo.owner,
        photo.filename,
        "webp",
      );

      if (!imageUrl) {
        skipped += 1;
        continue;
      }

      onProgress?.({
        current: processed,
        total,
        percent: total ? Math.round((processed / total) * 100) : 0,
        currentFile: photo.filename,
        facesFound,
        status: "running",
      });

      const { faces: detected, imageSize } = await detectFacesFromImageUrl(
        imageUrl,
        { withDescriptors: mode === "identify", applyNmsFilter: true },
      );

      let faces = detected;

      if (mode === "identify" && references.length > 0) {
        faces = suggestPersonsForFaces(faces, references, matchThreshold);
      }

      if (faces.length === 0) {
        await window.photoAPI.addOrUpdateOwnerJson(photo.owner, {
          ...photo,
          faceScanNoFaces: true,
          faceScanAt: new Date().toISOString(),
        });
        processed += 1;
        await yieldToUi();
        continue;
      }

      facesFound += faces.length;

      const updatedEntry = {
        ...photo,
        imageSize,
        faces,
      };

      await window.photoAPI.addOrUpdateOwnerJson(photo.owner, updatedEntry);
      processed += 1;

      if (processed % 20 === 0) {
        await window.faceAPI.saveScanState({
          lastRun: new Date().toISOString(),
          processed,
          skipped,
          total,
          resumeFromIndex: i + 1,
          options,
        });
      }
    } catch (e) {
      console.warn(`Ошибка сканирования ${photo.filename}:`, e);
      skipped += 1;
    }

    await yieldToUi();
  }

  const refreshedPhotos = await window.photoAPI.getAllGlobal();
  const pendingReview = countPendingReviewFaces(refreshedPhotos);
  const noFacePhotos = countNoFacePhotos(refreshedPhotos);

  index = normalizeFaceIndex(await window.faceAPI.loadIndex());
  index.scanState = {
    lastRun: new Date().toISOString(),
    processed,
    skipped,
    total,
    facesFound,
    pendingReview,
    noFacePhotos,
    completed: true,
  };
  await window.faceAPI.saveIndex(index);

  onProgress?.({
    current: processed,
    total,
    percent: 100,
    currentFile: "",
    facesFound,
    status: "completed",
  });

  return {
    success: true,
    processed,
    facesFound,
    skipped,
    pendingReview,
    noFacePhotos,
  };
}

export async function rebuildReferencesFromDatabase(allPeople = []) {
  const peopleList =
    Array.isArray(allPeople) && allPeople.length > 0
      ? allPeople
      : (await window.peopleAPI?.getAll?.()) || [];
  const externalList = (await window.externalAPI?.getAll?.()) || [];
  const photos = await window.photoAPI.getAllGlobal();
  const index = await rebuildFaceIndex(photos, peopleList, externalList);
  await window.faceAPI.saveIndex(index);
  return index;
}

export async function ensureFaceReferencesReady(allPeople = []) {
  const index = normalizeFaceIndex(await window.faceAPI.loadIndex());
  if (Array.isArray(index.references) && index.references.length > 0) {
    return { rebuilt: false, index };
  }

  const rebuilt = await rebuildReferencesFromDatabase(allPeople);
  return { rebuilt: true, index: normalizeFaceIndex(rebuilt) };
}

export async function ensurePhotoFaceDescriptors(photo) {
  const imageUrl = await window.photoAPI.getPath(
    photo.owner,
    photo.filename,
    "webp",
  );
  if (!imageUrl) return normalizeFaces(photo.faces);

  return enrichFacesWithDescriptors(
    imageUrl,
    photo.faces,
    photo.imageSize,
  );
}
