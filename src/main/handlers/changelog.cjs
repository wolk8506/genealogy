const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

ipcMain.handle("changelog:read", async () => {
  const filePath = path.join(process.cwd(), "CHANGELOG.md");
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    return "Файл CHANGELOG.md не найден";
  }
});
