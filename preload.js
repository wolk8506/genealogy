const { contextBridge, ipcRenderer } = require("electron");
console.log("✅ preload.js загружен");

// ⚙️ Настройки
contextBridge.exposeInMainWorld("settings", {
  get: (key) => ipcRenderer.invoke("settings:get", key),
  set: (key, value) => ipcRenderer.invoke("settings:set", key, value),
});

// 🎚️ Тема
contextBridge.exposeInMainWorld("themeAPI", {
  get: () => ipcRenderer.invoke("get-system-theme"),
  onChange: (callback) =>
    ipcRenderer.on("theme-updated", (_, theme) => callback(theme)),
  setUserTheme: (theme) => localStorage.setItem("user-theme", theme),
  getUserTheme: () => localStorage.getItem("user-theme"),
});

//📌 Главное меню
contextBridge.exposeInMainWorld("navigationAPI", {
  onNavigate: (callback) => {
    ipcRenderer.on("navigate", (event, route) => {
      callback(route);
    });
  },
});

// 👤 Люди
contextBridge.exposeInMainWorld("peopleAPI", {
  savePerson: (person) => ipcRenderer.invoke("people:add", person),
  getAll: () => ipcRenderer.invoke("people:getAll"),
  getById: (id) => ipcRenderer.invoke("people:getById", id),
  update: (id, data) => ipcRenderer.invoke("people:update", id, data),
  saveAll: (people) => ipcRenderer.invoke("people:saveAll", people),
  delete: (id) => ipcRenderer.invoke("people:delete", id),
  upsert: (person) => ipcRenderer.invoke("people:upsert", person),
});

// 🖼️ Аватары
contextBridge.exposeInMainWorld("avatarAPI", {
  getPath: (personId) => ipcRenderer.invoke("avatar:getPath", personId),
  save: (id, buffer) => ipcRenderer.invoke("avatar:save", id, buffer),
  delete: (personId) => ipcRenderer.invoke("avatar:delete", personId),
});

// 📸 Фото (глобальные)
contextBridge.exposeInMainWorld("photoAPI", {
  save: (personId, meta) => ipcRenderer.invoke("photo:save", personId, meta),
  saveWithFilename: (meta, filename) =>
    ipcRenderer.invoke("photo:saveWithFilename", meta, filename),
  getAll: (personId) => ipcRenderer.invoke("photo:getAll", personId),
  update: (ownerId, photo) =>
    ipcRenderer.invoke("photo:update", ownerId, photo),
  getPath: (personId, filename) =>
    ipcRenderer.invoke("photo:getPath", personId, filename),
  delete: (personId, id) => ipcRenderer.invoke("photo:delete", personId, id),
  selectFile: () => ipcRenderer.invoke("photo:selectFile"),
  getAllGlobal: () => ipcRenderer.invoke("photo:getAllGlobal"),
});

// 📁 Фото (импорт/экспорт)
contextBridge.exposeInMainWorld("photosAPI", {
  getByOwner: (id) => ipcRenderer.invoke("photos:getByOwner", id),
  getPath: (photoId) => ipcRenderer.invoke("photos:getPath", photoId),
  save: (id, photos) => ipcRenderer.invoke("photos:save", id, photos),
  saveFile: (id, filename, buffer) =>
    ipcRenderer.invoke("photos:saveFile", id, filename, buffer),
  read: (id) => ipcRenderer.invoke("photos:read", id),
  write: (id, data) => ipcRenderer.invoke("photos:write", id, data),
});

// 🧬 Биография
contextBridge.exposeInMainWorld("bioAPI", {
  load: (id) => ipcRenderer.invoke("bio:load", id),
  save: (id, content) => ipcRenderer.invoke("bio:save", id, content),
  addImage: (id) => ipcRenderer.invoke("bio:addImage", id),
  getImagePath: (id, filename) =>
    ipcRenderer.invoke("bio:getImagePath", id, filename),
  read: async (id) => {
    const result = await ipcRenderer.invoke("bio:read", id);
    return result || "";
  },
  resolveImagePath: (id, relPath) =>
    ipcRenderer.invoke("bio:resolveImagePath", id, relPath),
  readImage: async (id, relPath) => {
    const buffer = await ipcRenderer.invoke("bio:readImage", id, relPath);
    return new Blob([buffer]);
  },
  getFullImagePath: (id, relPath) =>
    ipcRenderer.invoke("bio:getFullImagePath", id, relPath),
  write: (id, text) => ipcRenderer.invoke("bio:write", id, text),

  saveImage: (id, filename, buffer) =>
    ipcRenderer.invoke("bio:saveImage", id, filename, buffer),
});

// 📂 Файловая система
contextBridge.exposeInMainWorld("fsAPI", {
  ensurePersonFolder: (id) => ipcRenderer.invoke("fs:ensurePersonFolder", id),
  exists: (relativePath) => ipcRenderer.invoke("fs:exists", relativePath),
});

// 📤 Экспорт
contextBridge.exposeInMainWorld("photoExport", {
  exportZip: (photos) => ipcRenderer.invoke("photo:exportZip", photos),
  exportPDF: (photos) => ipcRenderer.invoke("photo:exportPDF", photos),
});

// 🧩 Информация о приложении
contextBridge.exposeInMainWorld("appAPI", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getPlatform: () => ipcRenderer.invoke("app:getPlatform"),
  openDataFolder: () => ipcRenderer.invoke("app:openDataFolder"),
  resetSettings: () => ipcRenderer.invoke("app:resetSettings"),
  getBuildDate: () => ipcRenderer.invoke("app:getBuildDate"),
  getFolderSize: () => ipcRenderer.invoke("app:get-folder-size"),
  onFolderSizeUpdated: (callback) =>
    ipcRenderer.on("app:folder-size-updated", callback),
});
//  лог
contextBridge.exposeInMainWorld("logAPI", {
  append: (text) => ipcRenderer.invoke("log:append", text),
});
