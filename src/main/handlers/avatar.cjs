const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");

ipcMain.handle("avatar:getPath", (event, personId) => {
  const dir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId)
  );
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const avatarFile = files.find((f) => f.startsWith("avatar"));
  console.log("🔍 avatar:getPath", personId, "→", avatarFile);

  if (avatarFile) {
    return `file://${path.join(dir, avatarFile)}`;
  } else {
    return null;
  }
});

ipcMain.handle("avatar:save", async (event, personId, buffer) => {
  const dir = path.join(
    app.getPath("documents"),
    "Genealogy",
    "people",
    String(personId)
  );
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const dest = path.join(dir, "avatar.jpg");
  fs.writeFileSync(dest, Buffer.from(buffer));
});

ipcMain.handle("avatar:delete", async (event, personId) => {
  try {
    const avatarPath = path.join(
      app.getPath("documents"),
      "Genealogy",
      "people",
      String(personId),
      "avatar.jpg"
    );

    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
      return { success: true };
    } else {
      return { success: false, message: "Файл не найден" };
    }
  } catch (err) {
    console.error(`❌ Ошибка при удалении аватара ${personId}:`, err);
    return { success: false, message: err.message };
  }
});
