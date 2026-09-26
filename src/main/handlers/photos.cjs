const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { peopleDir, photosMetaPath, getPeopleRoot } = require("../config.cjs");
const log = require("../logger.cjs").createLogger("photos");
const {
  readPhotosMeta,
  writePhotosMeta,
} = require("./photosMetaStore.cjs");

ipcMain.handle("photos:saveFile", async (event, id, filename, buffer) => {
  log.info("🧪 photos:saveFile args", {
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
  await writePhotosMeta(personId, data);
});

ipcMain.handle("photos:getByOwner", async (event, ownerId) => {
  try {
    const allPhotos = await readPhotosMeta(ownerId);
    return allPhotos.filter((p) => p.owner === ownerId);
  } catch (err) {
    log.warn(`📭 Нет photos.json для ${ownerId}`, err);
    return [];
  }
});

ipcMain.handle("photos:getPath", async (event, photoId) => {
  const peopleDirPath = getPeopleRoot();

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

  log.warn(`❌ Фото с id ${photoId} не найдено`);
  return null;
});

ipcMain.handle("photos:save", async (event, id, photos) => {
  await writePhotosMeta(id, photos);
});

ipcMain.handle("photos:read", async (event, personId) => {
  return readPhotosMeta(personId, { ifMissing: "null" });
});
