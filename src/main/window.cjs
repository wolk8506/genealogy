// src/main/window.cjs
const { BrowserWindow, Menu, ipcMain, nativeTheme, session } =
  require("electron");
const path = require("path");
const log = require("./logger.cjs").createLogger("window");
const isDev = process.env.NODE_ENV === "development";

// Разрешаем запросы геолокации из рендерера (локатор «Моё местоположение»).
session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
  callback(permission === "geolocation");
});

// На Windows/Linux языки проверки задаются явно, иначе русские слова
// остаются без вариантов замены. На macOS язык выбирает сама система.
if (process.platform !== "darwin") {
  session.defaultSession.setSpellCheckerLanguages(["ru", "en-US"]);
}

// Проверка платформы
const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";
const { setMainWindow, getMainWindow } = require("./mainWindow.cjs");

// Высота стеклянного хедера в рендерере; нативная полоса вместо него.
const CAPTION_HEIGHT = 50;

// На Windows кнопки окна лежат поверх нашего хедера (Window Controls Overlay),
// поэтому фон полосы прозрачный, а значки красятся в цвет текста темы.
const captionOverlay = (isDark) => ({
  color: "#00000000",
  symbolColor: isDark ? "#e6e6eb" : "#1d1d1f",
  height: CAPTION_HEIGHT,
});

// Самостоятельная тема приложения живёт в рендерере — renderer сообщает её сюда.
ipcMain.on("window:set-caption-theme", (_event, isDark) => {
  if (!isWin) return;
  const win = getMainWindow();
  if (!win) return;
  win.setTitleBarOverlay(captionOverlay(Boolean(isDark)));
});

// Меню приложения по Alt. Пока полоса заголовка скрыта, Electron не создаёт
// нативную полосу меню (окно считается безрамочным), поэтому Alt рисует те же
// пункты обычным всплывающим меню под хедером.
ipcMain.on("window:show-menu", () => {
  if (!isWin) return;
  const win = getMainWindow();
  if (!win) return;
  const { buildMenuTemplate } = require("./menu.cjs");
  Menu.buildFromTemplate(buildMenuTemplate()).popup({
    window: win,
    x: 12,
    y: CAPTION_HEIGHT,
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1430,
    height: 700,
    minWidth: 1430, // минимальная ширина
    minHeight: 700, // минимальная высота
    resizable: true, // окно остаётся изменяемым, но не меньше min*
    // Нативной полосы заголовка нет ни на macOS, ни на Windows: её роль
    // играет стеклянный хедер приложения. Кнопки окна возвращаем поверх
    // веб-контента через titleBarOverlay.
    titleBarStyle: isMac || isWin ? "hidden" : "default",

    titleBarOverlay: isWin
      ? captionOverlay(nativeTheme.shouldUseDarkColors)
      : {
          height: CAPTION_HEIGHT, // Увеличьте это число, чтобы "опустить" кнопки визуально ниже
        },

    backgroundColor: "#05070d",

    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      //   webSecurity: false, // ← подумать о безопасной замене
      webSecurity: !isDev, // ✅ true в продакшене, false только в dev
    },
  });

  // Подсказки орфографии. Проверку выполняет системный спеллчекер
  // (в редакторе биографии включён contenteditable), а варианты замены
  // показываем в нативном контекстном меню.
  win.webContents.on("context-menu", (_event, params) => {
    const word = (params.misspelledWord || "").trim();
    if (!word || !params.isEditable) return;

    const suggestions = (params.dictionarySuggestions || []).slice(0, 6);
    log.debug(`Орфография: «${word}», вариантов: ${suggestions.length}`);
    const template = suggestions.length
      ? suggestions.map((suggestion) => ({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion),
        }))
      : [
          { label: "Нет вариантов", enabled: false },
          // На macOS при «Правописании: автоматически по языку» Electron
          // не получает подсказки — подсказываем, где включить язык явно.
          ...(process.platform === "darwin"
            ? [
                {
                  label: "Включите «Русский» в Правописании macOS",
                  enabled: false,
                },
              ]
            : []),
        ];

    template.push(
      { type: "separator" },
      {
        label: `Добавить «${word}» в словарь`,
        click: () =>
          win.webContents.session.addWordToSpellCheckerDictionary(word),
      },
    );

    Menu.buildFromTemplate(template).popup({ window: win });
  });

  // --- ДОБАВЛЯЕМ СЛУШАТЕЛИ СОСТОЯНИЯ ОКНА ЗДЕСЬ ---

  // win.on("maximize", () => {
  //   win.webContents.send("window-state-change", true);
  // });

  // win.on("unmaximize", () => {
  //   win.webContents.send("window-state-change", false);
  // });

  // Для macOS (Fullscreen)
  win.on("enter-full-screen", () => {
    win.webContents.send("window-state-change", true);
  });

  win.on("leave-full-screen", () => {
    win.webContents.send("window-state-change", false);
  });

  // win.webContents.on("did-finish-load", () => {
  //   win.webContents.send("window-state-change", win.isMaximized());
  // });

  // --- КОНЕЦ БЛОКА СЛУШАТЕЛЕЙ ---

  // Диагностика падений рендерера. Без этих обработчиков при крахе
  // рендерера окно просто становится пустым, а main-процесс продолжает
  // жить — снаружи это выглядит как «зависшее» приложение.
  let crashReloads = 0;
  let responsiveTimer = null;

  win.webContents.on("render-process-gone", (_event, details) => {
    log.error(
      `Рендерер завершился: reason=${details.reason} exitCode=${details.exitCode}`,
    );
    if (details.reason === "clean-exit") return;
    if (win.isDestroyed()) return;
    if (crashReloads >= 2) {
      log.error("Рендерер падает повторно — автоперезагрузка остановлена");
      return;
    }
    crashReloads += 1;
    setTimeout(() => {
      if (win.isDestroyed()) return;
      log.warn(`Перезагружаю окно после падения рендерера (#${crashReloads})`);
      win.webContents.reload();
    }, 300);
  });

  win.webContents.on("unresponsive", () => {
    log.warn("Окно не отвечает");
    // Если рендерер завис навсегда, перезагружаем его, чтобы не оставлять
    // пользователя с мёртвым окном. Даём 15 секунд на восстановление.
    if (responsiveTimer) clearTimeout(responsiveTimer);
    responsiveTimer = setTimeout(() => {
      if (win.isDestroyed()) return;
      log.warn("Окно не отвечает 15 секунд — перезагружаю");
      win.webContents.reload();
    }, 15000);
  });

  win.webContents.on("responsive", () => {
    log.info("Окно снова отвечает");
    if (responsiveTimer) {
      clearTimeout(responsiveTimer);
      responsiveTimer = null;
    }
  });

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    log.error(`Не удалось загрузить страницу ${url}: ${code} ${description}`);
  });

  setMainWindow(win);
  win.on("closed", () => require("./helpWindow.cjs").closeHelpWindow());

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  return win;
}

module.exports = { createWindow };
