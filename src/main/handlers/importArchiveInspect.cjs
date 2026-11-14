// Предпросмотр ZIP-бэкапа (import:inspect) — без записи в библиотеку.
const path = require("path");
const StreamZip = require("node-stream-zip");
const {
  APP_IDENTIFIER,
  PHOTO_FOLDERS,
  DB_FILES,
  normalizeZipEntryName,
  findZipEntry,
  parseArchiveMeta,
} = require("./importArchiveUtils.cjs");
const { parseGenealogyDataFile } = require("./dataStore.cjs");

async function readZipJson(zip, entryName) {
  if (!entryName) return null;
  const stream = await zip.stream(entryName);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function inspectArchive(zipPath) {
  const zip = new StreamZip.async({ file: zipPath });
  try {
    const entries = await zip.entries();
    const names = Object.keys(entries);

    const manifestEntry = entries["manifest.json"];
    const dataEntry =
      entries["genealogy-data.json"] || entries["manifest.json"];

    let parsed = null;
    if (dataEntry) {
      parsed = await readZipJson(zip, dataEntry.name);
    }

    const meta = parseArchiveMeta(parsed) || {};
    const hasPeopleRoot = names.some((name) => name.startsWith("people/"));
    const hasExternalRoot = names.some((name) => name.startsWith("external/"));
    const availableDatabaseFiles = names
      .map(normalizeZipEntryName)
      .filter((name) => DB_FILES.includes(path.basename(name)));

    const availablePhotoFolders = Array.from(
      new Set(
        names
          .filter((name) => name.startsWith("people/") && !entries[name].isDirectory)
          .map((name) => {
            const parts = normalizeZipEntryName(name).split("/");
            const photosIndex = parts.indexOf("photos");
            return photosIndex >= 0 ? parts[photosIndex + 1] : null;
          })
          .filter((item) => PHOTO_FOLDERS.has(item)),
      ),
    );

    const isOurArchive =
      meta.appIdentifier === APP_IDENTIFIER ||
      (!manifestEntry &&
        parsed &&
        parseGenealogyDataFile(parsed).people.length > 0 &&
        hasPeopleRoot);

    return {
      ok: true,
      isOurArchive,
      appIdentifier: meta.appIdentifier,
      archiveName: meta.archiveName,
      createdAt: meta.createdAt,
      peopleCount: meta.peopleCount,
      selectedPhotoFolders: meta.selectedPhotoFolders,
      availablePhotoFolders,
      hasPeopleRoot,
      hasExternalRoot,
      hasTagsFile: Boolean(findZipEntry(entries, "tags.json")),
      hasHistoryFile: Boolean(findZipEntry(entries, "history.jsonl")),
      includeTags: meta.includeTags || Boolean(findZipEntry(entries, "tags.json")),
      includeHistory:
        meta.includeHistory || Boolean(findZipEntry(entries, "history.jsonl")),
      availableDatabaseFiles,
      hasDatabaseFiles: availableDatabaseFiles.length > 0,
      namesCount: names.length,
    };
  } finally {
    await zip.close();
  }
}

module.exports = {
  readZipJson,
  inspectArchive,
};
