const { app, Menu, Notification } = require("electron");
const { autoUpdater } = require("electron-updater"); // ← импортим здесь
const path = require("path");
const log = require("./logger.cjs").createLogger("main");

(async () => {
  const Store = (await import("electron-store")).default;
  const settingsStore = new Store({ name: "settings" });

  if (!settingsStore.has("importSettings")) {
    settingsStore.set("importSettings", { keepOriginals: true, quality: 80 });
  }

  // Передаём Store в модуль настроек
  require("./handlers/settings.cjs")(settingsStore);

  // Остальные хендлеры
  require("./handlers/avatar.cjs");
  require("./handlers/people.cjs");
  require("./handlers/photo.cjs")(settingsStore);
  require("./handlers/bio.cjs");
  require("./handlers/photos.cjs");
  require("./handlers/app.cjs");
  require("./handlers/log.cjs");
  require("./handlers/fs.cjs");
  require("./handlers/file.cjs");
  require("./handlers/archive.cjs");
  require("./handlers/menuContext.cjs");
  require("./handlers/changelog.cjs");
  require("./handlers/userGuide.cjs");
  require("./handlers/import.cjs");
  require("./handlers/dialogs.cjs");
  require("./handlers/dataStore.cjs");
  require("./handlers/geocode.cjs");
  require("./handlers/clipboard.cjs");
  const { resolveStartupRoot, notifyStartupProblem } = require("./handlers/storage.cjs");
  require("./handlers/photoConversion.cjs"); // для конвертера фотографий нв странице архив
  require("./handlers/serviceScript.cjs"); // для конвертера фотографий нв странице архив
  require("./handlers/face.cjs");
  require("./handlers/external.cjs");

  // чтобы не дергать whenReady() дважды — делаем один раз:
  app.whenReady().then(async () => {
    // Стартовый корень: недоступная папка больше не блокирует запуск
    // синхронным диалогом (см. storage.cjs).
    let startup;
    try {
      startup = resolveStartupRoot();
    } catch (error) {
      log.error("Не удалось определить папку данных:", error.message);
      startup = {
        root: null,
        fellBack: null,
        problem: { activeRoot: "", defaultRoot: "", isDefault: false },
      };
    }

    const { initializeFaceDb } = require("./db/faceDb.cjs");
    try {
      initializeFaceDb();
    } catch (error) {
      log.error("[sqlite] face DB initialization failed:", error.message);
    }

    // Меню
    const { buildMenuTemplate } = require("./menu.cjs");
    try {
      Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));
    } catch (error) {
      log.error("Не удалось собрать меню приложения:", error.message);
    }

    // Окно создаём до любых необязательных операций: watcher, автообновление
    // и проверка папок не должны оставлять пользователя без окна.
    const { createWindow } = require("./window.cjs");
    const win = createWindow();

    if (startup.fellBack) {
      win.webContents.once("did-finish-load", () => {
        win.webContents.send("storage:fallback", startup.fellBack);
      });
    }

    if (startup.problem) {
      win.webContents.once("did-finish-load", () => {
        // Небольшая задержка, чтобы рендерер успел подписаться на navigate.
        setTimeout(() => {
          if (!win.isDestroyed()) {
            notifyStartupProblem(win, startup.problem);
          }
        }, 600);
      });
    }

    // Наблюдение за папкой — необязательная функция, ошибки только логируем.
    try {
      const { watchFolder } = require("./watchFolder.cjs");
      watchFolder();
    } catch (error) {
      log.warn("Не удалось запустить наблюдение за папкой:", error.message);
    }

    // Автоапдейтер не должен мешать загрузке окна.
    try {
      const { setupAutoUpdater } = require("./autoUpdater.cjs");
      setupAutoUpdater(win);
    } catch (error) {
      log.warn("Не удалось инициализировать автообновление:", error.message);
    }

    try {
      const { updateInfo } = await autoUpdater.checkForUpdates();
      if (updateInfo && updateInfo.version !== app.getVersion()) {
        // пришло что-то новое — шлём в рендер баннер
        if (!win.isDestroyed()) {
          win.webContents.send("app:update-available", updateInfo);
        }

        // и системная нотификация
        new Notification({
          title: "Доступно обновление",
          body: `Версия ${updateInfo.version} готова к загрузке`,
        }).show();
      }
    } catch (e) {
      log.warn("Не удалось проверить апдейт на старте:", e.message);
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
})();
