const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");

ipcMain.handle("photos:saveFile", async (event, id, filename, buffer) => {
  console.log("🧪 photos:saveFile args", {
    id,
    filename,
    bufferType: buffer?.constructor?.name,
    bufferLength: buffer?.length,
  });

  const file = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(id),
    "photos",
    filename
  );

  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, buffer);
});

ipcMain.handle("photos:write", async (event, personId, data) => {
  const filePath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId),
    "photos.json"
  );

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
});

ipcMain.handle("photos:getByOwner", async (event, ownerId) => {
  const baseDir = path.join(app.getPath("documents"), "Genealogy");
  const personDir = path.join(baseDir, "people", String(ownerId));
  const photosPath = path.join(personDir, "photos.json");

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
  const baseDir = path.join(app.getPath("documents"), "Genealogy");
  const peopleDir = path.join(baseDir, "people");

  // Найдём, в какой папке лежит нужное фото
  const personFolders = await fs.promises.readdir(peopleDir);
  for (const folder of personFolders) {
    const photosJsonPath = path.join(peopleDir, folder, "photos.json");
    try {
      const content = await fs.promises.readFile(photosJsonPath, "utf-8");
      const photos = JSON.parse(content);
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        const photoPath = path.join(
          peopleDir,
          folder,
          "photos",
          photo.filename
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
  const file = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(id),
    "photos.json"
  );
  await fs.promises.writeFile(file, JSON.stringify(photos, null, 2), "utf-8");
});

ipcMain.handle("photos:read", async (event, personId) => {
  const filePath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId),
    "photos.json"
  );

  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") return null; // файл не найден — это нормально
    throw err;
  }
});
