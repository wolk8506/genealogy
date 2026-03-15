const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs-extra"); // или просто require('fs'), если fs-extra не ставил
const sharp = require("sharp");

let isCancelled = false;

ipcMain.handle("photo:cancelConversion", () => {
  isCancelled = true;
});

ipcMain.handle("photo:startConversion", async (event, options) => {
  isCancelled = false;
  const { quality, keepOriginal, overwrite } = options;
  const basePath = path.join(app.getPath("documents"), "Genealogy", "people");

  if (!fs.existsSync(basePath))
    return { success: false, error: "Папка Genealogy не найдена" };

  const personFolders = fs
    .readdirSync(basePath)
    .filter((f) => fs.statSync(path.join(basePath, f)).isDirectory());

  let allFiles = [];

  for (const id of personFolders) {
    const pDir = path.join(basePath, id, "photos");
    const origDir = path.join(pDir, "original");
    const webpDir = path.join(pDir, "webp");
    const thumbDir = path.join(pDir, "thumbs");

    if (!fs.existsSync(pDir)) continue;

    // 1. Собираем НОВЫЕ фото из корня (JPG/PNG/HEIC -> в original)
    const rootFiles = fs
      .readdirSync(pDir)
      .filter(
        (f) =>
          fs.statSync(path.join(pDir, f)).isFile() &&
          /\.(jpg|jpeg|png|heic)$/i.test(f),
      );
    rootFiles.forEach((f) =>
      allFiles.push({
        personId: id,
        fileName: f,
        currentDir: pDir,
        isWebpSource: false,
      }),
    );

    // 2. Собираем фото из /original (если они есть)
    if (fs.existsSync(origDir)) {
      const originals = fs
        .readdirSync(origDir)
        .filter((f) => /\.(jpg|jpeg|png|heic)$/i.test(f));
      for (const f of originals) {
        const webpName = f.replace(/\.[^.]+$/, ".webp");
        // Если нет WebP ИЛИ нет Thumb ИЛИ включен overwrite
        const needsWebp =
          !fs.existsSync(path.join(webpDir, webpName)) || overwrite;
        const needsThumb =
          !fs.existsSync(path.join(thumbDir, webpName)) || overwrite;

        if (needsWebp || needsThumb) {
          allFiles.push({
            personId: id,
            fileName: f,
            currentDir: origDir,
            isWebpSource: false,
          });
        }
      }
    }

    // 3. ДОРАБОТКА: Если оригиналов НЕТ, но есть /webp, а /thumbs отсутствуют
    // Это сработает после восстановления из "легкого" архива
    if (!fs.existsSync(origDir) && fs.existsSync(webpDir)) {
      const webps = fs.readdirSync(webpDir).filter((f) => f.endsWith(".webp"));
      for (const f of webps) {
        if (!fs.existsSync(path.join(thumbDir, f)) || overwrite) {
          // Важно: проверяем, не добавили ли мы уже этот файл выше (чтобы не дублировать)
          if (
            !allFiles.some(
              (a) =>
                a.personId === id &&
                a.fileName.replace(/\.[^.]+$/, "") === f.replace(".webp", ""),
            )
          ) {
            allFiles.push({
              personId: id,
              fileName: f,
              currentDir: webpDir,
              isWebpSource: true,
            });
          }
        }
      }
    }
  }

  const total = allFiles.length;
  let current = 0;

  for (const fileItem of allFiles) {
    if (isCancelled)
      return { success: false, cancelled: true, processed: current };

    const { personId, fileName, currentDir, isWebpSource } = fileItem;
    const pDir = path.join(basePath, personId, "photos");
    const origDir = path.join(pDir, "original");
    const webpDir = path.join(pDir, "webp");
    const thumbDir = path.join(pDir, "thumbs");

    await fs.ensureDir(origDir);
    await fs.ensureDir(webpDir);
    await fs.ensureDir(thumbDir);

    const sourcePath = path.join(currentDir, fileName);
    const webpName = fileName.replace(/\.[^.]+$/, ".webp");
    const webpPath = path.join(webpDir, webpName);
    const thumbPath = path.join(thumbDir, webpName);

    try {
      // 1. Конвертация WebP (только если источник НЕ сам webp)
      if (!isWebpSource && (!fs.existsSync(webpPath) || overwrite)) {
        await sharp(sourcePath, { failOn: "none" })
          .rotate()
          .resize(quality > 70 ? 2048 : 1280, null, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: options.quality })
          .toFile(webpPath);
      }

      // 2. Конвертация Thumbs (делаем всегда, если их нет)
      if (!fs.existsSync(thumbPath) || overwrite) {
        await sharp(sourcePath, { failOn: "none" })
          .rotate()
          .resize(400, 400, { fit: "cover", position: "north" })
          .webp({ quality: 60 })
          .toFile(thumbPath);
      }

      // 3. Управление оригиналом (только для новых файлов из корня или если удаляем)
      if (!isWebpSource) {
        if (currentDir !== origDir) {
          if (keepOriginal) {
            await fs.move(sourcePath, path.join(origDir, fileName), {
              overwrite: true,
            });
          } else {
            await fs.remove(sourcePath);
          }
        } else if (!keepOriginal) {
          await fs.remove(sourcePath);
        }
      }

      current++;
      event.sender.send("conv-prog", {
        current,
        total,
        percent: Math.round((current / total) * 100),
      });
    } catch (err) {
      console.error(`Ошибка файла ${fileName}:`, err);
    }
  }

  return { success: true, processed: current };
});

// Удаление данных
ipcMain.handle("photo:deleteMedia", async (event, type) => {
  const basePath = path.join(app.getPath("documents"), "Genealogy", "people");

  if (!fs.existsSync(basePath)) return false;

  const entries = fs.readdirSync(basePath);

  for (const entry of entries) {
    const fullPath = path.join(basePath, entry);

    // ПРОВЕРКА: Пропускаем, если это не папка (игнорируем .DS_Store и прочее)
    const stats = fs.statSync(fullPath);
    if (!stats.isDirectory()) continue;

    const pDir = path.join(fullPath, "photos");

    // Проверяем наличие папки photos, прежде чем удалять в ней что-то
    if (fs.existsSync(pDir)) {
      if (type === "originals") {
        await fs.remove(path.join(pDir, "original"));
      }
      if (type === "cache") {
        await fs.remove(path.join(pDir, "webp"));
        await fs.remove(path.join(pDir, "thumbs"));
      }
    }
  }
  return true;
});
