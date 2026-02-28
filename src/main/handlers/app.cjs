// 🧩 Информация о приложении

const { ipcMain, app, shell, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getPlatform", () => process.platform);

ipcMain.handle("app:getBuildDate", () => {
  const buildTime = fs.statSync(path.join(__dirname, "main.cjs")).mtime;
  return buildTime.toISOString().split("T")[0]; // YYYY-MM-DD
});

ipcMain.handle("app:openDataFolder", async () => {
  const dataPath = path.join(app.getPath("documents"), "Genealogy");
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  await shell.openPath(dataPath);
});

ipcMain.handle("app:get-folder-size", async () => {
  const folderPath = path.join(app.getPath("documents"), "Genealogy");

  function getSize(dir) {
    let total = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        total += getSize(fullPath);
      } else {
        total += stats.size;
      }
    }
    return total;
  }

  try {
    const size = getSize(folderPath);
    return (size / (1024 * 1024)).toFixed(2); // MB
  } catch (err) {
    console.error("Ошибка при подсчёте размера папки:", err);
    return null;
  }
});

ipcMain.handle("window:setFullscreen", (event, enable) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.setFullScreen(enable);
});

ipcMain.handle("window:isFullscreen", () => {
  const win = BrowserWindow.getFocusedWindow();
  return win ? win.isFullScreen() : false;
});

ipcMain.handle("path:getTempDir", () => {
  return path.join(app.getPath("documents"), "Genealogy", "temp");
});

ipcMain.on("app:quit", () => {
  app.quit();
});

// ! Для страницы архив
// Вычисляем объем и количество фото
// ipcMain.handle("app:get-person-folder-size", async (event, personId) => {
//   // Принудительно очищаем ID от лишних символов
//   const cleanId = String(personId).trim();
//   const folderPath = path.join(
//     app.getPath("documents"),
//     "Genealogy",
//     "people",
//     cleanId,
//   );

//   if (!fs.existsSync(folderPath)) {
//     console.log(`Папка не найдена: ${folderPath}`);
//     return "0.00";
//   }

//   // Используем более производительный метод для обхода
//   function getSize(dir) {
//     let total = 0;
//     const files = fs.readdirSync(dir, { withFileTypes: true });
//     for (const file of files) {
//       const fullPath = path.join(dir, file.name);
//       if (file.isDirectory()) {
//         total += getSize(fullPath);
//       } else {
//         const stats = fs.statSync(fullPath);
//         total += stats.size;
//       }
//     }
//     return total;
//   }

//   try {
//     const size = getSize(folderPath);
//     const mb = (size / (1024 * 1024)).toFixed(2);
//     console.log(`ID: ${cleanId}, Size: ${mb} MB`);
//     return mb;
//   } catch (err) {
//     console.error("Ошибка:", err);
//     return "0.00";
//   }
// });
ipcMain.handle("app:get-person-folder-size", async (event, personId) => {
  const cleanId = String(personId).trim();
  const rootPath = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    cleanId,
  );
  const photosPath = path.join(rootPath, "photos");

  let totalSize = 0;
  let photoCount = 0;

  // Рекурсивная функция для обхода всех файлов
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        walk(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        totalSize += stats.size;

        // Если файл находится именно в папке photos, инкрементируем счетчик
        // Используем .includes или проверку пути, чтобы считать только файлы внутри 'photos'
        if (fullPath.startsWith(photosPath)) {
          photoCount++;
        }
      }
    }
  }

  try {
    walk(rootPath);
    return {
      size: (totalSize / (1024 * 1024)).toFixed(2), // MB
      count: photoCount,
    };
  } catch (err) {
    console.error(err);
    return { size: "0.00", count: 0 };
  }
});
