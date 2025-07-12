const { ipcMain, app, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const getBioDir = (id) =>
  path.join(app.getPath("documents"), "Genealogy", "people", String(id));

ipcMain.handle("bio:load", async (event, id) => {
  const dir = getBioDir(id);
  const file = path.join(dir, "bio.md");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf-8");
});

ipcMain.handle("bio:save", async (event, id, content) => {
  const dir = getBioDir(id);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, "bio.md");
  fs.writeFileSync(file, content, "utf-8");

  // 🧹 Удаляем неиспользуемые изображения
  const usedFiles = [...content.matchAll(/\]\((.+?)\)/g)].map((m) => m[1]);
  const files = fs.readdirSync(dir);

  for (const f of files) {
    const fullPath = path.join(dir, f);
    const isUsed =
      usedFiles.includes(f) || usedFiles.includes(`file://${fullPath}`);

    const stat = fs.statSync(fullPath);
    const protectedNames = [
      "bio.md",
      "photos.json",
      "avatar",
      "avatar.png",
      "avatar.jpg",
      "avatar.webp",
    ];
    const isProtected = protectedNames.includes(f);

    if (stat.isFile() && !isUsed && !isProtected) {
      fs.unlinkSync(fullPath);
    }
  }
});

ipcMain.handle("bio:getFullImagePath", async (event, id, relPath) => {
  const baseDir = path.join(app.getPath("documents"), "Genealogy");
  const personDir = path.join(baseDir, "people", String(id));
  const fullPath = path.join(personDir, relPath);
  return `file://${fullPath}`;
});

ipcMain.handle("bio:addImage", async (event, id) => {
  const result = await dialog.showOpenDialog({
    title: "Выберите изображение",
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const source = result.filePaths[0];
  const ext = path.extname(source);
  const base = path.basename(source, ext);
  const dir = getBioDir(id);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let filename = `${base}${ext}`;
  let counter = 1;
  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${base}_${counter}${ext}`;
    counter++;
  }

  const dest = path.join(dir, filename);
  fs.copyFileSync(source, dest);

  return filename; // относительный путь
});

ipcMain.handle("bio:getImagePath", (event, id, filename) => {
  const dir = getBioDir(id);
  return `file://${path.join(dir, filename)}`;
});

ipcMain.handle("bio:saveImage", async (event, id, filename, buffer) => {
  const dir = getBioDir(id);
  const filePath = path.join(dir, filename);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(filePath, buffer);
});

const getPersonDir = (id, baseDir) => path.join(baseDir, "people", String(id));

// 📄 Чтение bio.md
console.log("📡 Регистрируем обработчик bio:read");
ipcMain.handle("bio:read", async (event, id) => {
  console.log("📡 bio:read вызван для", id);

  const baseDir = path.join(app.getPath("documents"), "Genealogy");

  const filePath = path.join(baseDir, "people", String(id), "bio.md");

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    const content = await fs.promises.readFile(filePath, "utf-8");
    console.log(
      "📤 bio.md content (main.js):",
      content.slice(0, 100),
      typeof content
    );
    return content;
  } catch (err) {
    console.warn(`❌ bio.md не найден или не читается: ${filePath}`, err);
    return null;
  }
});

// 🖼️ Получение абсолютного пути к изображению
ipcMain.handle("bio:resolveImagePath", async (event, id, relPath) => {
  const baseDir = path.join(app.getPath("documents"), "Genealogy");

  return path.join(getPersonDir(id, baseDir), relPath);
});

// 🧱 Чтение изображения как Buffer
ipcMain.handle("bio:readImage", async (event, id, relPath) => {
  const baseDir = path.join(app.getPath("documents"), "Genealogy");

  const fullPath = path.join(getPersonDir(id, baseDir), relPath);
  const buffer = await fs.promises.readFile(fullPath);
  return buffer;
});

ipcMain.handle("bio:write", async (event, id, text) => {
  const file = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(id),
    "bio.md"
  );
  await fs.promises.writeFile(file, text, "utf-8");
});
