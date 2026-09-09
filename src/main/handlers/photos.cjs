const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { peopleDir, photosMetaPath, getPeopleRoot } = require("../config.cjs");

ipcMain.handle("photos:saveFile", async (event, id, filename, buffer) => {
  console.log("🧪 photos:saveFile args", {
    id,
    filename,
    bufferType: buffer?.constructor?.name,
    bufferLength: buffer?.length,
  });

  const file = path.join(
    peopleDir(String(id)),
    "photos",
    filename,
  );

  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, buffer);
});

ipcMain.handle("photos:write", async (event, personId, data) => {
  const filePath = photosMetaPath(personId);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
});

ipcMain.handle("photos:getByOwner", async (event, ownerId) => {
  const personDir = peopleDir(String(ownerId));
  const photosPath = photosMetaPath(ownerId);

  try {
    const content = await fs.promises.readFile(photosPath, "utf-8");
    const allPhotos = JSON.parse(content);
    return allPhotos.filter((p) => p.owner === ownerId);
  } catch (err) {
    console.warn(`📭 Нет photos.json для ${ownerId}`, err);
    return [];
  }
});

ipcMain.handle("photos:getPath", async (event, photoId) => {
  const peopleDirPath = getPeopleRoot();

  // Найдём, в какой папке лежит нужное фото
  const personFolders = await fs.promises.readdir(peopleDirPath);
  for (const folder of personFolders) {
    const photosJsonPath = path.join(peopleDirPath, folder, "photos.json");
    try {
      const content = await fs.promises.readFile(photosJsonPath, "utf-8");
      const photos = JSON.parse(content);
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        const photoPath = path.join(
          peopleDirPath,
          folder,
          "photos",
          photo.filename,
        );
        return `file://${photoPath}`;
      }
    } catch {
      continue;
    }
  }

  console.warn(`❌ Фото с id ${photoId} не найдено`);
  return null;
});

ipcMain.handle("photos:save", async (event, id, photos) => {
  const file = photosMetaPath(id);
  await fs.promises.writeFile(file, JSON.stringify(photos, null, 2), "utf-8");
});

// ipcMain.handle("photos:save", async (event, id, photos) => {
//   const file = path.join(
//     app.getPath("documents"),
//     "Genealogy",
//     "people",
//     String(id),
//     "photos.json",
//   );

//   await fs.promises.writeFile(file, JSON.stringify(photos, null, 2), "utf-8");

//   // Обновляем кэш тегов, чтобы фронтенд сразу видел изменения
//   // Внутри photos:save после записи файла
//   photos.forEach((p) => {
//     p.hashtags?.forEach((tag) => globalHashtags.add(tag.trim().toLowerCase()));
//     // И если парсишь из описания:
//     const matches = p.description?.match(/#[\p{L}\d_]+/gu);
//     matches?.forEach((tag) => globalHashtags.add(tag.toLowerCase()));
//   });
// });

ipcMain.handle("photos:read", async (event, personId) => {
  const filePath = photosMetaPath(personId);

  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") return null; // файл не найден — это нормально
    throw err;
  }
});

// МОДИФИЦИРУЕМ ТВОЙ СУЩЕСТВУЮЩИЙ КХЕНДЛЕР СОХРАНЕНИЯ
// Чтобы при сохранении фото индекс обновлялся автоматически
