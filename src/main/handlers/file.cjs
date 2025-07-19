const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

ipcMain.handle("file:writeText", async (_, targetPath, text) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(targetPath, text, "utf-8");
});

ipcMain.handle("file:writeBlob", async (_, targetPath, arrayBuffer) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(targetPath, buffer);
});

ipcMain.handle("file:copyFile", async (_, source, destination) => {
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.copyFile(source, destination);
});

ipcMain.handle("file:ensureDir", async (_, dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
});

ipcMain.handle("file:delete", async (_, targetPath) => {
  const fs = require("fs").promises;
  const { rm } = require("fs/promises");
  await rm(targetPath, { recursive: true, force: true });
});

ipcMain.handle("file:write-buffer", async (_, filePath, buffer) => {
  try {
    await fs.promises.writeFile(filePath, Buffer.from(buffer));
  } catch (err) {
    console.error("💥 Ошибка записи:", err);
    throw err;
  }
});
