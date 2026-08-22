import * as faceapi from "@vladmandic/face-api";

let detectorModelLoaded = false;
let recognitionModelsLoaded = false;
let modelsLoading = null;

const MODEL_URL = `${import.meta.env.BASE_URL}face-models`;
export const DEFAULT_MATCH_THRESHOLD = 0.6;

export async function ensureFaceModelsLoaded(includeRecognition = true) {
  const needRecognition = Boolean(includeRecognition);

  if (detectorModelLoaded && (!needRecognition || recognitionModelsLoaded)) {
    return;
  }

  if (modelsLoading) {
    await modelsLoading;
    if (detectorModelLoaded && (!needRecognition || recognitionModelsLoaded)) {
      return;
    }
  }

  modelsLoading = (async () => {
    if (!detectorModelLoaded) {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      detectorModelLoaded = true;
    }

    if (needRecognition && !recognitionModelsLoaded) {
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      recognitionModelsLoaded = true;
    }
  })();

  try {
    await modelsLoading;
  } finally {
    modelsLoading = null;
  }
}

export function descriptorToArray(descriptor) {
  if (!descriptor) return null;
  return Array.from(descriptor);
}

export function arrayToDescriptor(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return new Float32Array(arr);
}

export function euclideanDistance(a, b) {
  const da = a instanceof Float32Array ? a : arrayToDescriptor(a);
  const db = b instanceof Float32Array ? b : arrayToDescriptor(b);
  if (!da || !db) return Infinity;
  return faceapi.euclideanDistance(da, db);
}

export function distanceToConfidence(distance, threshold = DEFAULT_MATCH_THRESHOLD) {
  if (distance >= threshold) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)));
}

export function computeIoU(boxA, boxB) {
  const x1 = Math.max(boxA.x, boxB.x);
  const y1 = Math.max(boxA.y, boxB.y);
  const x2 = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
  const y2 = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const inter = interW * interH;
  if (inter <= 0) return 0;
  const union = boxA.w * boxA.h + boxB.w * boxB.h - inter;
  return union > 0 ? inter / union : 0;
}

export function applyNms(faces, iouThreshold = 0.5) {
  const sorted = [...faces].sort(
    (a, b) => b.box.w * b.box.h - a.box.w * a.box.h,
  );
  const kept = [];

  for (const face of sorted) {
    const overlaps = kept.some(
      (k) => computeIoU(face.box, k.box) >= iouThreshold,
    );
    if (!overlaps) kept.push(face);
  }

  return kept;
}

function getFaceDetectionBox(d) {
  const detection = d?.detection ?? d;
  const box = detection?.box;
  if (!box || typeof box.x !== "number") return null;

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}

function detectionToFace(d, refW, refH, index) {
  const box = getFaceDetectionBox(d);
  if (!box) return null;

  return {
    id: `f-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`,
    personId: null,
    box: {
      x: box.x / refW,
      y: box.y / refH,
      w: box.width / refW,
      h: box.height / refH,
    },
    descriptor: d.descriptor ? descriptorToArray(d.descriptor) : null,
  };
}

/**
 * @param {string} imageUrl
 * @param {{ withDescriptors?: boolean, applyNmsFilter?: boolean }} options
 */
export async function detectFacesFromImageUrl(imageUrl, options = {}) {
  const { withDescriptors = true, applyNmsFilter = true } = options;
  await ensureFaceModelsLoaded(withDescriptors);

  const img = await faceapi.fetchImage(imageUrl);
  const refW = img.naturalWidth || img.width;
  const refH = img.naturalHeight || img.height;

  if (!refW || !refH) {
    throw new Error("Не удалось определить размер изображения");
  }

  let pipeline = faceapi.detectAllFaces(
    img,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }),
  );

  if (withDescriptors) {
    pipeline = pipeline.withFaceLandmarks().withFaceDescriptors();
  }

  const detections = await pipeline;
  let faces = detections
    .map((d, i) => detectionToFace(d, refW, refH, i))
    .filter(Boolean);

  if (applyNmsFilter) {
    faces = applyNms(faces);
  }

  return {
    imageSize: { width: refW, height: refH },
    faces,
  };
}

export async function computeDescriptorFromImageUrl(imageUrl, box, imageSize) {
  await ensureFaceModelsLoaded(true);

  const img = await faceapi.fetchImage(imageUrl);
  const refW = imageSize?.width || img.naturalWidth || img.width;
  const refH = imageSize?.height || img.naturalHeight || img.height;

  const rect = new faceapi.Rect(
    box.x * refW,
    box.y * refH,
    box.w * refW,
    box.h * refH,
  );
  const detection = new faceapi.FaceDetection(rect, 1.0);
  const landmarks = await faceapi.detectFaceLandmarks(img, detection);
  const descriptor = await faceapi.computeFaceDescriptor(
    img,
    detection,
    landmarks,
  );

  return descriptorToArray(descriptor);
}

export function buildReferenceLibrary(references = []) {
  return references
    .filter(
      (r) =>
        (r?.personId != null || r?.externalEntityId) && r?.descriptor?.length,
    )
    .map((r) => ({
      ...r,
      descriptor: arrayToDescriptor(r.descriptor),
    }))
    .filter((r) => r.descriptor);
}

export function suggestPerson(descriptor, references, threshold = DEFAULT_MATCH_THRESHOLD) {
  const arr = descriptor instanceof Float32Array ? descriptor : arrayToDescriptor(descriptor);
  if (!arr || !references?.length) return null;

  const candidates = new Map();

  for (const ref of references) {
    const refDesc =
      ref.descriptor instanceof Float32Array
        ? ref.descriptor
        : arrayToDescriptor(ref.descriptor);
    if (!refDesc) continue;

    const distance = faceapi.euclideanDistance(arr, refDesc);
    if (distance > threshold * 1.1) continue;

    const key =
      ref.externalEntityId != null
        ? `external:${ref.externalEntityId}`
        : `person:${ref.personId}`;

    const prev = candidates.get(key) || {
      personId: ref.personId ?? null,
      externalEntityId: ref.externalEntityId ?? null,
      bestDistance: Infinity,
      taggedHits: 0,
      avatarHits: 0,
    };

    if (distance < prev.bestDistance) {
      prev.bestDistance = distance;
    }

    if (ref.source === "tagged" && distance < threshold) {
      prev.taggedHits += 1;
    }

    if (ref.source === "avatar" && distance < threshold) {
      prev.avatarHits += 1;
    }

    candidates.set(key, prev);
  }

  if (candidates.size === 0) return null;

  const scored = Array.from(candidates.values())
    .filter((c) => c.bestDistance < threshold)
    .map((c) => ({
      ...c,
      // Prefer stable tagged matches; slightly de-prioritize avatar-only dominance.
      score:
        c.bestDistance -
        Math.min(0.02, c.taggedHits * 0.005) +
        Math.min(0.01, c.avatarHits * 0.002),
    }))
    .sort((a, b) => a.score - b.score);

  if (scored.length === 0) return null;

  const top = scored[0];
  const firstExternal = scored.find((c) => c.externalEntityId != null);

  // If external candidate is nearly as good but backed by tagged hits, prefer it.
  if (
    firstExternal &&
    top.personId != null &&
    firstExternal.bestDistance <= top.bestDistance + 0.03 &&
    firstExternal.taggedHits >= 2
  ) {
    return {
      personId: null,
      externalEntityId: firstExternal.externalEntityId,
      distance: firstExternal.bestDistance,
    };
  }

  return {
    personId: top.personId ?? null,
    externalEntityId: top.externalEntityId ?? null,
    distance: top.bestDistance,
  };
}

export function suggestPersonsForFaces(faces, references, threshold = DEFAULT_MATCH_THRESHOLD) {
  const refs = buildReferenceLibrary(references);
  return faces.map((face) => {
    if (!face.descriptor?.length) return face;

    const match = suggestPerson(face.descriptor, refs, threshold);
    if (!match) return face;

    return {
      ...face,
      suggestedPersonId: match.personId ?? undefined,
      suggestedExternalEntityId: match.externalEntityId ?? undefined,
      suggestDistance: match.distance,
    };
  });
}
