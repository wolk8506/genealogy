const { app, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const sizeOfModule = require("image-size");
const sizeOf = sizeOfModule.default || sizeOfModule;

function buildPhotoMenu(photo, wc, options = {}) {
  const {
    includeEdit = true,
    includeInfo = true,
    includeDelete = true,
    includeDownload = true,
    personId = null,
  } = options;
  console.log("options", options);
  const tpl = [];

  const { dialog } = require("electron");
  const path = require("path");
  const fs = require("fs");

  // ... внутри buildPhotoMenu ...

  if (includeDownload) {
    tpl.push({
      label: "⬇️ Скачать",
      click: async (menuItem, browserWindow) => {
        const path = require("path");
        const fs = require("fs");
        const { dialog, app } = require("electron");

        // 1. Базовый путь к папке с фото конкретного человека
        const baseDir = path.join(
          app.getPath("documents"),
          "Genealogy",
          "people",
          String(photo.owner),
          "photos",
        );

        // 2. Список путей в порядке приоритета (Оригинал -> Обычный -> WebP)
        const candidatePaths = [
          path.join(baseDir, "original", photo.filename),
          path.join(baseDir, photo.filename),
          path.join(
            baseDir,
            "webp",
            photo.filename.replace(/\.[^.]+$/, ".webp"),
          ),
        ];

        // Находим первый реально существующий файл
        const existingFilePath = candidatePaths.find((p) => fs.existsSync(p));

        if (!existingFilePath) {
          browserWindow.webContents.executeJavaScript(
            `alert('Файл не найден на диске')`,
          );
          return;
        }

        // 3. Открываем диалог сохранения
        const { filePath: savePath } = await dialog.showSaveDialog(
          browserWindow,
          {
            title: "Сохранить изображение",
            defaultPath: photo.filename,
            buttonLabel: "Сохранить",
          },
        );

        // 4. Копируем, если пользователь выбрал путь
        if (savePath) {
          try {
            fs.copyFileSync(existingFilePath, savePath);
            console.log("Успешно сохранено из:", existingFilePath);
          } catch (err) {
            console.error("Ошибка копирования:", err);
          }
        }
      },
    });
  }

  if (includeEdit) {
    tpl.push({
      label: "✏️ Редактировать",
      click: () => wc.send("photo:open", photo),
    });
  }

  if (includeInfo) {
    tpl.push({
      label: "ℹ️ Информация",
      click: async () => {
        const baseDir = path.join(
          app.getPath("documents"),
          "Genealogy",
          "people",
          String(photo.owner),
          "photos",
        );

        const webpBase =
          photo.webpName || photo.filename.replace(/\.[^.]+$/, ".webp");

        const checkList = [
          {
            id: "orig",
            label: "Оригинал",
            sub: "original",
            name: photo.filename,
          },
          { id: "webp", label: "WebP (Экран)", sub: "webp", name: webpBase },
          {
            id: "thumb",
            label: "Превью (Thumbs)",
            sub: "thumbs",
            name: webpBase,
          },
          {
            id: "legacy",
            label: "Legacy (Корень)",
            sub: "",
            name: photo.filename,
          },
        ];

        const details = [];

        for (const item of checkList) {
          const fullPath = path.join(baseDir, item.sub, item.name);

          if (fs.existsSync(fullPath)) {
            try {
              const stats = fs.statSync(fullPath);
              const buffer = fs.readFileSync(fullPath); // Читаем в буфер, как в вашем примере
              const dimensions = sizeOf(buffer);

              // 🏷️ ТЕГ КАЧЕСТВА:
              // Если это WebP/Thumb и у нас есть данные о качестве в объекте photo
              let qualitySuffix = "";
              if (
                (item.id === "webp" || item.id === "thumb") &&
                photo.quality
              ) {
                qualitySuffix = ` [Q:${photo.quality}%]`;
              }

              details.push({
                type: item.label + qualitySuffix,
                exists: true,
                size: (stats.size / 1024).toFixed(1) + " KB",
                res: `${dimensions.width}x${dimensions.height}`,
                date: stats.birthtime.toLocaleString(),
                fullPath: fullPath, // Полный путь для фронтенда
                name: item.name,
              });
            } catch (err) {
              console.error(
                `Ошибка метаданных для ${item.label}:`,
                err.message,
              );
            }
          } else if (item.id !== "legacy") {
            // Не добавляем legacy, если его нет, чтобы не захламлять список
            details.push({
              type: item.label,
              exists: false,
              name: "Файл не найден",
            });
          }
        }

        wc.send("photo:meta-response", {
          id: photo.id,
          filename: photo.filename,
          details: details,
        });
      },
    });
  }

  if (includeDelete && photo.owner === personId) {
    tpl.push(
      { type: "separator" },
      {
        label: "🗑️ Удалить",
        click: () => wc.send("photo:delete", photo.id),
      },
    );
  } else if (includeDelete && "onVisible" === personId) {
    tpl.push(
      { type: "separator" },
      {
        label: "🗑️ Удалить",
        click: () => wc.send("photo:delete", photo),
      },
    );
  }

  return tpl;
}

ipcMain.on(
  "context:photo-menu",
  (event, photo, position, menuType = "full", personId = null) => {
    const wc = event.sender;

    const options =
      menuType === "lite"
        ? {
            includeEdit: true,
            includeDelete: true,
            includeInfo: true,
            includeDownload: true,
            personId: "onVisible",
          }
        : {
            includeEdit: true,
            includeDelete: true,
            includeInfo: true,
            includeDownload: true,
            personId,
          };

    const menu = Menu.buildFromTemplate(buildPhotoMenu(photo, wc, options));
    menu.popup({ x: position.x, y: position.y });
  },
);
