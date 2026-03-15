// // bio.cjs
// const { ipcMain, app, dialog } = require("electron");
// const path = require("path");
// const fs = require("fs");

// const getBioDir = (id) =>
//   path.join(app.getPath("documents"), "Genealogy", "people", String(id));

// ipcMain.handle("bio:load", async (event, id) => {
//   const dir = getBioDir(id);
//   const file = path.join(dir, "bio.md");
//   if (!fs.existsSync(file)) return "";
//   return fs.readFileSync(file, "utf-8");
// });

// ipcMain.handle("bio:save", async (event, id, content) => {
//   const dir = getBioDir(id);
//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//   const file = path.join(dir, "bio.md");
//   fs.writeFileSync(file, content, "utf-8");

//   // 🧹 Удаляем неиспользуемые изображения
//   const usedFiles = [...content.matchAll(/\]\((.+?)\)/g)].map((m) => m[1]);
//   const files = fs.readdirSync(dir);

//   for (const f of files) {
//     const fullPath = path.join(dir, f);
//     const isUsed =
//       usedFiles.includes(f) || usedFiles.includes(`file://${fullPath}`);

//     const stat = fs.statSync(fullPath);
//     const protectedNames = [
//       "bio.md",
//       "photos.json",
//       "avatar",
//       "avatar.png",
//       "avatar.jpg",
//       "avatar.webp",
//     ];
//     const isProtected = protectedNames.includes(f);

//     if (stat.isFile() && !isUsed && !isProtected) {
//       fs.unlinkSync(fullPath);
//     }
//   }
// });

// ipcMain.handle("bio:getFullImagePath", async (event, id, relPath) => {
//   const baseDir = path.join(app.getPath("documents"), "Genealogy");
//   const personDir = path.join(baseDir, "people", String(id));
//   const fullPath = path.join(personDir, relPath);
//   return `file://${fullPath}`;
// });

// ipcMain.handle("bio:addImage", async (event, id) => {
//   const result = await dialog.showOpenDialog({
//     title: "Выберите изображение",
//     filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }],
//     properties: ["openFile"],
//   });

//   if (result.canceled || result.filePaths.length === 0) return null;

//   const source = result.filePaths[0];
//   const ext = path.extname(source).toLowerCase();
//   const dir = getBioDir(id);

//   if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//   // 🔢 ищем все файлы по шаблону img_bio_XXXX.ext
//   const files = fs.readdirSync(dir);
//   const bioImages = files
//     .map((f) => f.match(/^img_bio_(\d{4})\.(jpg|jpeg|png|gif)$/i))
//     .filter(Boolean);

//   let nextNum = 1;
//   if (bioImages.length > 0) {
//     const maxNum = Math.max(...bioImages.map((m) => parseInt(m[1], 10)));
//     nextNum = maxNum + 1;
//   }

//   const filename = `img_bio_${String(nextNum).padStart(4, "0")}${ext}`;
//   const dest = path.join(dir, filename);

//   fs.copyFileSync(source, dest);

//   return filename; // относительный путь
// });

// ipcMain.handle("bio:getImagePath", (event, id, filename) => {
//   const dir = getBioDir(id);
//   return `file://${path.join(dir, filename)}`;
// });

// ipcMain.handle("bio:saveImage", async (event, id, filename, buffer) => {
//   const dir = getBioDir(id);
//   const filePath = path.join(dir, filename);
//   await fs.promises.mkdir(dir, { recursive: true });
//   await fs.promises.writeFile(filePath, buffer);
// });

// const getPersonDir = (id, baseDir) => path.join(baseDir, "people", String(id));

// // 📄 Чтение bio.md
// console.log("📡 Регистрируем обработчик bio:read");
// ipcMain.handle("bio:read", async (event, id) => {
//   console.log("📡 bio:read вызван для", id);

//   const baseDir = path.join(app.getPath("documents"), "Genealogy");

//   const filePath = path.join(baseDir, "people", String(id), "bio.md");

//   try {
//     await fs.promises.access(filePath, fs.constants.F_OK);
//     const content = await fs.promises.readFile(filePath, "utf-8");
//     console.log(
//       "📤 bio.md content (main.js):",
//       content.slice(0, 100),
//       typeof content,
//     );
//     return content;
//   } catch (err) {
//     console.warn(`❌ bio.md не найден или не читается: ${filePath}`, err);
//     return null;
//   }
// });

// // 🖼️ Получение абсолютного пути к изображению
// ipcMain.handle("bio:resolveImagePath", async (event, id, relPath) => {
//   const baseDir = path.join(app.getPath("documents"), "Genealogy");

//   return path.join(getPersonDir(id, baseDir), relPath);
// });

// // 🧱 Чтение изображения как Buffer
// ipcMain.handle("bio:readImage", async (event, id, relPath) => {
//   const baseDir = path.join(app.getPath("documents"), "Genealogy");

//   const fullPath = path.join(getPersonDir(id, baseDir), relPath);
//   const buffer = await fs.promises.readFile(fullPath);
//   return buffer;
// });

// ipcMain.handle("bio:write", async (event, id, text) => {
//   const file = path.join(
//     app.getPath("documents"),
//     "Genealogy",
//     "people",
//     String(id),
//     "bio.md",
//   );
//   await fs.promises.writeFile(file, text, "utf-8");
// });
// ----------------------------------------------------------------------------------
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
