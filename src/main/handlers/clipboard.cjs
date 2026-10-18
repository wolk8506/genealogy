// handlers/clipboard.cjs — запись в системный буфер обмена.
// В sandboxed preload модуль `clipboard` недоступен, поэтому пишем из main.
const { ipcMain, clipboard } = require("electron");

ipcMain.handle("clipboard:writeText", (_event, text) => {
  clipboard.writeText(String(text ?? ""));
  return true;
});
