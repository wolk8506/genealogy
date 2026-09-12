const { ipcMain, app, shell, BrowserWindow } = require("electron");
const log = require("./logger.cjs").createLogger("autoUpdater");

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
      log.warn(`⚠️ Не удалось удалить файл ${filePath}:`, err.message);
    }
  });
}

// скачивает URL в outputPath, посылает прогресс в рендер, возвращает Promise
function downloadFile(url, outputPath, win) {
  return new Promise((resolve, reject) => {
    log.info("🔧 downloadFile вызван с URL:", url);
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
      if (!total) log.warn("⚠️ Нет content-length — прогресс неточен");

      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = Math.floor((downloaded / total) * 100);
          win.webContents.send("update:progress", pct);
          log.info(`📦 Загрузка: ${pct}%`);
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
          log.info("✅ Файл загружен:", outputPath);
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
      log.warn(`❗ Попытка ${i + 1} провалена: ${err.message}`);
      safeUnlink(outputPath);
      if (i < attempts - 1) {
        const backoff = Math.pow(2, i) * 1000;
        log.info(`⏱ Ждём ${backoff}ms перед новой попыткой`);
        await delay(backoff);
      } else {
        win.webContents.send("update:error", err.message);
        throw err;
      }
    }
  }
}

function setupAutoUpdater(win) {
  log.info("🛠 setupAutoUpdater инициализирован");
  let updateInfo = null;

  // 1) Проверка обновлений (без автозагрузки)
  ipcMain.on("update:check", async () => {
    try {
      log.info("📡 [MAIN] update:check received");
      const result = await autoUpdater.checkForUpdates();
      updateInfo = result.updateInfo;
      log.info("🔍 [MAIN] updateInfo:", updateInfo);
      win.webContents.send("update:available", {
        ...updateInfo,
        platform: process.platform,
      });
    } catch (err) {
      log.error("❌ [MAIN] checkForUpdates error:", err.message);
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
    log.info("🔗 final download URL:", rawUrl);

    const downloadDir = path.join(app.getPath("downloads"), "GenealogyUpdater");
    fs.mkdirSync(downloadDir, { recursive: true });

    const outputPath = path.join(
      downloadDir,
      `Genealogy-${updateInfo.version}${targetExt}`
    );
    log.info("📥 скачиваем в:", outputPath);

    try {
      await downloadWithRetry(rawUrl, outputPath, win);
    } catch (err) {
      log.error(
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
    if (err) log.warn("⚠️ не удалось очистить:", err.message);
    else log.info("🧼 старые загрузки удалены");
  });
}

ipcMain.on("trigger-update-check", () => {
  const win = BrowserWindow.getAllWindows()[0]; // Получаем активное окно

  autoUpdater.once("update-available", (info) => {
    win.webContents.send("update:manual-check-result", {
      status: "available",
      version: info.version,
    });
  });

  autoUpdater.once("update-not-available", () => {
    win.webContents.send("update:manual-check-result", {
      status: "up-to-date",
      version: app.getVersion(),
    });
  });

  autoUpdater.once("error", (err) => {
    win.webContents.send("update:manual-check-result", {
      status: "error",
      message: err.message,
    });
  });

  autoUpdater.checkForUpdates();
});

module.exports = { setupAutoUpdater };
