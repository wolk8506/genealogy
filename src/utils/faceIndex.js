import {
  computeDescriptorFromImageUrl,
  detectFacesFromImageUrl,
  euclideanDistance,
  suggestPersonsForFaces,
  DEFAULT_MATCH_THRESHOLD,
} from "../services/faceRecognition";
import { normalizeFaces } from "./photoFaces";

let externalReferenceRepairAttempted = false;

export function createEmptyFaceIndex() {
  return {
    version: 1,
    references: [],
    scanState: null,
  };
}

export function normalizeFaceIndex(raw) {
  if (!raw || typeof raw !== "object") return createEmptyFaceIndex();

  return {
    version: raw.version || 1,
    references: Array.isArray(raw.references)
      ? raw.references.filter(
          (r) =>
            (r?.personId != null || r?.externalEntityId) &&
            r?.descriptor?.length,
        )
      : [],
    scanState: raw.scanState || null,
  };
}

export function referenceKey(ref) {
  if (ref.source === "avatar") {
    return `avatar:${ref.externalEntityId ?? ref.personId}`;
  }
  return `face:${ref.owner}:${ref.photoId}:${ref.faceId}`;
}

export function upsertReference(index, ref) {
  const next = normalizeFaceIndex(index);
  const key = referenceKey(ref);
  next.references = next.references.filter((r) => referenceKey(r) !== key);
  next.references.push(ref);
  return next;
}

export function removeReferencesForFace(index, { owner, photoId, faceId }) {
  const next = normalizeFaceIndex(index);
  next.references = next.references.filter(
    (r) =>
      !(
        r.source === "tagged" &&
        r.owner === owner &&
        r.photoId === photoId &&
        r.faceId === faceId
      ),
  );
  return next;
}

export async function updateReferencesFromTaggedFaces(index, photos = []) {
  let next = normalizeFaceIndex(index);

  for (const photo of photos) {
    const owner = photo.owner;
    const faces = normalizeFaces(photo.faces);

    for (const face of faces) {
      if (face.personId == null && !face.externalEntityId) continue;

      next = removeReferencesForFace(next, {
        owner,
        photoId: photo.id,
        faceId: face.id,
      });

      if (face.descriptor?.length) {
        next = upsertReference(next, {
          personId: face.personId,
          externalEntityId: face.externalEntityId,
          descriptor: face.descriptor,
          source: "tagged",
          owner,
          photoId: photo.id,
          faceId: face.id,
        });
      }
    }
  }

  return next;
}

export async function addAvatarReferences(index, peopleIds = []) {
  let next = normalizeFaceIndex(index);

  for (const personId of peopleIds) {
    const avatarUrl = await window.avatarAPI?.getPath?.(personId);
    if (!avatarUrl) continue;

    try {
      const { faces } = await detectFacesFromImageUrl(avatarUrl, {
        withDescriptors: true,
        applyNmsFilter: true,
      });

      const best = faces.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0];
      if (!best?.descriptor) continue;

      next = upsertReference(next, {
        personId,
        descriptor: best.descriptor,
        source: "avatar",
      });
    } catch (e) {
      console.warn(`Не удалось построить эталон из аватара ${personId}`, e);
    }
  }

  return next;
}

export async function addExternalAvatarReferences(index, externalEntities = []) {
  let next = normalizeFaceIndex(index);

  for (const entity of externalEntities) {
    const externalEntityId = entity?.id;
    if (!externalEntityId) continue;

    const avatarUrl = await window.externalAPI?.avatar?.getPath?.(externalEntityId);
    if (!avatarUrl) continue;

    try {
      const { faces } = await detectFacesFromImageUrl(avatarUrl, {
        withDescriptors: true,
        applyNmsFilter: true,
      });

      const best = faces.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h)[0];
      if (!best?.descriptor) continue;

      next = upsertReference(next, {
        externalEntityId,
        descriptor: best.descriptor,
        source: "avatar",
      });
    } catch (e) {
      console.warn(
        `Не удалось построить эталон из аватара внешней сущности ${externalEntityId}`,
        e,
      );
    }
  }

  return next;
}

export async function rebuildFaceIndex(
  allPhotos = [],
  allPeople = [],
  allExternal = [],
) {
  let index = createEmptyFaceIndex();
  index = await updateReferencesFromTaggedFaces(index, allPhotos);

  const peopleIds = allPeople.map((p) => p.id).filter(Boolean);
  index = await addAvatarReferences(index, peopleIds);
  index = await addExternalAvatarReferences(index, allExternal);

  return index;
}

export async function syncReferencesAfterPhotoSave(photo, faces) {
  if (!window.faceAPI?.loadIndex) return;

  let index = normalizeFaceIndex(await window.faceAPI.loadIndex());
  const owner = photo.owner;
  const photoId = photo.id;

  index.references = index.references.filter(
    (r) =>
      !(r.source === "tagged" && r.owner === owner && r.photoId === photoId),
  );

  for (const face of normalizeFaces(faces)) {
    if ((face.personId == null && !face.externalEntityId) || !face.descriptor?.length) {
      continue;
    }

    index = upsertReference(index, {
      personId: face.personId,
      externalEntityId: face.externalEntityId,
      descriptor: face.descriptor,
      source: "tagged",
      owner,
      photoId,
      faceId: face.id,
    });
  }

  await window.faceAPI.saveIndex(index);
}

export async function enrichFacesWithDescriptors(imageUrl, faces, imageSize) {
  const normalized = normalizeFaces(faces);
  const enriched = [];

  for (const face of normalized) {
    if (face.descriptor?.length) {
      enriched.push(face);
      continue;
    }

    try {
      const descriptor = await computeDescriptorFromImageUrl(
        imageUrl,
        face.box,
        imageSize,
      );
      enriched.push({ ...face, descriptor });
    } catch {
      enriched.push(face);
    }
  }

  return enriched;
}

export async function suggestPersonsFromFaceIndex(
  faces = [],
  threshold = DEFAULT_MATCH_THRESHOLD,
) {
  const normalizedFaces = normalizeFaces(faces);
  if (normalizedFaces.length === 0) return normalizedFaces;

  if (!window.faceAPI?.loadIndex) return normalizedFaces;

  let index = normalizeFaceIndex(await window.faceAPI.loadIndex());
  if (!index.references?.length && window.photoAPI?.getAllGlobal) {
    const allPhotos = await window.photoAPI.getAllGlobal();
    const allPeople = (await window.peopleAPI?.getAll?.()) || [];
    const allExternal = (await window.externalAPI?.getAll?.()) || [];
    const rebuilt = await rebuildFaceIndex(allPhotos, allPeople, allExternal);
    await window.faceAPI.saveIndex(rebuilt);
    index = normalizeFaceIndex(rebuilt);
  }

  if (!index.references?.length) return normalizedFaces;

  // Self-heal old indexes created before external face references were supported.
  if (!externalReferenceRepairAttempted) {
    externalReferenceRepairAttempted = true;

    const hasExternalReferences = index.references.some(
      (r) => r?.externalEntityId,
    );

    if (!hasExternalReferences && window.photoAPI?.getAllGlobal) {
      const allPhotos = await window.photoAPI.getAllGlobal();
      const allExternal = (await window.externalAPI?.getAll?.()) || [];
      const hasExternalTaggedFaces = allPhotos.some((photo) =>
        normalizeFaces(photo.faces).some(
          (face) => face.externalEntityId && face.descriptor?.length,
        ),
      );
      const hasExternalEntities = allExternal.length > 0;

      if (hasExternalTaggedFaces || hasExternalEntities) {
        const allPeople = (await window.peopleAPI?.getAll?.()) || [];
        const rebuilt = await rebuildFaceIndex(
          allPhotos,
          allPeople,
          allExternal,
        );
        await window.faceAPI.saveIndex(rebuilt);
        index = normalizeFaceIndex(rebuilt);
      }
    }
  }

  return suggestPersonsForFaces(normalizedFaces, index.references, threshold);
}

export function findDuplicatePersonClusters(
  photos = [],
  threshold = DEFAULT_MATCH_THRESHOLD,
) {
  const entries = [];

  for (const photo of photos) {
    for (const face of normalizeFaces(photo.faces)) {
      if (face.personId == null || !face.descriptor?.length) continue;

      entries.push({
        owner: photo.owner,
        photoId: photo.id,
        filename: photo.filename,
        faceId: face.id,
        personId: face.personId,
        descriptor: face.descriptor,
        box: face.box,
      });
    }
  }

  if (entries.length < 2) return [];

  const parent = entries.map((_, i) => i);

  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };

  const unite = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (entries[i].personId === entries[j].personId) continue;
      const dist = euclideanDistance(
        entries[i].descriptor,
        entries[j].descriptor,
      );
      if (dist < threshold) unite(i, j);
    }
  }

  const groups = new Map();
  for (let i = 0; i < entries.length; i += 1) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(entries[i]);
  }

  return [...groups.values()]
    .filter((group) => new Set(group.map((e) => e.personId)).size > 1)
    .map((group, index) => ({
      id: `cluster-${index}`,
      entries: group,
      personIds: [...new Set(group.map((e) => e.personId))],
      avgDistance: 0,
    }));
}
