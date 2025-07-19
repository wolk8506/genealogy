const { ipcMain, app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
// const { personDir, dataPath } = require("../config.cjs");

ipcMain.handle("photo:save", async (event, personId, meta) => {
  const baseDir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId)
  );
  const photosDir = path.join(baseDir, "photos");
  const photosMetaPath = path.join(baseDir, "photos.json");

  // ✅ Создаём папки, если нужно
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const result = await dialog.showOpenDialog({
    title: "Выберите фотографию",
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "heic"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const sourcePath = result.filePaths[0];
  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  let filename = `${base}${ext}`;
  let counter = 1;

  while (fs.existsSync(path.join(photosDir, filename))) {
    filename = `${base}_${counter}${ext}`;
    counter++;
  }

  const destPath = path.join(photosDir, filename);
  fs.copyFileSync(sourcePath, destPath);

  // ✅ Загружаем или создаём метаинформацию
  let photos = [];
  if (fs.existsSync(photosMetaPath)) {
    photos = JSON.parse(fs.readFileSync(photosMetaPath, "utf-8"));
  }

  const newPhoto = {
    id: Date.now(),
    filename,
    ...meta,
  };

  photos.push(newPhoto);
  fs.writeFileSync(photosMetaPath, JSON.stringify(photos, null, 2));

  return newPhoto;
});

// -----------------------------

ipcMain.handle("photo:saveBlobFile", async (_, meta, arrayBuffer, filename) => {
  const buffer = Buffer.from(arrayBuffer);
  const baseDir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(meta.owner)
  );
  const photosDir = path.join(baseDir, "photos");
  const photosMetaPath = path.join(baseDir, "photos.json");

  // ✅ Создаём папки, если нужно
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let safeFilename = `${base}${ext}`;
  let counter = 1;

  while (fs.existsSync(path.join(photosDir, safeFilename))) {
    safeFilename = `${base}_${counter}${ext}`;
    counter++;
  }

  const destPath = path.join(photosDir, safeFilename);
  fs.writeFileSync(destPath, buffer);

  // ✅ Загружаем или создаём метаинформацию
  let photos = [];
  if (fs.existsSync(photosMetaPath)) {
    photos = JSON.parse(fs.readFileSync(photosMetaPath, "utf-8"));
  }

  const newPhoto = {
    id: Date.now(),
    filename: safeFilename,
    ...meta,
  };

  photos.push(newPhoto);
  fs.writeFileSync(photosMetaPath, JSON.stringify(photos, null, 2));

  return newPhoto;
});

// -----------------------------

// -----------------------------
const photosMetaPath = path.join(
  app.getPath("documents"),
  "Genealogy",
  "photos.json"
);

ipcMain.handle("photo:getAll", async (event, personId) => {
  const peopleDir = path.join(app.getPath("documents"), "Genealogy", "people");
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
      if (
        photo.owner === personId ||
        (Array.isArray(photo.people) && photo.people.includes(personId))
      ) {
        result.push({ ...photo, owner: Number(id) }); // 👈 добавим owner явно
      }
    }
  }

  return result;
});

ipcMain.handle("photo:update", (event, ownerId, updatedPhoto) => {
  const photosMetaPath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(ownerId),
    "photos.json"
  );

  if (!fs.existsSync(photosMetaPath)) return;

  const photos = JSON.parse(fs.readFileSync(photosMetaPath, "utf-8"));
  const index = photos.findIndex((p) => p.id === updatedPhoto.id);
  if (index !== -1) {
    photos[index] = updatedPhoto;
    fs.writeFileSync(photosMetaPath, JSON.stringify(photos, null, 2));
  }
});

// -----------------------------
ipcMain.handle("photo:getPath", (event, personId, filename) => {
  const photoPath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId),
    "photos",
    filename
  );

  if (fs.existsSync(photoPath)) {
    return `file://${photoPath}`;
  } else {
    console.warn("⚠️ Фото не найдено:", photoPath);
    return null;
  }
});

// -----------------------------
ipcMain.handle("photo:delete", (event, personId, id) => {
  const baseDir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId)
  );
  const photosMetaPath = path.join(baseDir, "photos.json");
  const photosDir = path.join(baseDir, "photos");

  if (!fs.existsSync(photosMetaPath)) return;

  const photos = JSON.parse(fs.readFileSync(photosMetaPath, "utf-8"));
  const photo = photos.find((p) => p.id === id);
  const updated = photos.filter((p) => p.id !== id);

  fs.writeFileSync(photosMetaPath, JSON.stringify(updated, null, 2));

  if (photo && photo.filename) {
    const filePath = path.join(photosDir, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

// -----------------------------
ipcMain.handle("photo:selectFile", async () => {
  const result = await dialog.showOpenDialog({
    title: "Выберите фотографию",
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "heic"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  return {
    path: `file://${filePath}`,
    filename: path.basename(filePath),
  };
});

// -----------------------------
ipcMain.handle("photo:saveWithFilename", async (event, meta, sourcePath) => {
  const personId = meta.owner;
  if (!personId || !sourcePath) return null;

  const baseDir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId)
  );
  const photosDir = path.join(baseDir, "photos");
  const photosMetaPath = path.join(baseDir, "photos.json");

  // ✅ Создаём все нужные папки
  fs.mkdirSync(photosDir, { recursive: true });

  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  let filename = `${base}${ext}`;
  let counter = 1;

  while (fs.existsSync(path.join(photosDir, filename))) {
    filename = `${base}_${counter}${ext}`;
    counter++;
  }

  const destPath = path.join(photosDir, filename);
  fs.copyFileSync(sourcePath, destPath);

  let photos = [];
  if (fs.existsSync(photosMetaPath)) {
    photos = JSON.parse(fs.readFileSync(photosMetaPath, "utf-8"));
  }

  const newPhoto = {
    id: Date.now(),
    filename,
    ...meta,
  };

  photos.push(newPhoto);
  fs.writeFileSync(photosMetaPath, JSON.stringify(photos, null, 2));

  return newPhoto;
});

ipcMain.handle("photo:getAllGlobal", async () => {
  const peopleDir = path.join(app.getPath("documents"), "Genealogy", "people");
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

// -----------------------------
const archiver = require("archiver");

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
      photo.filename
    );
    if (fs.existsSync(photoPath)) {
      archive.file(photoPath, { name: photo.filename });
    }
  }

  await archive.finalize();
  return filePath;
});

// -----------------------------
const PDFDocument = require("pdfkit");

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
      photo.filename
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

/*

~   Диалоговые окна сохранения

*/

// ipcMain.handle("dialog:chooseSavePathPhoto", async (_, defaultName) => {
//   const { canceled, filePath } = await dialog.showSaveDialog({
//     defaultPath: defaultName,
//     title: "Выберите место для сохранения",
//     buttonLabel: "Сохранить",
//     filters: [
//       { name: "Изображения", extensions: ["jpg", "jpeg", "png", "gif"] },
//       { name: "Все файлы", extensions: ["*"] },
//     ],
//   });

//   return canceled ? null : filePath;
// });

function getPhotoUrl(photo) {
  return path.join(
    process.env.HOME,
    "Documents",
    "Genealogy",
    "people",
    String(photo.owner),
    "photos",
    photo.filename
  );
}

ipcMain.on("photo:download", async (event, photo) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: photo.filename || `photo_${photo.id}.jpg`,
      title: "Сохранить фото",
      buttonLabel: "Сохранить",
      filters: [
        { name: "Изображения", extensions: ["jpg", "jpeg", "png", "gif"] },
        { name: "Все файлы", extensions: ["*"] },
      ],
    });

    if (canceled || !filePath) return;

    const sourcePath = getPhotoUrl(photo); // путь к исходному фото
    console.log("📂 Копируем из:", sourcePath);

    // читаем как buffer и сохраняем
    const buffer = await fs.promises.readFile(sourcePath);
    await fs.promises.writeFile(filePath, buffer);

    console.log("✅ Фото успешно сохранено в:", filePath);
  } catch (err) {
    console.error("💥 Ошибка сохранения фото:", err);
  }
});
