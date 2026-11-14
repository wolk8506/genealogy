// Чистая логика разбора ZIP-архива импорта (без Electron и без getBaseDir).
const path = require("path");
const { parseGenealogyDataFile } = require("./dataStore.cjs");

const APP_IDENTIFIER = "MY_GENEALOGY_APP";
const PHOTO_FOLDERS = new Set(["original", "thumbs", "webp"]);
const DB_FILES = ["genealogy.sqlite", "genealogy.sqlite-wal", "genealogy.sqlite-shm"];

function normalizeZipEntryName(name) {
  return String(name || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

function isDatabaseArtifact(name) {
  return DB_FILES.includes(path.basename(normalizeZipEntryName(name)));
}

function findZipEntry(entries, targetName) {
  const normTarget = normalizeZipEntryName(targetName);
  if (entries[normTarget]) return { key: normTarget, entry: entries[normTarget] };

  for (const key of Object.keys(entries)) {
    const norm = normalizeZipEntryName(key);
    if (norm === normTarget || norm.endsWith(`/${normTarget}`)) {
      return { key, entry: entries[key] };
    }
  }
  return null;
}

function parseArchiveMeta(parsedData) {
  if (!parsedData || typeof parsedData !== "object") return null;

  const selectedPhotoFolders = Array.isArray(parsedData.selectedPhotoFolders)
    ? parsedData.selectedPhotoFolders.filter((item) => PHOTO_FOLDERS.has(item))
    : Array.isArray(parsedData.photoFolders)
      ? parsedData.photoFolders.filter((item) => PHOTO_FOLDERS.has(item))
      : [];

  return {
    appIdentifier: parsedData.appIdentifier || null,
    archiveName: parsedData.archiveName || parsedData.name || null,
    createdAt: parsedData.createdAt || parsedData.exportedAt || null,
    selectedPhotoFolders,
    includeTags: parsedData.includeTags === true,
    includeHistory: parsedData.includeHistory === true,
    peopleCount: parseGenealogyDataFile(parsedData).people.length,
  };
}

function normalizeTagsPayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const personTags =
    raw.personTags && typeof raw.personTags === "object" ? raw.personTags : {};
  return { tags, personTags };
}

module.exports = {
  APP_IDENTIFIER,
  PHOTO_FOLDERS,
  DB_FILES,
  normalizeZipEntryName,
  isDatabaseArtifact,
  findZipEntry,
  parseArchiveMeta,
  normalizeTagsPayload,
};
