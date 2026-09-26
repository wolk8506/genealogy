// bio.cjs
const { ipcMain, dialog, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { peopleDir } = require("../config.cjs");
const { withWriteLock, writeTextAtomic } = require("./jsonStore.cjs");
const log = require("../logger.cjs").createLogger("bio");

const getBioDir = (id) => peopleDir(id);

// Новая функция для получения пути к папке с изображениями биографии
const getBioImagesDir = (id) => path.join(getBioDir(id), "bio_images");

ipcMain.handle("bio:load", async (event, id) => {
  const dir = getBioDir(id);
  const file = path.join(dir, "bio.md");
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf-8");
});

// Сколько биографий заполнено (файл существует и не пуст, как hasBio).
ipcMain.handle("bio:filledCount", async (event, ids) => {
  let count = 0;
  for (const id of ids || []) {
    try {
      const file = path.join(getBioDir(id), "bio.md");
      if (fs.existsSync(file) && fs.statSync(file).size > 10) count += 1;
    } catch {
      // игнорируем недоступные
    }
  }
  return count;
});

ipcMain.handle("bio:save", async (event, id, content) => {
  const dir = getBioDir(id);
  const imagesDir = getBioImagesDir(id);
  const file = path.join(dir, "bio.md");

  await withWriteLock(async () => {
    await writeTextAtomic(file, content);

    // 🧹 Чистка неиспользуемых изображений в подпапке bio_images
    if (fs.existsSync(imagesDir)) {
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
            log.error("Ошибка при удалении файла:", e);
          }
        }
      }
    }
  });
});

ipcMain.handle("bio:readImage", async (event, id, relPath) => {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const fullPath = path.join(getBioDir(id), normalized);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Изображение не найдено: ${normalized}`);
  }
  return fs.readFileSync(fullPath);
});

ipcMain.handle("bio:exportPdf", async (event, { html, defaultName }) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bio-pdf-"));
  const htmlPath = path.join(tmpDir, "bio.html");
  let win = null;

  try {
    await fs.promises.writeFile(htmlPath, html, "utf-8");

    win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Таймаут загрузки HTML")), 30000);
      win.webContents.once("did-finish-load", () => {
        clearTimeout(timeout);
        resolve();
      });
      win.webContents.once("did-fail-load", (_, __, desc) => {
        clearTimeout(timeout);
        reject(new Error(desc || "Не удалось загрузить HTML"));
      });
      win.loadFile(htmlPath);
    });

    await win.webContents.executeJavaScript(`
      Promise.all(
        Array.from(document.images).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                }),
        ),
      )
    `);

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
    });

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: defaultName || "biography.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, pdfBuffer);
    return filePath;
  } catch (err) {
    log.error("bio:exportPdf failed:", err);
    throw err;
  } finally {
    win?.destroy();
    fs.rmSync(tmpDir, { recursive: true, force: true });
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
        log.error(`Ошибка при удалении временного файла ${filename}:`, e);
      }
    }
  }
});
