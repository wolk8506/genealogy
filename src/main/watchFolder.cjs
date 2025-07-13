const { BrowserWindow, app } = require("electron");
const fs = require("fs");
const path = require("path");

let watcher = null;

function watchFolder() {
  const folderPath = path.join(app.getPath("documents"), "Genealogy");
  if (!fs.existsSync(folderPath)) return;

  if (watcher) watcher.close();
  watcher = fs.watch(folderPath, { recursive: true }, () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send("folder-size-updated");
  });
}

module.exports = { watchFolder };
