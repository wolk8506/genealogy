const { app, Menu } = require("electron");

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

  // Меню
  const { buildMenuTemplate } = require("./menu.cjs");
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenuTemplate()));

  // Watcher
  const { watchFolder } = require("./watchFolder.cjs");
  app.whenReady().then(watchFolder);

  // Окно
  const { createWindow } = require("./window.cjs");
  app.whenReady().then(createWindow);

  // Закрытие
  app.on("window-all-closed", () => {
    app.quit(); // 📎 закрывает приложение окончательно
    // if (process.platform !== "darwin") app.quit(); // 💡 Остается в Dock
  });
})();
