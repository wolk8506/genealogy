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

    const stream = await zip.stream(dataEntry.name);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const parsedData = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    // Валидация подписи
    const isOurArchive =
      parsedData.appIdentifier === "MY_GENEALOGY_APP" ||
      parsedData.hasOwnProperty("people");
    if (!isOurArchive) {
      await zip.close();
      throw new Error("Данный ZIP-файл создан другой программой.");
    }

    // Извлекаем список людей из метаданных
    let archivePeople = Array.isArray(parsedData)
      ? parsedData
      : parsedData.people || [];

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

    // --- 3. ПРОЦЕСС РАСПАКОВКИ ---
    let totalBytes = 0;
    for (const n of names) {
      if (!entries[n].isDirectory) totalBytes += entries[n].size || 0;
    }
    let processedBytes = 0;

    // Считаем общее число файлов в папках people для корректного счетчика (например, 10500)
    const totalFilesInArchive = names.filter(
      (n) => n.startsWith("people/") && !entries[n].isDirectory,
    ).length;
    let processedFilesCount = 0;

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

          const filePercent = totalFilesInArchive
            ? Math.round((processedFilesCount / totalFilesInArchive) * 100)
            : 0;
          console.log(filePercent);
          // ОТПРАВКА ДЕТАЛЬНОГО ПРОГРЕССА (как было нужно)
          sendProgress({
            current: idx,
            total: report.totalPersons,
            personId,
            processedFiles: processedFilesCount,
            totalFiles: totalFilesInArchive,
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
