// const { ipcMain, app } = require("electron");
// const { autoUpdater } = require("electron-updater");
// const path = require("path");
// const fs = require("fs");
// const { https } = require("follow-redirects");

// // перед первым вызовом checkForUpdates
// autoUpdater.autoDownload = false;
// autoUpdater.allowPrerelease = false; // при необходимости

// // безопасное удаление
// function safeUnlink(filePath) {
//   fs.unlink(filePath, (err) => {
//     if (err && err.code !== "ENOENT") {
//       console.warn(`⚠️ Не удалось удалить файл ${filePath}:`, err.message);
//     }
//   });
// }

// // скачивание с редиректами и прогрессом
// function downloadFile(url, outputPath, win) {
//   console.log("🔧 downloadFile вызван с URL:", url);
//   const file = fs.createWriteStream(outputPath);
//   let downloaded = 0;
//   let total = 0;

//   const request = https.get(url, (res) => {
//     // редирект
//     if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
//       console.log("🔀 Redirect to:", res.headers.location);
//       file.close();
//       safeUnlink(outputPath);
//       return downloadFile(res.headers.location, outputPath, win);
//     }
//     if (res.statusCode !== 200) {
//       console.error("❌ HTTP статус:", res.statusCode);
//       file.close();
//       safeUnlink(outputPath);
//       return;
//     }

//     total = parseInt(res.headers["content-length"], 10) || 0;
//     if (!total) console.warn("⚠️ Нет content-length");

//     res.on("data", (chunk) => {
//       downloaded += chunk.length;
//       if (total) {
//         const pct = Math.floor((downloaded / total) * 100);
//         win.webContents.send("update:progress", pct);
//         console.log(`📦 Загрузка: ${pct}%`);
//       }
//     });

//     res.pipe(file);
//   });

//   file.on("finish", () => {
//     file.close(() => {
//       fs.stat(outputPath, (err, stats) => {
//         if (err || stats.size < 100000) {
//           console.error("⚠️ Файл некорректен или слишком мал:", err?.message);
//           safeUnlink(outputPath);
//           return;
//         }
//         console.log("✅ Файл загружен:", outputPath);
//         win.webContents.send("update:downloaded", outputPath);
//       });
//     });
//   });

//   request.on("error", (err) => {
//     console.error("❌ Ошибка HTTP-запроса:", err.message);
//     file.close();
//     safeUnlink(outputPath);
//   });
//   file.on("error", (err) => {
//     console.error("❌ Ошибка файлового стрима:", err.message);
//     file.close();
//     safeUnlink(outputPath);
//   });
// }

// function setupAutoUpdater(win) {
//   console.log("🛠 setupAutoUpdater инициализирован");
//   let updateInfo = null;

//   // 1) Проверяем обновления, но не скачиваем
//   ipcMain.on("update:check", async () => {
//     console.log("📡 [MAIN] update:check received");
//     try {
//       const result = await autoUpdater.checkForUpdates();
//       updateInfo = result.updateInfo;
//       console.log("🔍 [MAIN] updateInfo:", updateInfo);
//       win.webContents.send("update:available", updateInfo);
//     } catch (err) {
//       console.error("❌ [MAIN] checkForUpdates error:", err.message);
//     }
//   });

//   // 2) Ручное скачивание по нажатию кнопки
//   ipcMain.on("update:download", (_evt, info) => {
//     if (info) updateInfo = info;

//     const rawUrl = updateInfo.files[0].url; // ← "Genealogy-1.0.11-arm64.dmg"
//     const version = updateInfo.version; // ← "1.0.11"

//     // если rawUrl уже абсолютный — ничего не делаем,
//     // иначе собираем из owner/repo/version/file
//     let url = rawUrl;
//     if (!/^https?:\/\//.test(rawUrl)) {
//       url = `https://github.com/wolk8506/genealogy/releases/download/${version}/${rawUrl}`;
//     }
//     console.log("🔗 final download URL:", url);

//     const downloadDir = path.join(app.getPath("downloads"), "GenealogyUpdater");
//     fs.mkdirSync(downloadDir, { recursive: true });

//     const outputPath = path.join(downloadDir, `Genealogy-${version}.dmg`);
//     console.log("📥 скачиваем в:", outputPath);

//     downloadFile(url, outputPath, win);
//   });

//   // 3) Установка приложения
//   ipcMain.on("update:install", (_e, filePath) => {
//     const { shell } = require("electron");
//     shell.openPath(filePath);
//   });

//   // 4) Очистка старых загрузок при старте
//   const tempDir = path.join(app.getPath("downloads"), "GenealogyUpdater");
//   fs.rm(tempDir, { recursive: true, force: true }, (err) => {
//     if (err) console.warn("⚠️ Не удалось очистить:", err.message);
//     else console.log("🧼 Старые загрузки удалены");
//   });
// }

// module.exports = { setupAutoUpdater };

// // В main.js или autoUpdater.cjs
// src/main/autoUpdater.cjs

const { ipcMain, app, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");
const { https } = require("follow-redirects");

// отключаем авто-скачивание внутри electron-updater
autoUpdater.autoDownload = false;
autoUpdater.allowPrerelease = false;

// безопасно удаляет файл, игнорируя ENOENT
function safeUnlink(filePath) {
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn(`⚠️ Не удалось удалить файл ${filePath}:`, err.message);
    }
  });
}

// скачивает URL в outputPath, посылает прогресс в рендер, возвращает Promise
function downloadFile(url, outputPath, win) {
  return new Promise((resolve, reject) => {
    console.log("🔧 downloadFile вызван с URL:", url);
    const file = fs.createWriteStream(outputPath);
    let downloaded = 0;
    let total = 0;

    const request = https.get(url, (res) => {
      // редирект
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        file.close();
        safeUnlink(outputPath);
        return resolve(downloadFile(res.headers.location, outputPath, win));
      }

      if (res.statusCode !== 200) {
        file.close();
        safeUnlink(outputPath);
        return reject(new Error(`HTTP статус ${res.statusCode}`));
      }

      total = parseInt(res.headers["content-length"], 10) || 0;
      if (!total) console.warn("⚠️ Нет content-length — прогресс неточен");

      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = Math.floor((downloaded / total) * 100);
          win.webContents.send("update:progress", pct);
          console.log(`📦 Загрузка: ${pct}%`);
        }
      });

      res.pipe(file);
    });

    request.on("error", (err) => {
      file.close();
      safeUnlink(outputPath);
      reject(err);
    });

    file.on("error", (err) => {
      file.close();
      safeUnlink(outputPath);
      reject(err);
    });

    file.on("finish", () => {
      file.close(() => {
        fs.stat(outputPath, (err, stats) => {
          if (err || stats.size < 100000) {
            safeUnlink(outputPath);
            return reject(new Error("Файл слишком мал или не найден"));
          }
          console.log("✅ Файл загружен:", outputPath);
          win.webContents.send("update:downloaded", outputPath);
          resolve();
        });
      });
    });
  });
}

// таймаут-обёртка для загрузки
function downloadWithTimeout(url, outputPath, win, timeoutMs = 120000) {
  return Promise.race([
    downloadFile(url, outputPath, win),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout: более ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

// retry с экспоненциальным бэкоффом
async function downloadWithRetry(url, outputPath, win, attempts = 3) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < attempts; i++) {
    try {
      await downloadWithTimeout(url, outputPath, win);
      return;
    } catch (err) {
      console.warn(`❗ Попытка ${i + 1} провалена: ${err.message}`);
      safeUnlink(outputPath);
      if (i < attempts - 1) {
        const backoff = Math.pow(2, i) * 1000;
        console.log(`⏱ Ждём ${backoff}ms перед новой попыткой`);
        await delay(backoff);
      } else {
        win.webContents.send("update:error", err.message);
        throw err;
      }
    }
  }
}

function setupAutoUpdater(win) {
  console.log("🛠 setupAutoUpdater инициализирован");
  let updateInfo = null;

  // 1) Проверка обновлений (без автозагрузки)
  ipcMain.on("update:check", async () => {
    try {
      console.log("📡 [MAIN] update:check received");
      const result = await autoUpdater.checkForUpdates();
      updateInfo = result.updateInfo;
      console.log("🔍 [MAIN] updateInfo:", updateInfo);
      win.webContents.send("update:available", {
        ...updateInfo,
        platform: process.platform,
      });
    } catch (err) {
      console.error("❌ [MAIN] checkForUpdates error:", err.message);
      win.webContents.send("update:error", err.message);
    }
  });

  // 2) Ручная загрузка по кнопке
  ipcMain.on("update:download", async (_evt, info) => {
    if (info) updateInfo = info;

    const platform = process.platform; // 'darwin' | 'win32' | 'linux'
    // выбираем файл по расширению
    const extMap = { darwin: ".dmg", win32: ".exe", linux: ".AppImage" };
    const targetExt = extMap[platform] || path.extname(updateInfo.files[0].url);
    let rawUrl = updateInfo.files.find((f) => f.url.endsWith(targetExt)).url;

    // делаем абсолютный URL
    if (!/^https?:\/\//.test(rawUrl)) {
      rawUrl = `https://github.com/wolk8506/genealogy/releases/download/${updateInfo.version}/${rawUrl}`;
    }
    console.log("🔗 final download URL:", rawUrl);

    const downloadDir = path.join(app.getPath("downloads"), "GenealogyUpdater");
    fs.mkdirSync(downloadDir, { recursive: true });

    const outputPath = path.join(
      downloadDir,
      `Genealogy-${updateInfo.version}${targetExt}`
    );
    console.log("📥 скачиваем в:", outputPath);

    try {
      await downloadWithRetry(rawUrl, outputPath, win);
    } catch (err) {
      console.error(
        "❌ downloadWithRetry окончательно провалился:",
        err.message
      );
    }
  });

  // 3) Установка (открыть инсталлятор)
  ipcMain.on("update:install", (_evt, filePath) => {
    shell.openPath(filePath);
  });

  // 4) Очистка старых загрузок
  const tempDir = path.join(app.getPath("downloads"), "GenealogyUpdater");
  fs.rm(tempDir, { recursive: true, force: true }, (err) => {
    if (err) console.warn("⚠️ не удалось очистить:", err.message);
    else console.log("🧼 старые загрузки удалены");
  });
}

module.exports = { setupAutoUpdater };
