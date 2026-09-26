const { dialog, ipcMain } = require("electron");

ipcMain.handle("dialog:chooseOpenZip", async () => {
  const result = await dialog.showOpenDialog({
    title: "Выберите ZIP-бэкап",
    filters: [{ name: "ZIP-бэкап", extensions: ["zip"] }],
    properties: ["openFile"],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("dialog:chooseSavePath", async (_, defaultName) => {
  const result = await dialog.showSaveDialog({
    title: "Сохранить бэкап",
    defaultPath: defaultName || "Genealogy.zip",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  return result.canceled ? null : result.filePath;
});
