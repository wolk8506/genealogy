// handlers/photosMetaStore.cjs
// Атомарная запись photos.json (tmp + rename) через общую очередь jsonStore.
const fs = require("fs");
const { photosMetaPath } = require("../config.cjs");
const { withWriteLock, writeJsonAtomic } = require("./jsonStore.cjs");

async function readPhotosMeta(personId, { ifMissing = "empty" } = {}) {
  const filePath = photosMetaPath(personId);
  try {
    const txt = await fs.promises.readFile(filePath, "utf-8");
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === "ENOENT") {
      return ifMissing === "null" ? null : [];
    }
    throw err;
  }
}

function writePhotosMeta(personId, photos) {
  const filePath = photosMetaPath(personId);
  const payload = Array.isArray(photos) ? photos : [];
  return withWriteLock(() => writeJsonAtomic(filePath, payload));
}

function updatePhotosMeta(personId, updater) {
  return withWriteLock(async () => {
    const filePath = photosMetaPath(personId);
    let photos = [];
    try {
      const txt = await fs.promises.readFile(filePath, "utf-8");
      const parsed = JSON.parse(txt);
      photos = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    const next = await updater(photos);
    const payload = Array.isArray(next) ? next : photos;
    await writeJsonAtomic(filePath, payload);
    return payload;
  });
}

module.exports = {
  readPhotosMeta,
  writePhotosMeta,
  updatePhotosMeta,
};
