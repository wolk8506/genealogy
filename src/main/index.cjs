// const { app, Menu } = require("electron");

// (async () => {
//   const Store = (await import("electron-store")).default;
//   const settingsStore = new Store({ name: "settings" });

//   // Передаём Store в модуль настроек
//   require("./handlers/settings.cjs")(settingsStore);

//   // Остальные хендлеры
//   require("./handlers/avatar.cjs");
//   require("./handlers/people.cjs");
//   require("./handlers/photo.cjs");
//   require("./handlers/bio.cjs");
//   require("./handlers/photos.cjs");
//   require("./handlers/app.cjs");
//   require("./handlers/log.cjs");
//   require("./handlers/fs.cjs");
//   require("./handlers/file.cjs");
//   require("./handlers/archive.cjs");
//   require("./handlers/menuContext.cjs");

//   // Меню
//   const { buildMenuTemplate } = require("./menu.cjs");
//   Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));

//   // Watcher
//   const { watchFolder } = require("./watchFolder.cjs");
//   app.whenReady().then(watchFolder);

//   // Окно
//   const { createWindow } = require("./window.cjs");
//   const { setupAutoUpdater } = require("./autoUpdater.cjs");
//   app.whenReady().then(() => {
//     const win = createWindow();
//     setupAutoUpdater(win);
//   });

//   // Закрытие
//   app.on("window-all-closed", () => {
//     app.quit(); // 📎 закрывает приложение окончательно
//     // if (process.platform !== "darwin") app.quit(); // 💡 Остается в Dock
//   });
// })();
const { app, Menu, Notification } = require("electron");
const { autoUpdater } = require("electron-updater"); // ← импортим здесь
const path = require("path");

(async () => {
  const Store = (await import("electron-store")).default;
  const settingsStore = new Store({ name: "settings" });

  // Передаём Store в модуль настроек
  require("./handlers/settings.cjs")(settingsStore);

  // Остальные хендлеры
  require("./handlers/avatar.cjs");
  require("./handlers/people.cjs");
  require("./handlers/photo.cjs");
  require("./handlers/bio.cjs");
  require("./handlers/photos.cjs");
  require("./handlers/app.cjs");
  require("./handlers/log.cjs");
  require("./handlers/fs.cjs");
  require("./handlers/file.cjs");
  require("./handlers/archive.cjs");
  require("./handlers/menuContext.cjs");

  // чтобы не дергать whenReady() дважды — делаем один раз:
  app.whenReady().then(async () => {
    // Меню
    const { buildMenuTemplate } = require("./menu.cjs");
    Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));
    // 1) стартуем watcher
    const { watchFolder } = require("./watchFolder.cjs");
    watchFolder();

    // 2) создаём окно
    const { createWindow } = require("./window.cjs");
    const win = createWindow();

    // 3) подключаем ваш автоапдейтер-модуль
    const { setupAutoUpdater } = require("./autoUpdater.cjs");
    setupAutoUpdater(win);

    // 4) и тут же — проверяем апдейт и пушим нотификацию
    try {
      const { updateInfo } = await autoUpdater.checkForUpdates();
      if (updateInfo && updateInfo.version !== app.getVersion()) {
        // пришло что-то новое — шлём в рендер баннер
        win.webContents.send("app:update-available", updateInfo);

        // и системная нотификация
        new Notification({
          title: "Доступно обновление",
          body: `Версия ${updateInfo.version} готова к загрузке`,
        }).show();
      }
    } catch (e) {
      console.warn("Не удалось проверить апдейт на старте:", e.message);
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
})();
