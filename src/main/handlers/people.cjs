const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");
const { getBaseDir } = require("../config.cjs");
const {
  readPeople,
  writePeople,
  upsertPerson,
  addPerson,
  getPersonById,
  updatePerson,
  deletePerson,
} = require("./dataStore.cjs");
const log = require("../logger.cjs").createLogger("people");

// Тонкие обёртки над dataStore.cjs — вся работа с genealogy-data.json
// (атомарная запись + очередь) живёт там.

ipcMain.handle("people:saveAll", async (event, people) => {
  try {
    await writePeople(people);
    return { success: true };
  } catch (error) {
    log.error("Ошибка при сохранении файла:", error);
    throw error; // Пробрасываем ошибку на фронтенд для обработки в UI
  }
});

ipcMain.handle("people:delete", async (event, id) => {
  // Блок изменен для возможности удаления из архива человека, если еще что-то не будет работать нужно пересмотреть архитектуру
  const personDir = path.join(getBaseDir(), "people", String(id)); // ← теперь путь корректный!

  try {
    await fs.promises.rm(personDir, { recursive: true, force: true });

    const removed = await deletePerson(id);

    log.info(`🗑️ Удалён человек ${id} из genealogy-data.json и файлов`);
    return removed > 0;
  } catch (err) {
    log.error(`❌ Ошибка при удалении ${id}`, err);
    return false;
  }
});

ipcMain.handle("people:upsert", async (event, person) => {
  return upsertPerson(person);
});

// IPC: добавление человека
ipcMain.handle("people:add", async (event, person) => {
  try {
    await addPerson(person);
    log.info("✅ Человек сохранён в:", getBaseDir());
  } catch (err) {
    log.error("❌ Ошибка записи файла:", err);
  }
});

ipcMain.handle("people:getAll", async () => {
  try {
    return await readPeople();
  } catch (err) {
    log.error("❌ Ошибка чтения JSON:", err);
    return [];
  }
});

ipcMain.handle("people:getById", async (event, id) => {
  try {
    return await getPersonById(id);
  } catch (err) {
    log.error("❌ Ошибка чтения JSON:", err);
  }
  return null;
});

ipcMain.handle("people:update", async (event, id, updatedData) => {
  try {
    return await updatePerson(id, updatedData);
  } catch (err) {
    log.error("Ошибка при обновлении человека:", err);
    throw err;
  }
});
