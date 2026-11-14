// Паспорт ZIP-бэкапа (общий для exportToZip и импорта).
// Не require dataStore/config — иначе Vite стянет Electron в рендерер.
const GENEALOGY_DATA_SCHEMA_VERSION = 1;

const APP_IDENTIFIER = "MY_GENEALOGY_APP";
const ARCHIVE_KIND = "genealogy-archive";
const ARCHIVE_MANIFEST_VERSION = 2;

function buildExportManifest({
  archiveName,
  createdAt,
  photoFolders,
  includeTags,
  includeHistory,
}) {
  const folders = Array.isArray(photoFolders) ? photoFolders : [];
  return {
    appIdentifier: APP_IDENTIFIER,
    archiveName,
    createdAt,
    selectedPhotoFolders: folders,
    photoFolders: folders,
    includeTags: Boolean(includeTags),
    includeHistory: Boolean(includeHistory),
    kind: ARCHIVE_KIND,
    version: ARCHIVE_MANIFEST_VERSION,
  };
}

function buildGenealogyDataExportPayload({
  people,
  archiveName,
  createdAt,
  photoFolders,
  includeTags,
  includeHistory,
}) {
  const folders = Array.isArray(photoFolders) ? photoFolders : [];
  return {
    schemaVersion: GENEALOGY_DATA_SCHEMA_VERSION,
    appIdentifier: APP_IDENTIFIER,
    archiveName,
    exportedAt: createdAt,
    selectedPhotoFolders: folders,
    photoFolders: folders,
    includeTags: Boolean(includeTags),
    includeHistory: Boolean(includeHistory),
    people: Array.isArray(people) ? people : [],
  };
}

module.exports = {
  APP_IDENTIFIER,
  ARCHIVE_KIND,
  ARCHIVE_MANIFEST_VERSION,
  buildExportManifest,
  buildGenealogyDataExportPayload,
};
