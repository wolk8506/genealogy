// handlers/import.cjs
const { ipcMain, app, BrowserWindow } = require("electron");
const StreamZip = require("node-stream-zip");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");
const { upsertPerson, readPeople } = require("./dataStore.cjs"); // убедитесь, что эти функции экспортируются
const DATA_BASE = path.join(app.getPath("documents"), "Genealogy");

const ensureDir = async (p) => {
  await fs.promises.mkdir(p, { recursive: true });
};

ipcMain.handle("import:zip", async (event, zipPath) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!zipPath) throw new Error("Путь к архиву не передан");

  const tmpDir = path.join(os.tmpdir(), `genealogy-import-${Date.now()}`);
  await ensureDir(tmpDir);

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

    // прочитать существующих людей, чтобы найти конфликты
    const existingPeople = await readPeople();
    const existingIds = new Set(existingPeople.map((p) => String(p.id)));

    // если в архиве есть genealogy-data.json — прочитаем его для incoming metadata
    let archivePeople = [];
    if (entries["genealogy-data.json"]) {
      try {
        const stream = await zip.stream("genealogy-data.json");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const text = Buffer.concat(chunks).toString("utf8");
        const parsed = JSON.parse(text);
        archivePeople = Array.isArray(parsed) ? parsed : parsed.people || [];
      } catch (e) {
        // если парсинг не удался — оставляем archivePeople пустым, но не прерываем импорт
        console.warn(
          "[import] cannot parse genealogy-data.json:",
          e?.message || e
        );
        archivePeople = [];
      }
    }

    // собрать personId'ы из архива (fallback если genealogy-data.json отсутствует)
    const personIdsFromFiles = new Set();
    for (const name of names) {
      if (!name.startsWith("people/")) continue;
      const parts = name.split("/");
      if (parts.length >= 2 && parts[1]) personIdsFromFiles.add(parts[1]);
    }

    // если genealogy-data.json есть и содержит людей — используем его как источник истины
    // иначе используем personIdsFromFiles
    const finalArchivePeople = archivePeople.length
      ? archivePeople
      : Array.from(personIdsFromFiles).map((id) => ({ id }));

    // map incoming metadata by id for quick lookup
    const incomingMap = new Map(
      finalArchivePeople.map((p) => [String(p.id), p])
    );

    // compute toAdd and toUpdate based on incoming list (not только по файлам)
    const toAdd = [];
    const toUpdate = [];
    for (const p of finalArchivePeople) {
      const id = String(p.id);
      if (!existingIds.has(id)) toAdd.push(id);
      else toUpdate.push(id);
    }

    // конфликты — те, кто уже есть (toUpdate)
    const conflicts = toUpdate.slice();

    // отправляем в рендерер и ждём решения (если есть конфликты)
    let userDecision = { action: "all", selected: [] }; // default: импортировать всех
    if (conflicts.length > 0) {
      if (win && win.webContents) {
        win.webContents.send("import:confirm", { conflicts, toAdd, toUpdate });
        userDecision = await new Promise((resolve) => {
          const timeout = setTimeout(
            () => resolve({ action: "all", selected: [] }),
            5 * 60 * 1000
          ); // 5 минут fallback
          ipcMain.once("import:confirm-response", (evt, resp) => {
            clearTimeout(timeout);
            resolve(resp || { action: "all", selected: [] });
          });
        });
      }
    }

    // Обработка ответа: если cancel — прекращаем импорт
    if (userDecision.action === "cancel") {
      try {
        await zip.close();
      } catch (e) {}
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {}
      return { ok: false, cancelled: true };
    }

    // Вычисляем finalIds в зависимости от решения
    let finalIds = finalArchivePeople.map((p) => String(p.id));
    if (userDecision.action === "skip") {
      finalIds = finalIds.filter((id) => !conflicts.includes(String(id)));
    } else if (userDecision.action === "selected") {
      finalIds = finalIds.filter((id) =>
        userDecision.selected.map(String).includes(String(id))
      );
    } else if (userDecision.action === "new") {
      finalIds =
        userDecision.selected && userDecision.selected.length > 0
          ? userDecision.selected.map(String)
          : toAdd.map(String);
    } else if (
      userDecision.action === "overwrite" ||
      userDecision.action === "all"
    ) {
      // ничего не фильтруем — импортируем всех (finalIds уже установлен)
    }

    report.totalPersons = finalIds.length;

    // подсчёт общего размера для процента (опционально)
    let totalBytes = 0;
    for (const n of names) {
      const e = entries[n];
      if (e && !e.isDirectory) totalBytes += e.size || 0;
    }
    let processedBytes = 0;

    // подсчёт общего числа файлов в разделе people (для processedFiles/totalFiles)
    const totalFilesInArchive = names.filter(
      (n) => n.startsWith("people/") && !entries[n].isDirectory
    ).length;
    let processedFilesCount = 0; // накопительный счёт обработанных файлов

    // обработка по person
    let idx = 0;
    for (const personId of finalIds) {
      idx++;
      const personLog = { personId, status: "ok", details: [] };

      // отправляем начальный прогресс по персоне
      sendProgress({
        current: idx,
        total: report.totalPersons,
        personId,
        processedFiles: processedFilesCount,
        totalFiles: totalFilesInArchive,
        message: `Подготовка ${personId} — человек ${idx}/${report.totalPersons}`,
        messages: [
          {
            key: "personStart",
            text: `Человек ${idx}/${report.totalPersons}`,
            meta: { personIndex: idx, peopleTotal: report.totalPersons },
          },
        ],
      });

      try {
        const basePrefix = `people/${personId}/`;
        const personTmpDir = path.join(tmpDir, "people", String(personId));
        await ensureDir(personTmpDir);

        // --- Собираем список файлов, относящихся к персоне (включая корень person dir)
        const personFiles = names.filter(
          (n) => n.startsWith(basePrefix) && !entries[n].isDirectory
        );

        // --- Сначала валидируем photos.json если он есть (но не прерываем импорт при ошибке)
        const photosJsonName = `${basePrefix}photos.json`;
        let parsedPhotosJson = null;
        if (personFiles.includes(photosJsonName)) {
          try {
            const stream = await zip.stream(photosJsonName);
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const text = Buffer.concat(chunks).toString("utf8");
            const parsed = JSON.parse(text);
            if (!Array.isArray(parsed)) {
              console.warn(
                `[import] photos.json for ${personId} is not an array, ignoring`
              );
            } else {
              // проверяем, какие файлы реально присутствуют
              const availablePhotoNames = personFiles
                .filter((n) => n.startsWith(`${basePrefix}photos/`))
                .map((n) => path.basename(n));
              const missing = parsed.filter(
                (p) => !availablePhotoNames.includes(p.filename)
              );
              if (missing.length) {
                console.warn(
                  `[import] photos.json for ${personId} references missing files:`,
                  missing.map((m) => m.filename)
                );
                // не бросаем ошибку — просто помечаем в лог
              }
              parsedPhotosJson = parsed;
              // записываем photos.json в tmp (для дальнейшей обработки)
              await fs.promises.writeFile(
                path.join(personTmpDir, "photos.json"),
                JSON.stringify(parsed, null, 2),
                "utf-8"
              );
              personLog.details.push("photos.json validated (partial)");
            }
          } catch (e) {
            console.warn(
              "[import] photos.json parse/stream error for",
              personId,
              e?.message || e
            );
            // не прерываем импорт — просто логируем
          }
        }

        // --- Считаем общее число фото для прогресса по фото
        const photosList = personFiles.filter((n) =>
          n.startsWith(`${basePrefix}photos/`)
        );
        const photosTotal = photosList.length;
        let photosSaved = 0;

        // --- Извлекаем все файлы персоны (включая корень)
        for (const entryName of personFiles) {
          const rel = entryName.slice(basePrefix.length); // путь внутри папки персоны
          const outPath = path.join(personTmpDir, rel);
          await ensureDir(path.dirname(outPath));
          const stream = await zip.stream(entryName);
          await pipeline(stream, fs.createWriteStream(outPath));
          processedBytes += entries[entryName].size || 0;
          processedFilesCount++; // увеличиваем накопительный счёт обработанных файлов

          // если это фото — увеличиваем счётчик и шлём фото‑прогресс
          if (entryName.startsWith(`${basePrefix}photos/`)) {
            photosSaved++;
            sendProgress({
              current: idx,
              total: report.totalPersons,
              personId,
              photosSaved,
              photosTotal,
              photoPercent: photosTotal
                ? Math.round((photosSaved / photosTotal) * 100)
                : undefined,
              // normalized fields
              processedFiles: processedFilesCount,
              totalFiles: totalFilesInArchive,
              percent: totalBytes
                ? Math.round((processedBytes / totalBytes) * 100)
                : undefined,
              messages: [
                {
                  key: "photoProgress",
                  text: `Фото ${photosSaved}/${photosTotal}`,
                  meta: { photoIndex: photosSaved, photosTotal },
                },
                {
                  key: "personProgress",
                  text: `Человек ${idx}/${report.totalPersons}`,
                  meta: { personIndex: idx, peopleTotal: report.totalPersons },
                },
                { key: "fileName", text: rel, meta: { filePath: rel } },
              ],
              message: `Импорт ${personId}: фото ${photosSaved}/${photosTotal} — человек ${idx}/${report.totalPersons}`,
            });
          } else {
            sendProgress({
              current: idx,
              total: report.totalPersons,
              personId,
              // normalized fields
              processedFiles: processedFilesCount,
              totalFiles: totalFilesInArchive,
              percent: totalBytes
                ? Math.round((processedBytes / totalBytes) * 100)
                : undefined,
              messages: [
                { key: "file", text: rel, meta: { filePath: rel } },
                {
                  key: "personProgress",
                  text: `Человек ${idx}/${report.totalPersons}`,
                  meta: { personIndex: idx, peopleTotal: report.totalPersons },
                },
              ],
              message: `Импорт ${personId}: ${rel} — человек ${idx}/${report.totalPersons}`,
            });
          }
        }

        // --- Upsert metadata для персоны (всегда выполняем, даже если нет файлов)
        const incomingPerson = incomingMap.get(String(personId)) || {
          id: personId,
        };
        try {
          await upsertPerson(incomingPerson);
          personLog.details.push("people:upsert выполнен");
        } catch (e) {
          // если upsert падает — логируем и продолжаем (пометим как ошибку)
          console.warn(
            "[import] upsertPerson failed for",
            personId,
            e?.message || e
          );
          personLog.details.push(`people:upsert failed: ${e?.message || e}`);
        }

        // --- Копируем из tmp в DATA_BASE (merge/overwrite)
        const src = path.join(tmpDir, "people", String(personId));
        const dest = path.join(DATA_BASE, "people", String(personId));
        await copyDir(src, dest);
        personLog.details.push("files перемещены в data folder");

        report.success++;
        sendProgress({
          current: idx,
          total: report.totalPersons,
          personId,
          processedFiles: processedFilesCount,
          totalFiles: totalFilesInArchive,
          percent: totalBytes
            ? Math.round((processedBytes / totalBytes) * 100)
            : undefined,
          messages: [
            {
              key: "personDone",
              text: `Успешно импортирован ${personId}`,
              meta: { personIndex: idx, peopleTotal: report.totalPersons },
            },
          ],
          message: `Успешно импортирован ${personId} — ${idx}/${report.totalPersons}`,
        });
      } catch (err) {
        personLog.status = "error";
        personLog.error = err.message || String(err);
        report.failed++;
        report.errors.push({ personId, error: personLog.error });
        sendProgress({
          current: idx,
          total: report.totalPersons,
          personId,
          processedFiles: processedFilesCount,
          totalFiles: totalFilesInArchive,
          message: `Ошибка при импорте ${personId}: ${personLog.error}`,
          messages: [
            {
              key: "personError",
              text: `Ошибка: ${personLog.error}`,
              meta: { personId },
            },
          ],
        });
      } finally {
        report.perPerson.push(personLog);
      }
    }

    // cleanup tmp
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {}

    await zip.close();
    return { ok: true, report };
  } catch (err) {
    try {
      await zip.close();
    } catch (e) {}
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {}
    console.error("Import error", err);
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
