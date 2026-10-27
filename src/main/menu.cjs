const { app, BrowserWindow, shell } = require("electron");
const { getMainWindow } = require("./mainWindow.cjs");

function buildMenuTemplate() {
  const isMac = process.platform === "darwin";
  return [
    // ─ macOS App Menu ────────────────
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "О Приложении" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: `Скрыть ${app.name}` },
              { role: "quit", label: "Выход" },
            ],
          },
        ]
      : []),

    // ─ File ───────────────────────────
    {
      label: "Файл",
      submenu: isMac
        ? [{ role: "close", label: "Закрыть окно" }]
        : [{ role: "quit", label: "Выход" }],
    },

    // ─ Edit ───────────────────────────
    {
      label: "Правка",
      submenu: [
        { role: "undo", label: "Отменить" },
        { role: "redo", label: "Повторить" },
        { type: "separator" },
        { role: "cut", label: "Вырезать" },
        { role: "copy", label: "Копировать" },
        { role: "paste", label: "Вставить" },
        { type: "separator" },
        {
          label: "Добавить человека",
          click: () => {
            const win = getMainWindow();
            win.webContents.send("navigate", "/?action=add");
          },
        },
        {
          label: "Добавить фотографию",
          click: () => {
            const win = getMainWindow();
            win.webContents.send("navigate", "/globalPhotoGallery?action=add");
          },
        },

        // {
        //   label: "Восстановление архива",
        //   click: () => {
        //     const win = getMainWindow();
        //     win.webContents.send("menu:import-archive");
        //   },
        // },
      ],
    },

    // ─ View ───────────────────────────
    {
      label: "Вид",
      submenu: [
        { role: "reload", label: "Перезагрузить" },
        { role: "toggleDevTools", label: "Инструменты разработчика" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Полноэкранный режим" },
      ],
    },

    // ─ Help ───────────────────────────
    {
      role: "help",
      label: "Помощь",
      submenu: [
        // About для Windows/Linux
        // ...(!isMac
        //   ? [
        //       {
        //         label: "О Приложении",
        //         click: () =>
        //           getMainWindow().webContents.send(
        //             "app:open-about"
        //           ),
        //       },
        //       { type: "separator" },
        //     ]
        //   : []),
        // {
        //   label: "Сайт проекта",
        //   click: () =>
        //     shell.openExternal("https://github.com/ваш-репозиторий"),
        // },
        {
          label: "О приложении",
          click: () => {
            const win = getMainWindow();
            win.webContents.send("navigate", "/about");
          },
        },
        {
          label: "Лицензия",
          click: () => {
            const win = getMainWindow();
            win.webContents.send("open-license-modal");
          },
        },
        {
          label: "История версий",
          click: () => {
            const win = getMainWindow();
            win?.webContents.send("open-changelog-modal");
          },
        },
        {
          label: "Руководство пользователя",
          accelerator: "Shift+CmdOrCtrl+/",
          click: () => require("./helpWindow.cjs").openHelpWindow(),
        },
        {
          label: "Проверить обновления",
          click: () => {
            const win = getMainWindow();
            win.webContents.send("check-for-updates");
          },
        },
      ],
    },
  ];
}

module.exports = { buildMenuTemplate };
