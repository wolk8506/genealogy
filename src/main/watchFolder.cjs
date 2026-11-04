const { getMainWindow } = require("./mainWindow.cjs");
const fs = require("fs");
const log = require("./logger.cjs").createLogger("watchFolder");
const { getBaseDir } = require("./config.cjs");

let watcher = null;

function stopWatching() {
  if (!watcher) return;
  try {
    watcher.close();
  } catch (error) {
    log.warn("Не удалось остановить наблюдение за папкой:", error.message);
  } finally {
    watcher = null;
  }
}

function watchFolder() {
  const folderPath = getBaseDir();

  try {
    if (!fs.existsSync(folderPath)) return;
  } catch (error) {
    log.warn("Папка данных недоступна:", error.message);
    return;
  }

  stopWatching();

  try {
    watcher = fs.watch(folderPath, { recursive: true }, () => {
      const win = getMainWindow();
      if (win) win.webContents.send("folder-size-updated");
    });
  } catch (error) {
    // Наблюдение за папкой — необязательная функция. Из-за ограничений
    // macOS/сетевых томов fs.watch здесь может бросить исключение, но это
    // не должно мешать созданию окна и работе приложения.
    watcher = null;
    log.warn("Не удалось следить за папкой данных:", error.message);
  }
}

module.exports = { watchFolder, stopWatching };
