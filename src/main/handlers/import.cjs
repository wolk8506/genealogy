// handlers/import.cjs
const { ipcMain, app, BrowserWindow } = require("electron");
const StreamZip = require("node-stream-zip");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");
const { upsertPerson, readPeople } = require("./dataStore.cjs"); // убедитесь, что эти функции экспортируются
const { closeFaceDb, initializeFaceDb } = require("../db/faceDb.cjs");
const DATA_BASE = path.join(app.getPath("documents"), "Genealogy");
const APP_IDENTIFIER = "MY_GENEALOGY_APP";
const PHOTO_FOLDERS = new Set(["original", "thumbs", "webp"]);
const DB_FILES = ["genealogy.sqlite", "genealogy.sqlite-wal", "genealogy.sqlite-shm"];

const ensureDir = async (p) => {
  await fs.promises.mkdir(p, { recursive: true });
};

function normalizePeopleList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.people)) return data.people;
  return [];
}

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
    peopleCount: Array.isArray(parsedData.people)
      ? parsedData.people.length
      : 0,
  };
}

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
      (!manifestEntry && parsed && parsed.people && hasPeopleRoot);

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
      availableDatabaseFiles,
      hasDatabaseFiles: availableDatabaseFiles.length > 0,
      namesCount: names.length,
    };
  } finally {
    await zip.close();
  }
}

ipcMain.handle("import:inspect", async (_, zipPath) => {
  if (!zipPath) throw new Error("Путь к архиву не передан");
  return inspectArchive(zipPath);
});

ipcMain.handle("import:zip", async (event, zipPath, options = {}) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!zipPath) throw new Error("Путь к архиву не передан");

  // const tmpDir = path.join(os.tmpdir(), `genealogy-import-${Date.now()}`);
  const uniqueTmpDir = path.join(os.tmpdir(), `genealogy-import-${Date.now()}`);
  const report = {
    totalPersons: 0,
    success: 0,
    failed: 0,
    errors: [],
    perPerson: [],
  };

  const sendProgress = (data) => {
    if (win && win.webContents) win.webContents.send("import:progress", data);
  };

  let zip;
  try {
    zip = new StreamZip.async({ file: zipPath });
    const entries = await zip.entries();
    const names = Object.keys(entries);

    // --- 1. ПРОВЕРКА "СВОЙ-ЧУЖОЙ" И ЧТЕНИЕ ДАННЫХ ---
    const dataEntry =
      entries["genealogy-data.json"] || entries["manifest.json"];
    if (!dataEntry) {
      await zip.close();
      throw new Error("Файл не распознан. Это не архив Genealogy Pro.");
    }

    const parsedData = await readZipJson(zip, dataEntry.name);

    // Валидация подписи
    const isOurArchive =
      parsedData.appIdentifier === APP_IDENTIFIER ||
      (!entries["manifest.json"] && parsedData.hasOwnProperty("people"));
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

    // Извлекаем список людей из метаданных
    let archivePeople = normalizePeopleList(parsedData);

    // Fallback: если JSON пуст, ищем папки вручную
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

    // --- 2. ПОДГОТОВКА И КОНФЛИКТЫ ---
    await ensureDir(uniqueTmpDir);
    await ensureDir(DATA_BASE);

    const existingPeople = normalizePeopleList(await readPeople());
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

    if (conflicts.length > 0 && win) {
      win.webContents.send("import:confirm", { conflicts, toAdd, toUpdate });
      userDecision = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ action: "all" }), 300000);
        ipcMain.once("import:confirm-response", (evt, resp) => {
          clearTimeout(timeout);
          resolve(resp || { action: "all" });
        });
      });
    }

    if (userDecision.action === "cancel") {
      await zip.close();
      await fs.promises.rm(uniqueTmpDir, { recursive: true, force: true });
      return { ok: false, cancelled: true };
    }

    // Фильтрация ID согласно решению пользователя
    let finalIds = archivePeople.map((p) => String(p.id));
    if (userDecision.action === "skip")
      finalIds = finalIds.filter((id) => !conflicts.includes(id));
    else if (userDecision.action === "selected")
      finalIds = userDecision.selected.map(String);
    else if (userDecision.action === "new") finalIds = toAdd.map(String);

    report.totalPersons = finalIds.length;

    // --- 2.5. СПРАВОЧНИК (до импорта людей — не теряется при ошибках в people/) ---
    try {
      sendProgress({
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
        sendProgress({
          message: `Справочник: ${externalImport.imported} записей, ${externalImport.files} файлов`,
        });
      }
    } catch (externalErr) {
      report.externalImported = 0;
      report.externalFiles = 0;
      report.errors.push({ scope: "external", error: externalErr.message });
      console.error("❌ Ошибка импорта справочника:", externalErr);
    }

    // --- 3. ПРОЦЕСС РАСПАКОВКИ ---
    let totalBytes = 0;
    for (const n of names) {
      if (!entries[n].isDirectory) totalBytes += entries[n].size || 0;
    }
    let processedBytes = 0;

    // Считаем общее число файлов в папках people для корректного счетчика (например, 10500)
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
      sendProgress({
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

        // Получаем все файлы этого человека (аватар, фото, био, json)
        const personFiles = names.filter(
          (n) => n.startsWith(basePrefix) && !entries[n].isDirectory,
        );

        const photosList = personFiles.filter((n) =>
          n.startsWith(`${basePrefix}photos/`),
        );
        const photosTotal = photosList.length;
        let photosSaved = 0;

        for (const entryName of personFiles) {
          const rel = entryName.slice(basePrefix.length); // путь внутри папки человека
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
          console.log(filePercent);
          // ОТПРАВКА ДЕТАЛЬНОГО ПРОГРЕССА (как было нужно)
          sendProgress({
            current: idx,
            total: report.totalPersons,
            personId,
            processedFiles: processedFilesCount,
            totalFiles: totalFilesWithDatabase,
            photosSaved,
            photosTotal,
            // ТЕПЕРЬ ПРОЦЕНТ ЗАВИСИТ ОТ ФАЙЛОВ, А НЕ ОТ ВЕСА ИЛИ ЛЮДЕЙ
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

        // Сохранение в БД и перенос файлов из tmp в постоянное хранилище
        // 1. Сохраняем метаданные в БД
        const incomingPerson = incomingMap.get(String(personId)) || {
          id: personId,
        };
        await upsertPerson(incomingPerson);

        // 2. Подготавливаем целевую папку
        const targetDest = path.join(DATA_BASE, "people", String(personId));

        // 3. ОЧИСТКА: Сносим всё старое, чтобы не было лишних файлов
        if (fs.existsSync(targetDest)) {
          await fs.promises.rm(targetDest, { recursive: true, force: true });
        }
        await ensureDir(targetDest);

        // 4. КОПИРОВАНИЕ: Переносим только то, что было в ZIP
        await copyDir(personTmpDir, targetDest);

        report.success++;
        // ----------------------------------------------------
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
});

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
      const targetPath = path.join(DATA_BASE, fileName);

      if (fs.existsSync(targetPath)) {
        await fs.promises.rm(targetPath, { force: true });
      }

      await fs.promises.copyFile(sourcePath, targetPath);
      restoredFiles.push(fileName);
    }

    initializeFaceDb();
    return { restored: true, files: restoredFiles };
  } catch (error) {
    console.error("❌ restoreFaceDatabaseFromTemp:", error);
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

    const externalBase = path.join(DATA_BASE, "external");
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

    const targetJson = path.join(DATA_BASE, "external-entities.json");
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

    fs.writeFileSync(
      targetJson,
      JSON.stringify(Array.from(mergedMap.values()), null, 2),
      "utf-8",
    );

    console.log(
      `✅ Справочник импортирован: ${externalEntities.length} записей, ${filesCopied} файлов`,
    );

    return { imported: externalEntities.length, files: filesCopied };
  } catch (err) {
    console.error("❌ importExternalEntities:", err);
    return { imported: 0, files: 0, error: err.message };
  }
}
