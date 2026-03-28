const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");
const { personDir, dataPath } = require("../config.cjs");

ipcMain.handle("people:saveAll", async (event, people) => {
  try {
    const dirPath = path.join(app.getPath("documents"), "Genealogy");
    const filePath = path.join(dirPath, "genealogy-data.json");

    // 1. Создаем папку, если её нет.
    // { recursive: true } — магия, которая создаст всю цепочку папок и не упадет, если папка уже есть.
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 2. Теперь спокойно пишем файл
    fs.writeFileSync(filePath, JSON.stringify(people, null, 2), "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Ошибка при сохранении файла:", error);
    throw error; // Пробрасываем ошибку на фронтенд для обработки в UI
  }
});

ipcMain.handle("people:delete", async (event, id) => {
  // Блок изменен для возможности удаления из архива человека, если еще что-то не будет работать нужно пересмотреть архитектуру
  const baseDir = path.join(app.getPath("documents"), "Genealogy");
  const peoplePath = path.join(baseDir, "genealogy-data.json");
  const personDir = path.join(baseDir, "people", String(id)); // ← теперь путь корректный!

  try {
    await fs.promises.rm(personDir, { recursive: true, force: true });

    const content = await fs.promises.readFile(peoplePath, "utf-8");
    const people = JSON.parse(content);
    const updated = people.filter((p) => p.id !== id);

    await fs.promises.writeFile(
      peoplePath,
      JSON.stringify(updated, null, 2),
      "utf-8",
    );

    console.log(`🗑️ Удалён человек ${id} из genealogy-data.json и файлов`);
    return true;
  } catch (err) {
    console.error(`❌ Ошибка при удалении ${id}`, err);
    return false;
  }
});

ipcMain.handle("people:upsert", async (event, person) => {
  const file = path.join(
    app.getPath("documents"),
    "Genealogy",
    "genealogy-data.json",
  );
  let people = [];
  try {
    const content = await fs.promises.readFile(file, "utf-8");
    people = JSON.parse(content);
  } catch {}

  const index = people.findIndex((p) => p.id === person.id);
  if (index >= 0) {
    people[index] = person;
  } else {
    people.push(person);
  }

  await fs.promises.writeFile(file, JSON.stringify(people, null, 2), "utf-8");
});

// IPC: добавление человека
ipcMain.handle("people:add", (event, person) => {
  let data = [];
  if (fs.existsSync(dataPath)) {
    try {
      data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    } catch (err) {
      console.error("❌ Ошибка чтения JSON:", err);
    }
  }

  data.push(person);

  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log("✅ Человек сохранён в:", dataPath);
  } catch (err) {
    console.error("❌ Ошибка записи файла:", err);
  }
});

ipcMain.handle("people:getAll", () => {
  if (fs.existsSync(dataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      return data;
    } catch (err) {
      console.error("❌ Ошибка чтения JSON:", err);
      return [];
    }
  }
  return [];
});

ipcMain.handle("people:getById", (event, id) => {
  if (fs.existsSync(dataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      return data.find((person) => person.id === id) || null;
    } catch (err) {
      console.error("❌ Ошибка чтения JSON:", err);
    }
  }
  return null;
});

ipcMain.handle("people:update", async (event, id, updatedData) => {
  try {
    const filePath = path.join(
      app.getPath("documents"),
      "Genealogy",
      "genealogy-data.json",
    );
    const people = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const index = people.findIndex((p) => p.id === id);
    if (index !== -1) {
      people[index] = { ...people[index], ...updatedData };
      fs.writeFileSync(filePath, JSON.stringify(people, null, 2), "utf-8");
      return true;
    } else {
      throw new Error(`Человек с id=${id} не найден`);
    }
  } catch (err) {
    console.error("Ошибка при обновлении человека:", err);
    throw err;
  }
});
