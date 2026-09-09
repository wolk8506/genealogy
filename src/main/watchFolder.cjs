const { BrowserWindow } = require("electron");
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
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send("folder-size-updated");
  });
}

module.exports = { watchFolder, stopWatching };
