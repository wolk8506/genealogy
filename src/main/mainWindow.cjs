let mainWindow = null;

function setMainWindow(win) {
  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
}

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return null;
}

module.exports = { setMainWindow, getMainWindow };
