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
  } else if (includeDelete && "onVisible" === personId) {
    tpl.push(
      { type: "separator" },
      {
        label: "🗑️ Удалить",
        click: () => wc.send("photo:delete", photo),
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
  }
);
