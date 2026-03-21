const { ipcMain, app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const archiver = require("archiver");
const PDFDocument = require("pdfkit");

module.exports = (settingsStore) => {
  global.globalHashtags = new Set();

  // Вспомогательная функция для добавления тегов в память "на лету"
  function updateGlobalHashtagsFromPhoto(photo) {
    if (!photo) return;
    const tags = global.globalHashtags; // Берем наш глобальный сет

    if (Array.isArray(photo.hashtags)) {
      photo.hashtags.forEach((tag) => tags.add(tag.trim().toLowerCase()));
    }
    if (photo.description) {
      const matches = photo.description.match(/#[\p{L}\d_]+/gu);
      if (matches) {
        matches.forEach((tag) => tags.add(tag.toLowerCase()));
      }
    }
  }

  // Функция сканирования всех папок
  async function rebuildHashtagIndex() {
    const baseDir = path.join(app.getPath("documents"), "Genealogy", "people");
    console.log("🔍 Начинаю поиск по адресу:", baseDir); // ЛОГ 1

    const newTags = new Set();

    try {
      const folders = await fs.promises.readdir(baseDir);
      console.log("📂 Найдено папок людей:", folders.length); // ЛОГ 2

      for (const folder of folders) {
        const filePath = path.join(baseDir, folder, "photos.json");

        try {
          const content = await fs.promises.readFile(filePath, "utf-8");
          const photos = JSON.parse(content);

          photos.forEach((photo) => {
            // ПРОВЕРКА 1: Если теги в массиве hashtags
            if (Array.isArray(photo.hashtags)) {
              photo.hashtags.forEach((tag) =>
                newTags.add(tag.trim().toLowerCase()),
              );
            }

            // ПРОВЕРКА 2: Если теги "зашиты" в описании через #
            if (photo.description) {
              const matches = photo.description.match(/#[\p{L}\d_]+/gu);
              if (matches) {
                matches.forEach((tag) => newTags.add(tag.toLowerCase()));
              }
            }
          });
        } catch (e) {
          // console.log(`⏩ Файл не найден или пуст в папке: ${folder}`);
        }
      }

      global.globalHashtags = newTags;
      console.log(
        `✅ Итоговый индекс: [${Array.from(globalHashtags).join(", ")}]`,
      ); // ЛОГ 3
    } catch (err) {
      console.error("❌ Критическая ошибка сканера:", err);
    }
  }

  // Вызываем при старте приложения (после готовности)
  app.whenReady().then(rebuildHashtagIndex);

  // Вспомогательная функция для получения путей
  const getUserPaths = (personId) => {
    const baseDir = path.join(
      app.getPath("documents"),
      "Genealogy",
      "people",
      String(personId),
    );
    const photosDir = path.join(baseDir, "photos");
    return {
      baseDir,
      photosDir,
      meta: path.join(baseDir, "photos.json"),
      webp: path.join(photosDir, "webp"),
      thumbs: path.join(photosDir, "thumbs"),
      original: path.join(photosDir, "original"),
    };
  };

  // ✅ 1. Сохранение файла по пути
  ipcMain.handle("photo:saveWithFilename", async (event, meta, sourcePath) => {
    const personId = meta.owner;
    if (!personId || !sourcePath) return null;

    const paths = getUserPaths(personId);

    [paths.webp, paths.thumbs, paths.original].forEach((p) => {
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const settings = settingsStore.get("importSettings") || {
      keepOriginals: true,
      quality: 80,
    };

    const ext = path.extname(sourcePath); // .jpg, .png, .heic и т.д.
    const base = path.basename(sourcePath, ext).replace(/\s+/g, "_");

    let finalBase = base;
    let counter = 1;
    // Проверяем уникальность по базовому имени, чтобы не было коллизий во всех папках
    while (fs.existsSync(path.join(paths.original, `${finalBase}${ext}`))) {
      finalBase = `${base}_${counter}`;
      counter++;
    }

    const originalFilename = `${finalBase}${ext}`;
    const webpFilename = `${finalBase}.webp`;

    try {
      // 1. Создаем рабочую WebP версию для интерфейса
      await sharp(sourcePath, { failOn: "none" })
        .rotate()
        .webp({ quality: settings.quality })
        .toFile(path.join(paths.webp, webpFilename));

      // 2. Создаем превью
      await sharp(sourcePath, { failOn: "none" })
        .rotate()
        .resize(300, 300, { fit: "inside" })
        .webp({ quality: 50 })
        .toFile(path.join(paths.thumbs, webpFilename));

      // 3. Сохраняем оригинал
      if (settings.keepOriginals) {
        fs.copyFileSync(
          sourcePath,
          path.join(paths.original, originalFilename),
        );
      }

      let photos = fs.existsSync(paths.meta)
        ? JSON.parse(fs.readFileSync(paths.meta, "utf-8"))
        : [];

      const newPhoto = {
        ...meta,
        id: Date.now(),
        filename: originalFilename, // ✅ Сохраняем оригинальный формат
        date: meta.date || new Date().toISOString().split("T")[0],
      };

      photos.push(newPhoto);
      fs.writeFileSync(paths.meta, JSON.stringify(photos, null, 2));

      updateGlobalHashtagsFromPhoto(newPhoto);

      return newPhoto;
    } catch (err) {
      console.error("SaveWithFilename Error:", err);
      return null;
    }
  });

  // ✅ 2. Сохранение Blob (HEIC, Drag&Drop)
  ipcMain.handle(
    "photo:saveBlobFile",
    async (_, meta, arrayBuffer, filename) => {
      const buffer = Buffer.from(arrayBuffer);
      const paths = getUserPaths(meta.owner);

      [paths.webp, paths.thumbs, paths.original].forEach((p) => {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
      });

      const settings = settingsStore.get("importSettings") || {
        keepOriginals: true,
        quality: 80,
      };

      const ext = path.extname(filename);
      const base = path.basename(filename, ext).replace(/\s+/g, "_");

      let finalBase = base;
      let counter = 1;
      while (fs.existsSync(path.join(paths.original, `${finalBase}${ext}`))) {
        finalBase = `${base}_${counter}`;
        counter++;
      }

      const originalFilename = `${finalBase}${ext}`;
      const webpFilename = `${finalBase}.webp`;

      try {
        await sharp(buffer)
          .rotate()
          .webp({ quality: settings.quality })
          .toFile(path.join(paths.webp, webpFilename));

        await sharp(buffer)
          .rotate()
          .resize(300, 300, { fit: "inside" })
          .webp({ quality: 50 })
          .toFile(path.join(paths.thumbs, webpFilename));

        if (settings.keepOriginals) {
          fs.writeFileSync(path.join(paths.original, originalFilename), buffer);
        }

        let photos = fs.existsSync(paths.meta)
          ? JSON.parse(fs.readFileSync(paths.meta, "utf-8"))
          : [];

        const newPhoto = {
          ...meta,
          id: Date.now(),
          filename: originalFilename, // ✅ Сохраняем оригинальный формат
          date: meta.date || new Date().toISOString().split("T")[0],
        };

        photos.push(newPhoto);
        fs.writeFileSync(paths.meta, JSON.stringify(photos, null, 2));

        return newPhoto;
      } catch (err) {
        console.error("SaveBlob Error:", err);
        return null;
      }
    },
  );

  // ✅ 3. Получение пути (умное)
  ipcMain.handle(
    "photo:getPath",
    (event, personId, filename, version = "webp") => {
      const paths = getUserPaths(personId);
      const webpName = filename.replace(/\.[^.]+$/, ".webp");

      if (version === "thumbs") {
        const tPath = path.join(paths.thumbs, webpName);
        if (fs.existsSync(tPath)) return `file://${tPath}`;
        // Если миниатюры нет, фолбэк на webp
      }

      // По умолчанию или для слайдера
      const wPath = path.join(paths.webp, webpName);
      if (fs.existsSync(wPath)) return `file://${wPath}`;

      const oPath = path.join(paths.original, filename);
      return fs.existsSync(oPath) ? `file://${oPath}` : null;
    },
  );

  // ✅ 4. Удаление (всех копий)
  ipcMain.handle("photo:delete", (event, personId, id) => {
    const paths = getUserPaths(personId);
    if (!fs.existsSync(paths.meta)) return;

    const photos = JSON.parse(fs.readFileSync(paths.meta, "utf-8"));
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;

    const webpName =
      photo.webpName || photo.filename.replace(/\.[^.]+$/, ".webp");

    [
      path.join(paths.webp, webpName),
      path.join(paths.thumbs, webpName),
      path.join(paths.original, photo.filename),
      path.join(paths.photosDir, photo.filename),
    ].forEach((fp) => {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    fs.writeFileSync(
      paths.meta,
      JSON.stringify(
        photos.filter((p) => p.id !== id),
        null,
        2,
      ),
    );
    return true;
  });

  // ✅ Остальные системные методы
  ipcMain.handle("photo:getAll", async (_, personId) => {
    const peopleDir = path.join(
      app.getPath("documents"),
      "Genealogy",
      "people",
    );
    if (!fs.existsSync(peopleDir)) return [];
    const result = [];
    fs.readdirSync(peopleDir).forEach((id) => {
      const mPath = path.join(peopleDir, id, "photos.json");
      if (fs.existsSync(mPath)) {
        const photos = JSON.parse(fs.readFileSync(mPath, "utf-8"));
        photos.forEach((p) => {
          if (
            p.owner === personId ||
            (p.people && p.people.includes(personId))
          ) {
            result.push({ ...p, owner: Number(id) });
          }
        });
      }
    });
    return result;
  });

  ipcMain.handle("photo:selectFile", async () => {
    const result = await dialog.showOpenDialog({
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "heic"] }],
      properties: ["openFile"],
    });
    return result.canceled
      ? null
      : {
          path: `file://${result.filePaths[0]}`,
          filename: path.basename(result.filePaths[0]),
        };
  });

  ipcMain.handle(
    "photo:getExtendedMeta",
    async (event, personId, photoRecord) => {
      const paths = getUserPaths(personId);
      const webpName =
        photoRecord.webpName ||
        photoRecord.filename.replace(/\.[^.]+$/, ".webp");

      const files = [
        {
          type: "Оригинал",
          path: path.join(paths.original, photoRecord.filename),
        },
        { type: "WebP (Экран)", path: path.join(paths.webp, webpName) },
        { type: "Thumbnail (Превью)", path: path.join(paths.thumbs, webpName) },
      ];

      const details = files.map((f) => {
        try {
          if (fs.existsSync(f.path)) {
            const stats = fs.statSync(f.path);
            return {
              type: f.type,
              exists: true,
              size: (stats.size / 1024).toFixed(2) + " KB",
              name: path.basename(f.path),
            };
          }
        } catch (e) {}
        return { type: f.type, exists: false };
      });

      return {
        id: photoRecord.id,
        title: photoRecord.title || "Без названия",
        details: details,
      };
    },
  );

  // !!!  Global photo
  ipcMain.handle("photo:getAllGlobal", async () => {
    const peopleDir = path.join(
      app.getPath("documents"),
      "Genealogy",
      "people",
    );
    if (!fs.existsSync(peopleDir)) return [];

    const people = fs
      .readdirSync(peopleDir)
      .filter((id) => fs.statSync(path.join(peopleDir, id)).isDirectory());

    const result = [];

    for (const id of people) {
      const metaPath = path.join(peopleDir, id, "photos.json");
      if (!fs.existsSync(metaPath)) continue;

      const photos = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      for (const photo of photos) {
        result.push({ ...photo, owner: Number(id) });
      }
    }

    return result;
  });

  // ... (Здесь можно оставить exportZip и exportPDF, используя пути из getUserPaths)

  ipcMain.handle("photo:exportZip", async (event, photos) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Сохранить архив",
      defaultPath: "photos.zip",
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });

    if (canceled || !filePath) return null;

    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    for (const photo of photos) {
      const photoPath = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(photo.owner),
        "photos",
        photo.filename,
      );
      if (fs.existsSync(photoPath)) {
        archive.file(photoPath, { name: photo.filename });
      }
    }

    await archive.finalize();
    return filePath;
  });

  ipcMain.handle("photo:exportPDF", async (event, photos) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Сохранить PDF",
      defaultPath: "photos.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return null;

    const doc = new PDFDocument({ autoFirstPage: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    for (const photo of photos) {
      const photoPath = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(photo.owner),
        "photos",
        photo.filename,
      );
      if (fs.existsSync(photoPath)) {
        doc.addPage();
        doc.image(photoPath, {
          fit: [500, 400],
          align: "center",
          valign: "center",
        });
        doc.moveDown();
        doc.fontSize(14).text(photo.title || "", { align: "center" });
        doc
          .fontSize(10)
          .fillColor("gray")
          .text(photo.description || "", {
            align: "center",
          });
      }
    }

    doc.end();
    return filePath;
  });

  // ---
  // ---   # Хештеги
  // ---

  // Обработчик для фронтенда
  ipcMain.handle("hashtags:getGlobal", () => {
    return Array.from(globalHashtags).sort();
  });
};
