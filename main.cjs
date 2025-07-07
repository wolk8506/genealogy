const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { dialog } = require("electron");
const { shell } = require("electron");

let Store;

(async () => {
  // Импорт electron-store как ES-модуля
  Store = (await import("electron-store")).default;
  const store = new Store();

  function createWindow() {
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, //! 👈 разрешает загрузку file:// !!!Желательно переделать
      },
    });

    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      win.loadURL("http://localhost:5173");
      win.webContents.openDevTools();
    } else {
      win.loadFile(path.join(__dirname, "dist", "index.html"));
    }
  }

  app.whenReady().then(() => {
    // Надёжный путь к файлу в "Документах"
    const genealogyDir = path.join(app.getPath("documents"), "Genealogy");
    if (!fs.existsSync(genealogyDir)) {
      fs.mkdirSync(genealogyDir, { recursive: true });
    }
    const dataPath = path.join(
      app.getPath("documents"),
      "Genealogy",
      "genealogy-data.json"
    );

    console.log("📁 Путь к JSON-файлу:", dataPath);

    // IPC: сохранение темы
    ipcMain.handle("settings:get", (event, key) => {
      return store.get(key);
    });

    ipcMain.handle("settings:set", (event, key, value) => {
      store.set(key, value);
    });

    ipcMain.handle("app:getVersion", () => app.getVersion());
    ipcMain.handle("app:getPlatform", () => process.platform);

    ipcMain.handle("app:getBuildDate", () => {
      const buildTime = fs.statSync(path.join(__dirname, "main.cjs")).mtime;
      return buildTime.toISOString().split("T")[0]; // YYYY-MM-DD
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

    ipcMain.handle("avatar:getPath", (event, personId) => {
      const dir = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(personId)
      );
      if (!fs.existsSync(dir)) return null;

      const files = fs.readdirSync(dir);
      const avatarFile = files.find((f) => f.startsWith("avatar"));
      console.log("🔍 avatar:getPath", personId, "→", avatarFile);

      if (avatarFile) {
        return `file://${path.join(dir, avatarFile)}`;
      } else {
        return null;
      }
    });

    // -----------------------------

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
        filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }],
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

    ipcMain.handle("avatar:delete", async (event, personId) => {
      try {
        const avatarPath = path.join(
          app.getPath("documents"),
          "Genealogy",
          "people",
          String(personId),
          "avatar.jpg"
        );

        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
          return { success: true };
        } else {
          return { success: false, message: "Файл не найден" };
        }
      } catch (err) {
        console.error(`❌ Ошибка при удалении аватара ${personId}:`, err);
        return { success: false, message: err.message };
      }
    });

    // -----------------------------
    const photosMetaPath = path.join(
      app.getPath("documents"),
      "Genealogy",
      "photos.json"
    );

    ipcMain.handle("photo:getAll", async (event, personId) => {
      const peopleDir = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people"
      );
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
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }],
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
    ipcMain.handle(
      "photo:saveWithFilename",
      async (event, meta, sourcePath) => {
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
      }
    );

    // -----------------------------

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
        filters: [
          { name: "Images", extensions: ["jpg", "jpeg", "png", "gif"] },
        ],
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

    // -----------------------------
    ipcMain.handle("avatar:save", async (event, personId, buffer) => {
      const dir = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(personId)
      );
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const dest = path.join(dir, "avatar.jpg");
      fs.writeFileSync(dest, Buffer.from(buffer));
    });

    // -----------------------------
    ipcMain.handle("photo:getAllGlobal", async () => {
      const peopleDir = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people"
      );
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

    // -----------------------------
    ipcMain.handle("people:update", async (event, id, updatedData) => {
      try {
        const filePath = path.join(
          app.getPath("documents"),
          "Genealogy",
          "genealogy-data.json"
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

    // -----------------------------
    ipcMain.handle("people:saveAll", async (event, people) => {
      const filePath = path.join(
        app.getPath("documents"),
        "Genealogy",
        "genealogy-data.json"
      );
      fs.writeFileSync(filePath, JSON.stringify(people, null, 2), "utf-8");
    });

    // -----------------------------
    const getPersonDir = (id, baseDir) =>
      path.join(baseDir, "people", String(id));

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
    // -----------------------------
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

    // -----------------------------

    ipcMain.handle("people:delete", async (event, id) => {
      const baseDir = path.join(app.getPath("documents"), "Genealogy");
      const peoplePath = path.join(baseDir, "genealogy-data.json");
      const personDir = path.join(baseDir, "people", String(id));

      try {
        // Удаляем папку
        await fs.promises.rm(personDir, { recursive: true, force: true });

        // Обновляем genealogy-data.json
        const content = await fs.promises.readFile(peoplePath, "utf-8");
        const people = JSON.parse(content);
        const updated = people.filter((p) => p.id !== id);

        await fs.promises.writeFile(
          peoplePath,
          JSON.stringify(updated, null, 2),
          "utf-8"
        );

        console.log(`🗑️ Удалён человек ${id} из genealogy-data.json и файлов`);
        return true;
      } catch (err) {
        console.error(`❌ Ошибка при удалении ${id}`, err);
        return false;
      }
    });

    // -----------------------------
    ipcMain.handle("fs:ensurePersonFolder", async (event, id) => {
      const base = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(id)
      );
      await fs.promises.mkdir(path.join(base, "photos"), { recursive: true });
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

    ipcMain.handle("photos:save", async (event, id, photos) => {
      const file = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(id),
        "photos.json"
      );
      await fs.promises.writeFile(
        file,
        JSON.stringify(photos, null, 2),
        "utf-8"
      );
    });

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

    ipcMain.handle("people:upsert", async (event, person) => {
      const file = path.join(
        app.getPath("documents"),
        "Genealogy",
        "genealogy-data.json"
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

      await fs.promises.writeFile(
        file,
        JSON.stringify(people, null, 2),
        "utf-8"
      );
    });

    // -----------------------------
    const logFile = path.join(
      app.getPath("documents"),
      "Genealogy",
      "import-log.txt"
    );

    ipcMain.handle("log:append", async (event, text) => {
      await fs.promises.appendFile(logFile, text + "\n");
    });

    // -----------------------------

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

    // -----------------------------
    ipcMain.handle("photos:write", async (event, personId, data) => {
      const filePath = path.join(
        app.getPath("documents"),
        "Genealogy",
        "people",
        String(personId),
        "photos.json"
      );

      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
    });

    // -----------------------------
    ipcMain.handle("app:openDataFolder", async () => {
      const dataPath = path.join(app.getPath("documents"), "Genealogy");
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      await shell.openPath(dataPath);
    });
    // -----------------------------
    ipcMain.handle("fs:exists", async (event, relativePath) => {
      const fullPath = path.join(app.getPath("userData"), relativePath);
      return fs.existsSync(fullPath);
    });
    // -----------------------------
    ipcMain.handle("app:get-folder-size", async () => {
      const folderPath = path.join(app.getPath("documents"), "Genealogy");

      function getSize(dir) {
        let total = 0;
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            total += getSize(fullPath);
          } else {
            total += stats.size;
          }
        }
        return total;
      }

      try {
        const size = getSize(folderPath);
        return (size / (1024 * 1024)).toFixed(2); // MB
      } catch (err) {
        console.error("Ошибка при подсчёте размера папки:", err);
        return null;
      }
    });
    // -----------------------------
    // ! следим за размером папки

    let folderWatcher = null;

    function watchFolderChanges() {
      const folderPath = path.join(app.getPath("documents"), "Genealogy");

      if (!fs.existsSync(folderPath)) return;

      if (folderWatcher) {
        folderWatcher.close();
      }

      folderWatcher = fs.watch(folderPath, { recursive: true }, () => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send("folder-size-updated");
        }
      });
    }

    app.whenReady().then(() => {
      watchFolderChanges();
    });

    // -----------------------------

    createWindow();
  });
})();
