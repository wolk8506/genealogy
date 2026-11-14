// Применение ZIP-бэкапа к активному корню данных (без Electron IPC).
const StreamZip = require("node-stream-zip");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");
const {
  upsertPerson,
  readPeople,
  parseGenealogyDataFile,
} = require("./dataStore.cjs");
const { closeFaceDb, initializeFaceDb } = require("../db/faceDb.cjs");
const {
  getBaseDir,
  getTagsPath,
  getHistoryPath,
  getVolumeFreeBytes,
  formatBytes,
} = require("../config.cjs");
const {
  withWriteLock,
  writeJsonAtomic,
  writeTextAtomic,
  readJsonFile,
} = require("./jsonStore.cjs");
const log = require("../logger.cjs").createLogger("import");
const {
  APP_IDENTIFIER,
  PHOTO_FOLDERS,
  DB_FILES,
  normalizeZipEntryName,
  isDatabaseArtifact,
  findZipEntry,
  normalizeTagsPayload,
} = require("./importArchiveUtils.cjs");
const { readZipJson } = require("./importArchiveInspect.cjs");

const ensureDir = async (p) => {
  await fs.promises.mkdir(p, { recursive: true });
};

/**
 * @param {string} zipPath
 * @param {object} options
 * @param {{ onProgress?: (data: object) => void, confirmConflicts?: (payload: object) => Promise<object> }} [hooks]
 */
async function importZipFromPath(zipPath, options = {}, hooks = {}) {
  if (!zipPath) throw new Error("Путь к ZIP-бэкапу не передан");

  const onProgress = hooks.onProgress || (() => {});
  const confirmConflicts =
    hooks.confirmConflicts ||
    (async () => ({ action: "all", selected: [] }));

  const uniqueTmpDir = path.join(os.tmpdir(), `genealogy-import-${Date.now()}`);
  const report = {
    totalPersons: 0,
    success: 0,
    failed: 0,
    errors: [],
    perPerson: [],
  };

  let zip;
  try {
    zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const names = Object.keys(entries);

    const dataEntry =
      entries["genealogy-data.json"] || entries["manifest.json"];
    if (!dataEntry) {
      await zip.close();
      throw new Error("Файл не распознан. Это не ZIP-бэкап Genealogy Pro.");
    }

    const parsedData = await readZipJson(zip, dataEntry.name);

    const isOurArchive =
      parsedData.appIdentifier === APP_IDENTIFIER ||
      (!entries["manifest.json"] &&
        (Array.isArray(parsedData) || parsedData.hasOwnProperty("people")));
    if (!isOurArchive) {
      await zip.close();
      throw new Error("Данный ZIP-файл создан другой программой.");
    }

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
    const requestedPhotoFolders = Array.isArray(options.photoFolders)
      ? options.photoFolders.filter((item) => PHOTO_FOLDERS.has(item))
      : [];
    const restorePhotoFolders =
      requestedPhotoFolders.length > 0
        ? requestedPhotoFolders
        : parsedData.selectedPhotoFolders || availablePhotoFolders;
    const restorePhotoFolderSet = new Set(restorePhotoFolders);
    const databaseEntries = names.filter((name) => isDatabaseArtifact(name));

    let archivePeople = parseGenealogyDataFile(parsedData).people;

    if (archivePeople.length === 0) {
      const personIdsFromFiles = new Set();
      for (const name of names) {
        if (name.startsWith("people/")) {
          const parts = name.split("/");
          if (parts[1]) personIdsFromFiles.add(parts[1]);
        }
      }
      archivePeople = Array.from(personIdsFromFiles).map((id) => ({ id }));
    }

    await ensureDir(uniqueTmpDir);
    await ensureDir(getBaseDir());

    const existingPeople = await readPeople();
    const existingIds = new Set(existingPeople.map((p) => String(p.id)));
    const incomingMap = new Map(archivePeople.map((p) => [String(p.id), p]));

    const toAdd = [];
    const toUpdate = [];
    for (const p of archivePeople) {
      const id = String(p.id);
      if (!existingIds.has(id)) toAdd.push(id);
      else toUpdate.push(id);
    }

    const conflicts = toUpdate.slice();
    let userDecision = { action: "all", selected: [] };

    if (conflicts.length > 0) {
      userDecision = await confirmConflicts({ conflicts, toAdd, toUpdate });
    }

    if (userDecision.action === "cancel") {
      await zip.close();
      await fs.promises.rm(uniqueTmpDir, { recursive: true, force: true });
      return { ok: false, cancelled: true };
    }

    let finalIds = archivePeople.map((p) => String(p.id));
    if (userDecision.action === "skip")
      finalIds = finalIds.filter((id) => !conflicts.includes(id));
    else if (userDecision.action === "selected")
      finalIds = userDecision.selected.map(String);
    else if (userDecision.action === "new") finalIds = toAdd.map(String);

    report.totalPersons = finalIds.length;

    try {
      onProgress({
        percent: 0,
        message: "Импорт справочника…",
        messages: [{ key: "external", text: "Восстановление external-entities.json" }],
      });
      const externalImport = await importExternalEntities(zip, entries, names);
      report.externalImported = externalImport.imported;
      report.externalFiles = externalImport.files;
      if (externalImport.error) {
        report.errors.push({ scope: "external", error: externalImport.error });
      } else if (externalImport.imported > 0) {
        onProgress({
          message: `Справочник: ${externalImport.imported} записей, ${externalImport.files} файлов`,
        });
      }
    } catch (externalErr) {
      report.externalImported = 0;
      report.externalFiles = 0;
      report.errors.push({ scope: "external", error: externalErr.message });
      log.error("❌ Ошибка импорта справочника:", externalErr);
    }

    const shouldImportTags = options.includeTags === true;
    const shouldImportHistory = options.includeHistory === true;

    if (shouldImportTags) {
      try {
        onProgress({
          percent: 0,
          message: "Импорт меток…",
          messages: [{ key: "tags", text: "Восстановление tags.json" }],
        });
        const tagsImport = await importTags(zip, entries);
        report.tagsImported = tagsImport.imported;
        if (tagsImport.error) {
          report.errors.push({ scope: "tags", error: tagsImport.error });
        } else if (tagsImport.imported) {
          onProgress({
            message: `Метки: ${tagsImport.tagCount} определений, ${tagsImport.personTagCount} назначений`,
          });
        }
      } catch (tagsErr) {
        report.tagsImported = false;
        report.errors.push({ scope: "tags", error: tagsErr.message });
        log.error("❌ Ошибка импорта меток:", tagsErr);
      }
    } else {
      report.tagsImported = false;
      report.tagsSkipped = true;
    }

    if (shouldImportHistory) {
      try {
        onProgress({
          percent: 0,
          message: "Импорт журнала…",
          messages: [{ key: "history", text: "Восстановление history.jsonl" }],
        });
        const historyImport = await importHistory(zip, entries);
        report.historyImported = historyImport.imported;
        report.historyLineCount = historyImport.lineCount;
        if (historyImport.error) {
          report.errors.push({ scope: "history", error: historyImport.error });
        } else if (historyImport.imported) {
          onProgress({
            message: `Журнал: добавлено ${historyImport.lineCount} записей`,
          });
        }
      } catch (historyErr) {
        report.historyImported = false;
        report.errors.push({ scope: "history", error: historyErr.message });
        log.error("❌ Ошибка импорта журнала:", historyErr);
      }
    } else {
      report.historyImported = false;
      report.historySkipped = true;
    }

    let totalBytes = 0;
    for (const n of names) {
      if (!entries[n].isDirectory) totalBytes += entries[n].size || 0;
    }

    for (const [label, dir] of [
      ["временной", uniqueTmpDir],
      ["целевой", getBaseDir()],
    ]) {
      const freeBytes = getVolumeFreeBytes(dir);
      if (freeBytes != null && freeBytes < totalBytes) {
        throw new Error(
          `Недостаточно места на диске (${label} папка ${dir}): ` +
            `нужно ${formatBytes(totalBytes)}, свободно ${formatBytes(freeBytes)}`,
        );
      }
    }

    let processedBytes = 0;

    const totalFilesInArchive = names.filter((n) => {
      if (!n.startsWith("people/") || entries[n].isDirectory) return false;
      const norm = normalizeZipEntryName(n);
      const parts = norm.split("/");
      const photosIndex = parts.indexOf("photos");
      if (photosIndex >= 0) {
        const folder = parts[photosIndex + 1];
        if (folder && PHOTO_FOLDERS.has(folder)) {
          return restorePhotoFolderSet.has(folder);
        }
      }
      return true;
    }).length;
    const totalFilesWithDatabase = totalFilesInArchive + databaseEntries.length;
    let processedFilesCount = 0;

    for (const entryName of databaseEntries) {
      const outPath = path.join(
        uniqueTmpDir,
        path.basename(normalizeZipEntryName(entryName)),
      );
      await ensureDir(path.dirname(outPath));
      const stream = await zip.stream(entryName);
      await pipeline(stream, fs.createWriteStream(outPath));
      processedFilesCount++;
      onProgress({
        percent: totalFilesWithDatabase
          ? Math.round((processedFilesCount / totalFilesWithDatabase) * 100)
          : 0,
        message: `Импорт базы: ${path.basename(outPath)}`,
        processedFiles: processedFilesCount,
        totalFiles: totalFilesWithDatabase,
      });
    }

    for (const personId of finalIds) {
      const idx = report.perPerson.length + 1;
      const personLog = { personId, status: "ok", details: [] };
      const basePrefix = `people/${personId}/`;
      const personTmpDir = path.join(uniqueTmpDir, "people", String(personId));

      try {
        await ensureDir(personTmpDir);

        const personFiles = names.filter(
          (n) => n.startsWith(basePrefix) && !entries[n].isDirectory,
        );

        const photosList = personFiles.filter((n) =>
          n.startsWith(`${basePrefix}photos/`),
        );
        const photosTotal = photosList.length;
        let photosSaved = 0;

        for (const entryName of personFiles) {
          const rel = entryName.slice(basePrefix.length);
          const relNorm = normalizeZipEntryName(rel);
          const relParts = relNorm.split("/");
          const photosIndex = relParts.indexOf("photos");
          if (photosIndex >= 0) {
            const folder = relParts[photosIndex + 1];
            if (folder && PHOTO_FOLDERS.has(folder) && !restorePhotoFolderSet.has(folder)) {
              continue;
            }
          }
          const outPath = path.join(personTmpDir, rel);

          if (!path.resolve(outPath).startsWith(path.resolve(personTmpDir)))
            continue;

          await ensureDir(path.dirname(outPath));
          const stream = await zip.stream(entryName);
          await pipeline(stream, fs.createWriteStream(outPath));

          processedBytes += entries[entryName].size || 0;
          processedFilesCount++;

          const isPhoto = entryName.startsWith(`${basePrefix}photos/`);
          if (isPhoto) photosSaved++;

          const filePercent = totalFilesWithDatabase
            ? Math.round((processedFilesCount / totalFilesWithDatabase) * 100)
            : 0;
          log.info(filePercent);
          onProgress({
            current: idx,
            total: report.totalPersons,
            personId,
            processedFiles: processedFilesCount,
            totalFiles: totalFilesWithDatabase,
            photosSaved,
            photosTotal,
            percent: filePercent,
            message: isPhoto
              ? `Импорт ${personId}: фото ${photosSaved}/${photosTotal}`
              : `Импорт ${personId}: обработка ${rel}`,
            messages: [
              {
                key: "personProgress",
                text: `Человек ${idx}/${report.totalPersons}`,
                meta: { personIndex: idx, peopleTotal: report.totalPersons },
              },
              { key: "fileInfo", text: rel, meta: { filePath: rel, isPhoto } },
            ],
          });
        }

        const incomingPerson = incomingMap.get(String(personId)) || {
          id: personId,
        };
        await upsertPerson(incomingPerson);

        const targetDest = path.join(getBaseDir(), "people", String(personId));

        if (fs.existsSync(targetDest)) {
          await fs.promises.rm(targetDest, { recursive: true, force: true });
        }
        await ensureDir(targetDest);

        await copyDir(personTmpDir, targetDest);

        report.success++;
      } catch (err) {
        personLog.status = "error";
        personLog.error = err.message;
        report.failed++;
        report.errors.push({ personId, error: err.message });
      }
      report.perPerson.push(personLog);
    }

    const restoredDb = await restoreFaceDatabaseFromTemp(uniqueTmpDir);
    if (restoredDb.restored) {
      report.restoredDatabaseFiles = restoredDb.files;
    }

    await zip.close();
    await fs.promises.rm(uniqueTmpDir, { recursive: true, force: true });
    return { ok: true, report };
  } catch (err) {
    if (zip) await zip.close();
    await fs.promises
      .rm(uniqueTmpDir, { recursive: true, force: true })
      .catch(() => {});
    throw err;
  }
}

async function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  await fs.promises.mkdir(dest, { recursive: true });
  const items = await fs.promises.readdir(src, { withFileTypes: true });
  for (const it of items) {
    const s = path.join(src, it.name);
    const d = path.join(dest, it.name);
    if (it.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.promises.copyFile(s, d);
    }
  }
}

async function restoreFaceDatabaseFromTemp(tmpDir) {
  const sourceFiles = DB_FILES.map((fileName) => path.join(tmpDir, fileName)).filter(
    (filePath) => fs.existsSync(filePath),
  );

  if (sourceFiles.length === 0) {
    return { restored: false, files: [] };
  }

  closeFaceDb();

  const restoredFiles = [];
  try {
    for (const sourcePath of sourceFiles) {
      const fileName = path.basename(sourcePath);
      const targetPath = path.join(getBaseDir(), fileName);

      if (fs.existsSync(targetPath)) {
        await fs.promises.rm(targetPath, { force: true });
      }

      await fs.promises.copyFile(sourcePath, targetPath);
      restoredFiles.push(fileName);
    }

    initializeFaceDb();
    return { restored: true, files: restoredFiles };
  } catch (error) {
    log.error("❌ restoreFaceDatabaseFromTemp:", error);
    throw error;
  }
}

async function importExternalEntities(zip, entries, names) {
  const jsonEntry = findZipEntry(entries, "external-entities.json");
  if (!jsonEntry) {
    return { imported: 0, files: 0 };
  }

  try {
    const stream = await zip.stream(jsonEntry.key);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const externalEntities = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    if (!Array.isArray(externalEntities)) {
      return { imported: 0, files: 0, error: "external-entities.json: ожидался массив" };
    }

    const externalBase = path.join(getBaseDir(), "external");
    await ensureDir(externalBase);

    const externalFiles = names.filter((n) => {
      const norm = normalizeZipEntryName(n);
      const entry = entries[n];
      return norm.startsWith("external/") && entry && !entry.isDirectory;
    });

    let filesCopied = 0;
    for (const entryName of externalFiles) {
      const norm = normalizeZipEntryName(entryName);
      const rel = norm.slice("external/".length);
      const outPath = path.join(externalBase, rel);

      if (!path.resolve(outPath).startsWith(path.resolve(externalBase))) continue;

      await ensureDir(path.dirname(outPath));
      const fileStream = await zip.stream(entryName);
      await pipeline(fileStream, fs.createWriteStream(outPath));
      filesCopied++;
    }

    const targetJson = path.join(getBaseDir(), "external-entities.json");
    let existing = [];
    if (fs.existsSync(targetJson)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(targetJson, "utf-8"));
        existing = Array.isArray(parsed) ? parsed : [];
      } catch {
        existing = [];
      }
    }

    const mergedMap = new Map(existing.map((e) => [e.id, e]));
    for (const entity of externalEntities) {
      if (entity?.id) mergedMap.set(entity.id, entity);
    }

    await withWriteLock(() =>
      writeJsonAtomic(targetJson, Array.from(mergedMap.values())),
    );

    log.info(
      `✅ Справочник импортирован: ${externalEntities.length} записей, ${filesCopied} файлов`,
    );

    return { imported: externalEntities.length, files: filesCopied };
  } catch (err) {
    log.error("❌ importExternalEntities:", err);
    return { imported: 0, files: 0, error: err.message };
  }
}

async function importTags(zip, entries) {
  const jsonEntry = findZipEntry(entries, "tags.json");
  if (!jsonEntry) {
    return { imported: false, tagCount: 0, personTagCount: 0 };
  }

  try {
    const incoming = normalizeTagsPayload(await readZipJson(zip, jsonEntry.key));
    if (!incoming) {
      return {
        imported: false,
        tagCount: 0,
        personTagCount: 0,
        error: "tags.json: неверный формат",
      };
    }

    const tagsPath = getTagsPath();
    const existing = normalizeTagsPayload(await readJsonFile(tagsPath, null)) || {
      tags: [],
      personTags: {},
    };

    const mergedTags = new Map(
      (existing.tags || []).map((tag) => [tag.id, tag]),
    );
    for (const tag of incoming.tags) {
      if (tag?.id) mergedTags.set(tag.id, tag);
    }

    const mergedPersonTags = { ...existing.personTags };
    for (const [personId, tagIds] of Object.entries(incoming.personTags)) {
      if (Array.isArray(tagIds)) {
        mergedPersonTags[String(personId)] = tagIds;
      }
    }

    const merged = {
      tags: Array.from(mergedTags.values()),
      personTags: mergedPersonTags,
    };

    await withWriteLock(() => writeJsonAtomic(tagsPath, merged));

    log.info(
      `✅ Метки импортированы: ${merged.tags.length} определений, ${Object.keys(merged.personTags).length} назначений`,
    );

    return {
      imported: true,
      tagCount: incoming.tags.length,
      personTagCount: Object.keys(incoming.personTags).length,
    };
  } catch (err) {
    log.error("❌ importTags:", err);
    return { imported: false, tagCount: 0, personTagCount: 0, error: err.message };
  }
}

async function readZipText(zip, entryName) {
  if (!entryName) return "";
  const stream = await zip.stream(entryName);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function importHistory(zip, entries) {
  const textEntry = findZipEntry(entries, "history.jsonl");
  if (!textEntry) {
    return { imported: false, lineCount: 0 };
  }

  try {
    const incoming = (await readZipText(zip, textEntry.key)).trim();
    if (!incoming) {
      return { imported: false, lineCount: 0 };
    }

    const historyPath = getHistoryPath();
    const lineCount = incoming.split("\n").filter(Boolean).length;

    await withWriteLock(async () => {
      let existing = "";
      try {
        existing = await fs.promises.readFile(historyPath, "utf-8");
      } catch {
        existing = "";
      }

      const needsSep = existing.length > 0 && !existing.endsWith("\n");
      const merged = `${existing}${needsSep ? "\n" : ""}${incoming}\n`;
      await writeTextAtomic(historyPath, merged);
    });

    log.info(`✅ Журнал импортирован: ${lineCount} записей`);

    return { imported: true, lineCount };
  } catch (err) {
    log.error("❌ importHistory:", err);
    return { imported: false, lineCount: 0, error: err.message };
  }
}

module.exports = {
  importZipFromPath,
};
