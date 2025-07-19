export const exportPeopleToZip = async ({
  people,
  onProgress = () => {},
  onStatus = () => {},
  onError = () => {},
}) => {
  try {
    onStatus("Подготовка архива...");
    const total = people.length;
    const archiveFiles = [];

    const tempDir = await window.pathAPI.getTempDir(); // например: "C:/Users/Yura/Documents/Genealogy/temp"
    await window.fileAPI.ensureDir(tempDir);

    const jsonPath = `${tempDir}/genealogy-data.json`;
    await window.fileAPI.writeText(
      jsonPath,
      JSON.stringify({ people }, null, 2)
    );
    archiveFiles.push(jsonPath);

    for (let i = 0; i < total; i++) {
      const person = people[i];
      const personPath = `${tempDir}/people/${person.id}`;
      await window.fileAPI.ensureDir(personPath);
      let hasContent = false;

      // 🧑‍🦱 Аватар
      try {
        const avatarPath = await window.avatarAPI.getPath(person.id);
        const res = await fetch(avatarPath);
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size >= 1024) {
            const dest = `${personPath}/avatar.jpg`;
            await window.fileAPI.writeBlob(dest, blob);
            archiveFiles.push(dest);
            hasContent = true;
          }
        }
      } catch {}

      // 📄 Биография и изображения
      try {
        const bioText = await window.bioAPI.read(person.id);
        if (bioText) {
          const bioPath = `${personPath}/bio.md`;
          await window.fileAPI.writeText(bioPath, bioText);
          archiveFiles.push(bioPath);
          hasContent = true;

          const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
          const imagePaths = imageMatches.map((m) => m[1]);

          for (const relPath of imagePaths) {
            try {
              const blob = await window.bioAPI.readImage(person.id, relPath);
              const imageDest = `${personPath}/${relPath}`;
              await window.fileAPI.writeBlob(imageDest, blob);
              archiveFiles.push(imageDest);
              hasContent = true;
            } catch {}
          }
        }
      } catch {}

      // 📸 Фото
      try {
        const photos = await window.photosAPI.getByOwner(person.id);
        if (photos.length) {
          const photoJsonPath = `${personPath}/photos.json`;
          await window.fileAPI.writeText(
            photoJsonPath,
            JSON.stringify(photos, null, 2)
          );
          archiveFiles.push(photoJsonPath);
          hasContent = true;

          const photoDir = `${personPath}/photos`;
          await window.fileAPI.ensureDir(photoDir);

          for (const photo of photos) {
            try {
              const photoPath = await window.photosAPI.getPath(photo.id);
              const ext = photoPath.split(".").pop().split("?")[0];
              const res = await fetch(photoPath);
              if (!res.ok) continue;

              const blob = await res.blob();
              const filename = photo.filename || `${photo.id}.${ext}`;
              const destPath = `${photoDir}/${filename}`;
              await window.fileAPI.writeBlob(destPath, blob);
              archiveFiles.push(destPath);
              hasContent = true;
            } catch {}
          }
        }
      } catch {}

      onProgress(Math.round(((i + 1) / total) * 100));
    }

    onProgress(100);
    onStatus("Создание архива...");

    const savePath = await window.dialogAPI.chooseSavePath(
      `Genealogy_export_${Date.now()}.zip`
    );
    if (!savePath) {
      await window.fileAPI.delete(tempDir); // 🧹 убираем временную папку
      throw new Error("Сохранение отменено пользователем");
    }

    const archivePath = await window.archiveAPI.create(archiveFiles, savePath);
    await window.fileAPI.delete(tempDir);

    console.log("📦 Архив сохранён по пути:", archivePath);
    onStatus("✅ Архив сохранён");
    return archivePath;
  } catch (err) {
    console.error("❌ Ошибка:", err);
    onError(`Ошибка: ${err.message}`);
    return null;
  }
};
