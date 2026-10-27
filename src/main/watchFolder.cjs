const { BrowserWindow } = require("electron");
const { getMainWindow } = require("./mainWindow.cjs");
const fs = require("fs");
const { getBaseDir } = require("./config.cjs");

let watcher = null;

function stopWatching() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

function watchFolder() {
  const folderPath = getBaseDir();
  if (!fs.existsSync(folderPath)) return;

  if (watcher) watcher.close();
  watcher = fs.watch(folderPath, { recursive: true }, () => {
    const win = getMainWindow();
    if (win) win.webContents.send("folder-size-updated");
  });
}

module.exports = { watchFolder, stopWatching };
