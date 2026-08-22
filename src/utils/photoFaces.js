export function createFaceId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultFace() {
  return {
    id: createFaceId(),
    personId: null,
    box: { x: 0.35, y: 0.3, w: 0.2, h: 0.25 },
  };
}

export function normalizeFaces(faces) {
  if (!Array.isArray(faces)) return [];
  return faces
    .filter((f) => f && f.box)
    .map((f) => {
      const face = {
        id: f.id || createFaceId(),
        personId: f.personId ?? null,
        box: {
          x: Number(f.box.x) || 0,
          y: Number(f.box.y) || 0,
          w: Number(f.box.w) || 0.1,
          h: Number(f.box.h) || 0.1,
        },
      };

      if (Array.isArray(f.descriptor) && f.descriptor.length > 0) {
        face.descriptor = f.descriptor.map(Number);
      }

      if (f.suggestedPersonId != null && f.suggestedPersonId !== "") {
        const numericSuggested = Number(f.suggestedPersonId);
        if (!Number.isNaN(numericSuggested)) {
          face.suggestedPersonId = numericSuggested;
        } else if (String(f.suggestedPersonId).startsWith("E")) {
          face.suggestedExternalEntityId = String(f.suggestedPersonId);
        }
      }

      if (f.suggestedExternalEntityId) {
        face.suggestedExternalEntityId = String(f.suggestedExternalEntityId);
      }

      if (f.suggestDistance != null && !Number.isNaN(Number(f.suggestDistance))) {
        face.suggestDistance = Number(f.suggestDistance);
      }

      if (f.externalEntityId) {
        face.externalEntityId = String(f.externalEntityId);
      }

      if (f.skipReview) {
        face.skipReview = true;
      }

      return face;
    });
}

/** people[] синхронизируется с faces + сохраняет ручные id без рамок */
export function syncPeopleFromFaces(faces, existingPeople = []) {
  const fromFaces = faces
    .map((f) => f.personId)
    .filter((id) => id != null && id !== "");
  const merged = new Set([...(existingPeople || []), ...fromFaces]);
  return Array.from(merged);
}

/** externalPeople[] синхронизируется с faces + сохраняет ручные id */
export function syncExternalPeopleFromFaces(faces, existingExternal = []) {
  const fromFaces = faces
    .map((f) => f.externalEntityId)
    .filter((id) => id != null && id !== "");
  const merged = new Set([...(existingExternal || []), ...fromFaces]);
  return Array.from(merged);
}

export function getPersonLabel(person) {
  if (!person) return "";
  return (
    [person.firstName, person.lastName || person.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${person.id}`
  );
}

/** Текст «кто на фото» — родственники + справочник */
export function buildPhotoAttendeesText(photo, allPeople = [], allExternal = []) {
  if (!photo) return "";

  const labels = new Set();

  for (const id of photo.people || []) {
    const p = allPeople.find((x) => x.id === id);
    labels.add(p ? getPersonLabel(p) : String(id));
  }

  for (const id of photo.externalPeople || []) {
    const e = allExternal.find((x) => x.id === id);
    labels.add(e ? `${e.name} (спр.)` : String(id));
  }

  for (const face of normalizeFaces(photo.faces)) {
    if (face.personId != null && !(photo.people || []).includes(face.personId)) {
      const p = allPeople.find((x) => x.id === face.personId);
      labels.add(p ? getPersonLabel(p) : String(face.personId));
    }
    if (
      face.externalEntityId &&
      !(photo.externalPeople || []).includes(face.externalEntityId)
    ) {
      const e = allExternal.find((x) => x.id === face.externalEntityId);
      labels.add(e ? `${e.name} (спр.)` : String(face.externalEntityId));
    }
  }

  return Array.from(labels).join(", ");
}

export function faceNeedsReview(face) {
  if (!face || face.skipReview) return false;
  if (face.personId != null || face.externalEntityId) return false;
  return true;
}

export function hasPendingReviewFaces(faces = []) {
  return normalizeFaces(faces).some((face) => faceNeedsReview(face));
}

export function countPendingReviewFaces(photos = []) {
  let count = 0;
  for (const photo of photos) {
    for (const face of normalizeFaces(photo.faces)) {
      if (faceNeedsReview(face)) count += 1;
    }
  }
  return count;
}

export function getPendingFaceIds(faces) {
  return normalizeFaces(faces)
    .filter((f) => faceNeedsReview(f))
    .map((f) => f.id);
}

export function buildReviewQueue(photos = []) {
  const queue = [];

  for (const photo of photos) {
    const faces = normalizeFaces(photo.faces);
    const pendingFaceIds = getPendingFaceIds(faces);
    if (pendingFaceIds.length === 0) continue;

    queue.push({
      owner: photo.owner,
      photoId: photo.id,
      filename: photo.filename,
      title: photo.title,
      imageSize: photo.imageSize,
      faces,
      pendingFaceIds,
    });
  }

  return queue;
}

/** Фото, где сканирование не нашло лиц */
export function buildNoFacesQueue(photos = []) {
  const queue = [];

  for (const photo of photos) {
    if (!photo.faceScanNoFaces) continue;
    if (normalizeFaces(photo.faces).length > 0) continue;

    queue.push({
      owner: photo.owner,
      photoId: photo.id,
      filename: photo.filename,
      title: photo.title,
      imageSize: photo.imageSize,
      faces: [],
    });
  }

  return queue;
}

export function countNoFacePhotos(photos = []) {
  return buildNoFacesQueue(photos).length;
}

export function confirmFaceAssignment(face, personId) {
  return {
    ...face,
    personId: personId ?? null,
    externalEntityId: undefined,
    suggestedPersonId: undefined,
    suggestedExternalEntityId: undefined,
    suggestDistance: undefined,
    skipReview: undefined,
  };
}

export function confirmExternalFaceAssignment(face, externalEntityId) {
  return {
    ...face,
    personId: null,
    externalEntityId: externalEntityId ?? undefined,
    suggestedPersonId: undefined,
    suggestedExternalEntityId: undefined,
    suggestDistance: undefined,
    skipReview: undefined,
  };
}

/** Убрать лицо из очереди проверки без подписи */
export function dismissFaceReview(face) {
  return {
    ...face,
    skipReview: true,
    suggestedPersonId: undefined,
    suggestedExternalEntityId: undefined,
    suggestDistance: undefined,
  };
}

export function dismissPendingReviewOnFaces(faces) {
  return normalizeFaces(faces).map((f) =>
    faceNeedsReview(f) ? dismissFaceReview(f) : f,
  );
}
