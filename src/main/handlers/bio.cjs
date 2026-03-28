// bio.cjs
const { ipcMain, app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const getBioDir = (id) =>
  path.join(app.getPath("documents"), "Genealogy", "people", String(id));

// Новая функция для получения пути к папке с изображениями биографии
const getBioImagesDir = (id) => path.join(getBioDir(id), "bio_images");

ipcMain.handle("bio:load", async (event, id) => {
  const dir = getBioDir(id);
  const file = path.join(dir, "bio.md");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf-8");
});

ipcMain.handle("bio:save", async (event, id, content) => {
  const dir = getBioDir(id);
  const imagesDir = getBioImagesDir(id);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, "bio.md");
  fs.writeFileSync(file, content, "utf-8");

  // 🧹 Чистка неиспользуемых изображений в подпапке bio_images
  if (fs.existsSync(imagesDir)) {
    // Извлекаем имена файлов из путей типа bio_images/img_bio_0001.png
    const usedFiles = [...content.matchAll(/\]\((.+?)\)/g)]
      .map((m) => m[1])
      .filter((p) => p.startsWith("bio_images/"))
      .map((p) => path.basename(p));

    const files = fs.readdirSync(imagesDir);

    for (const f of files) {
      if (!usedFiles.includes(f)) {
        try {
          fs.unlinkSync(path.join(imagesDir, f));
        } catch (e) {
          console.error("Ошибка при удалении файла:", e);
        }
      }
    }
  }
});

ipcMain.handle("bio:addImage", async (event, id) => {
  const result = await dialog.showOpenDialog({
    title: "Выберите изображение",
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const source = result.filePaths[0];
  const ext = path.extname(source).toLowerCase();
  const imagesDir = getBioImagesDir(id);

  // Создаем подпапку bio_images, если её нет
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const files = fs.readdirSync(imagesDir);
  const bioImages = files
    .map((f) => f.match(/^img_bio_(\d{4})\.(jpg|jpeg|png|gif)$/i))
    .filter(Boolean);

  let nextNum = 1;
  if (bioImages.length > 0) {
    const maxNum = Math.max(...bioImages.map((m) => parseInt(m[1], 10)));
    nextNum = maxNum + 1;
  }

  const filename = `img_bio_${String(nextNum).padStart(4, "0")}${ext}`;
  const dest = path.join(imagesDir, filename);

  fs.copyFileSync(source, dest);

  // Возвращаем относительный путь с учетом подпапки
  return `bio_images/${filename}`;
});

ipcMain.handle("bio:getFullImagePath", async (event, id, relPath) => {
  const personDir = getBioDir(id);
  const fullPath = path.join(personDir, relPath);
  return `file://${fullPath}`;
});

// Обновленный резолвер для фронтенда
ipcMain.handle("bio:resolveImagePath", async (event, id, relPath) => {
  const personDir = getBioDir(id);
  // relPath теперь приходит как "bio_images/img_..."
  return path.join(personDir, relPath);
});
// Удаляет во время отмены
ipcMain.handle("bio:deleteImages", async (event, id, filenames) => {
  const imagesDir = getBioImagesDir(id);
  if (!fs.existsSync(imagesDir)) return;

  for (const relPath of filenames) {
    // relPath может быть "bio_images/name.jpg" или просто "name.jpg"
    const filename = path.basename(relPath);
    const filePath = path.join(imagesDir, filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`Ошибка при удалении временного файла ${filename}:`, e);
      }
    }
  }
});
