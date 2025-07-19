// const { app, Menu, ipcMain } = require("electron");
// const path = require("path");
// const fs = require("fs");
// const sizeOfModule = require("image-size");
// const sizeOf = sizeOfModule.default || sizeOfModule;

// ipcMain.on("context:photo-menu", (event, photo, position, personId) => {
//   const wc = event.sender;
//   const tpl = [
//     {
//       label: "⬇️ Скачать",
//       click: () => wc.send("photo:download", photo),
//     },
//     {
//       label: "✏️ Редактировать",
//       click: () => wc.send("photo:open", photo),
//     },
//     {
//       label: "ℹ️ Информация",
//       click: async () => {
//         console.log("MAIN: Info clicked → собираем мета");

//         // Собираем путь
//         const filePath = path.join(
//           process.env.HOME,
//           "Documents",
//           "Genealogy",
//           "people",
//           String(photo.owner),
//           "photos",
//           photo.filename
//         );
//         console.log("MAIN: filePath =", filePath);

//         // 1) Проверяем, найдётся ли файл
//         let stats;
//         try {
//           stats = await fs.promises.stat(filePath);
//           console.log("MAIN: fs.stat OK:", stats.size, "байт");
//         } catch (err) {
//           console.error("MAIN: fs.stat FAILED:", err);
//           return wc.send("photo:meta-response", { error: true });
//         }

//         // 2) Пробуем получить размеры в пикселях
//         let dimensions = { width: null, height: null };
//         try {
//           const buffer = await fs.promises.readFile(filePath);
//           dimensions = sizeOf(buffer);
//           console.log("MAIN: sizeOf OK:", dimensions);
//         } catch (err) {
//           console.error("MAIN: image-size FAILED:", err.message);
//         }

//         // 3) Формируем мета
//         const meta = {
//           filename: photo.filename,
//           path: filePath,
//           sizeKiB: (stats.size / 1024).toFixed(1) + " KiB",
//           sizeKB: (stats.size / 1000).toFixed(1) + " KB",
//           width: dimensions.width,
//           height: dimensions.height,
//           created: stats.birthtime.toLocaleString(),
//         };

//         wc.send("photo:meta-response", meta);
//         console.log("MAIN: отправили meta-response", meta);
//       },
//     },
//     // …другие пункты меню…
//     ...(photo.owner === personId
//       ? [
//           { type: "separator" },
//           {
//             label: "🗑️ Удалить",
//             click: () => wc.send("photo:delete", photo.id),
//           },
//         ]
//       : []),
//   ];

//   Menu.buildFromTemplate(tpl).popup({ x: position.x, y: position.y });
// });
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

  if (includeDownload) {
    tpl.push({
      label: "⬇️ Скачать",
      click: () => wc.send("photo:download", photo),
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
        const filePath = path.join(
          process.env.HOME,
          "Documents",
          "Genealogy",
          "people",
          String(photo.owner),
          "photos",
          photo.filename
        );

        let stats, buffer, dimensions;
        try {
          stats = await fs.promises.stat(filePath);
          buffer = await fs.promises.readFile(filePath);
          dimensions = sizeOf(buffer);
        } catch (err) {
          console.error("MAIN: meta error", err.message);
          wc.send("photo:meta-response", { error: true });
          return;
        }

        const meta = {
          filename: photo.filename,
          path: filePath,
          sizeKiB: (stats.size / 1024).toFixed(1) + " KiB",
          sizeKB: (stats.size / 1000).toFixed(1) + " KB",
          width: dimensions.width,
          height: dimensions.height,
          created: stats.birthtime.toLocaleString(),
        };

        wc.send("photo:meta-response", meta);
      },
    });
  }

  if (includeDelete && photo.owner === personId) {
    tpl.push(
      { type: "separator" },
      {
        label: "🗑️ Удалить",
        click: () => wc.send("photo:delete", photo.id),
      }
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
            includeEdit: false,
            includeDelete: false,
            includeInfo: true,
            includeDownload: true,
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
  }
);
