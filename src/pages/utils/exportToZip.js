// exportToZip.js
export const exportPeopleToZip = async ({
  people,
  defaultFilename = `Genealogy_export_${Date.now()}.zip`,
  onProgress = () => {},
  onStatus = () => {},
  onError = () => {},
}) => {
  // helper: call onProgress in backward-compatible way
  const emitProgress = (payload) => {
    try {
      if (
        payload &&
        typeof payload === "object" &&
        typeof payload.percent === "number"
      ) {
        payload.percent = Math.max(
          0,
          Math.min(100, Math.round(payload.percent))
        );
      }
      onProgress(payload);
    } catch (e) {
      // fallback: если onProgress не умеет принимать объект, попробуем передать число
      if (
        payload &&
        typeof payload === "object" &&
        typeof payload.percent === "number"
      ) {
        try {
          onProgress(payload.percent);
        } catch (err) {
          /* swallow */
        }
      }
    }
  };

  try {
    console.log(
      "[exportToZip] start export, people length:",
      Array.isArray(people) ? people.length : 0
    );
    onStatus("Подготовка архива...");
    emitProgress({
      phase: "preparation",
      percent: 0,
      message: "Старт подготовки",
      totalPeople: Array.isArray(people) ? people.length : 0,
    });

    const total = Array.isArray(people) ? people.length : 0;
    const archiveFiles = [];

    const tempDir = await window.pathAPI.getTempDir();
    console.log("[exportToZip] tempDir:", tempDir);
    await window.fileAPI.ensureDir(tempDir);

    // Save main JSON
    const jsonPath = `${tempDir}/genealogy-data.json`;
    await window.fileAPI.writeText(
      jsonPath,
      JSON.stringify({ people }, null, 2)
    );
    archiveFiles.push(jsonPath);

    // Config
    const PROGRESS_EVERY = 1; // update after each person
    const YIELD_EVERY = 20; // yield to event loop every N persons

    // Counters for detailed progress
    let totalFilesSoFar = archiveFiles.length; // starts with JSON
    let filesAddedThisPerson = 0;

    // New counters for file-based progress
    let totalFilesEstimated = 0;
    let processedFilesCount = 0;

    // PRESCAN: подсчёт общего числа файлов (по количеству, без попыток узнать размеры)
    try {
      for (let i = 0; i < total; i++) {
        const person = people[i];
        const personId = person?.id ?? `idx_${i}`;

        // avatar
        try {
          const avatarPath = await window.avatarAPI.getPath(personId);
          if (avatarPath) totalFilesEstimated += 1;
        } catch (e) {
          // ignore
        }

        // bio + inline images
        try {
          const bioText = await window.bioAPI.read(personId);
          if (bioText) {
            totalFilesEstimated += 1; // bio.md
            const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
            totalFilesEstimated += imageMatches.length;
          }
        } catch (e) {
          // ignore
        }

        // photos.json + photos
        try {
          const photos = await window.photosAPI.getByOwner(personId);
          if (Array.isArray(photos) && photos.length) {
            totalFilesEstimated += 1; // photos.json
            totalFilesEstimated += photos.length; // each photo file
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      console.warn("[exportToZip] prescan error", e?.message || e);
      // if prescan fails, fallback to at least counting people (so percent by people will work)
      if (!totalFilesEstimated) totalFilesEstimated = total;
    }

    // Ensure at least 1 to avoid division by zero
    if (!totalFilesEstimated || totalFilesEstimated <= 0)
      totalFilesEstimated = Math.max(1, total);

    // initial progress with estimated totals
    emitProgress({
      phase: "preparation",
      percent: 0,
      totalFiles: totalFilesEstimated,
      processedFiles: 0,
      message: `Подготовка: оценочно ${totalFilesEstimated} файлов`,
      totalPeople: total,
    });

    // MAIN PREPARATION LOOP
    for (let i = 0; i < total; i++) {
      const person = people[i];
      const personId = person?.id ?? `idx_${i}`;
      const personPath = `${tempDir}/people/${personId}`;
      await window.fileAPI.ensureDir(personPath);
      filesAddedThisPerson = 0;

      // Emit start of person
      emitProgress({
        phase: "preparation",
        percent: Math.round((i / Math.max(1, total)) * 100),
        personIndex: i,
        personId,
        personStep: "start",
        filesAddedForPerson: 0,
        totalFilesSoFar,
        currentFile: null,
        message: `Начинаем подготовку данных для ${personId}`,
        totalPeople: total,
        totalFiles: totalFilesEstimated,
        processedFiles: processedFilesCount,
      });

      // --- Avatar ---
      try {
        const avatarPath = await window.avatarAPI.getPath(personId);
        if (avatarPath) {
          const res = await fetch(avatarPath);
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size >= 1024) {
              const dest = `${personPath}/avatar.jpg`;
              await window.fileAPI.writeBlob(dest, blob);
              archiveFiles.push(dest);
              filesAddedThisPerson++;
              totalFilesSoFar++;

              // update processed files
              processedFilesCount++;

              // compute percent by files
              const pct = Math.round(
                (processedFilesCount / totalFilesEstimated) * 100
              );

              emitProgress({
                phase: "preparation",
                percent: pct,
                personIndex: i,
                personId,
                personStep: "avatar",
                filesAddedForPerson: filesAddedThisPerson,
                totalFilesSoFar,
                currentFile: dest,
                message: `Аватар сохранён для ${personId}`,
                totalPeople: total,
                totalFiles: totalFilesEstimated,
                processedFiles: processedFilesCount,
              });
            }
          }
        }
      } catch (e) {
        console.warn(
          "[exportToZip] avatar error for",
          personId,
          e?.message || e
        );
      }

      // --- Bio and inline images ---
      try {
        const bioText = await window.bioAPI.read(personId);
        if (bioText) {
          const bioPath = `${personPath}/bio.md`;
          await window.fileAPI.writeText(bioPath, bioText);
          archiveFiles.push(bioPath);
          filesAddedThisPerson++;
          totalFilesSoFar++;

          processedFilesCount++;
          const pctBio = Math.round(
            (processedFilesCount / totalFilesEstimated) * 100
          );

          emitProgress({
            phase: "preparation",
            percent: pctBio,
            personIndex: i,
            personId,
            personStep: "bio",
            filesAddedForPerson: filesAddedThisPerson,
            totalFilesSoFar,
            currentFile: bioPath,
            message: `Биография сохранена для ${personId}`,
            totalPeople: total,
            totalFiles: totalFilesEstimated,
            processedFiles: processedFilesCount,
          });

          const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
          const imagePaths = imageMatches.map((m) => m[1]);

          for (let j = 0; j < imagePaths.length; j++) {
            const relPath = imagePaths[j];
            try {
              const blob = await window.bioAPI.readImage(personId, relPath);
              const imageDest = `${personPath}/${relPath}`;
              const dir = imageDest.includes("/")
                ? imageDest.split("/").slice(0, -1).join("/")
                : ".";
              await window.fileAPI.ensureDir(dir);
              await window.fileAPI.writeBlob(imageDest, blob);
              archiveFiles.push(imageDest);
              filesAddedThisPerson++;
              totalFilesSoFar++;

              processedFilesCount++;
              const pctImg = Math.round(
                (processedFilesCount / totalFilesEstimated) * 100
              );

              emitProgress({
                phase: "preparation",
                percent: pctImg,
                personIndex: i,
                personId,
                personStep: "bio-image",
                filesAddedForPerson: filesAddedThisPerson,
                totalFilesSoFar,
                currentFile: imageDest,
                message: `Вложенное изображение ${j + 1}/${
                  imagePaths.length
                } для ${personId}`,
                totalPeople: total,
                totalFiles: totalFilesEstimated,
                processedFiles: processedFilesCount,
              });
            } catch (e) {
              console.warn(
                "[exportToZip] bio image error",
                personId,
                relPath,
                e?.message || e
              );
            }
          }
        }
      } catch (e) {
        console.warn(
          "[exportToZip] bio read error for",
          personId,
          e?.message || e
        );
      }

      // --- Photos (owner) ---
      try {
        const photos = await window.photosAPI.getByOwner(personId);
        if (Array.isArray(photos) && photos.length) {
          const photoJsonPath = `${personPath}/photos.json`;
          await window.fileAPI.writeText(
            photoJsonPath,
            JSON.stringify(photos, null, 2)
          );
          archiveFiles.push(photoJsonPath);
          filesAddedThisPerson++;
          totalFilesSoFar++;

          processedFilesCount++;
          const pctMeta = Math.round(
            (processedFilesCount / totalFilesEstimated) * 100
          );

          emitProgress({
            phase: "preparation",
            percent: pctMeta,
            personIndex: i,
            personId,
            personStep: "photos-meta",
            filesAddedForPerson: filesAddedThisPerson,
            totalFilesSoFar,
            currentFile: photoJsonPath,
            message: `Список фото сохранён для ${personId}`,
            totalPeople: total,
            totalFiles: totalFilesEstimated,
            processedFiles: processedFilesCount,
          });

          const photoDir = `${personPath}/photos`;
          await window.fileAPI.ensureDir(photoDir);

          for (let k = 0; k < photos.length; k++) {
            const photo = photos[k];
            try {
              const photoPath = await window.photosAPI.getPath(photo.id);
              if (!photoPath) continue;
              const ext = photoPath.split(".").pop().split("?")[0];
              const res = await fetch(photoPath);
              if (!res.ok) continue;
              const blob = await res.blob();
              const filename = photo.filename || `${photo.id}.${ext}`;
              const destPath = `${photoDir}/${filename}`;
              await window.fileAPI.writeBlob(destPath, blob);
              archiveFiles.push(destPath);
              filesAddedThisPerson++;
              totalFilesSoFar++;

              processedFilesCount++;
              const pctPhoto = Math.round(
                (processedFilesCount / totalFilesEstimated) * 100
              );

              emitProgress({
                phase: "preparation",
                percent: pctPhoto,
                personIndex: i,
                personId,
                personStep: "photo-file",
                filesAddedForPerson: filesAddedThisPerson,
                totalFilesSoFar,
                currentFile: destPath,
                message: `Файлов ${k + 1}/${
                  photos.length
                } для ${personId} — человек ${i + 1}/${total}`,
                totalPeople: total,
                totalFiles: totalFilesEstimated,
                processedFiles: processedFilesCount,
              });
            } catch (e) {
              console.warn(
                "[exportToZip] photo error",
                personId,
                photo?.id,
                e?.message || e
              );
            }
          }
        }
      } catch (e) {
        console.warn(
          "[exportToZip] photos read error for",
          personId,
          e?.message || e
        );
      }

      // Person finished
      const personPct = Math.max(
        0,
        Math.min(100, Math.round(((i + 1) / Math.max(1, total)) * 100))
      );

      // Emit per-person summary but keep percent based on files (do not change message)
      emitProgress({
        phase: "preparation",
        percent: Math.round((processedFilesCount / totalFilesEstimated) * 100),
        personIndex: i,
        personId,
        personStep: "done",
        filesAddedForPerson: filesAddedThisPerson,
        totalFilesSoFar,
        currentFile: null,
        message: "Подготовка завершена",
        totalPeople: total,
        totalFiles: totalFilesEstimated,
        processedFiles: processedFilesCount,
      });

      // periodic yield to allow UI update
      if ((i + 1) % YIELD_EVERY === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // occasional log
      if ((i + 1) % 50 === 0 || i === total - 1) {
        console.log("[exportToZip] preparation progress", {
          i: i + 1,
          total,
          pct: Math.round((processedFilesCount / totalFilesEstimated) * 100),
          totalFilesSoFar,
          processedFilesCount,
        });
      }
    }

    // finished preparation: final emit (percent by files)
    emitProgress({
      phase: "preparation",
      percent: Math.round((processedFilesCount / totalFilesEstimated) * 100),
      message: "Подготовка завершена",
      totalFilesSoFar,
      totalPeople: total,
      totalFiles: totalFilesEstimated,
      processedFiles: processedFilesCount,
    });

    // Ensure percent is consistent and not >100
    const finalPct = Math.max(
      0,
      Math.min(
        100,
        Math.round((processedFilesCount / totalFilesEstimated) * 100)
      )
    );

    // Сразу переключаемся на фазу записи и сбрасываем процент,
    // чтобы UI не показывал 100% до реального начала записи в main.
    onStatus("Создание архива...");
    emitProgress({
      phase: "writing",
      percent: 0,
      message: "Начало записи архива",
      totalFilesSoFar,
      totalPeople: total,
      totalFiles: totalFilesEstimated,
      processedFiles: processedFilesCount,
    });

    console.log(
      "[exportToZip] preparation finished, archiveFiles count:",
      archiveFiles.length
    );
    console.log(
      "[exportToZip] sample archiveFiles:",
      archiveFiles.slice(0, 20)
    );

    // choose save path
    const savePath = await window.dialogAPI.chooseSavePath(defaultFilename);
    console.log("[exportToZip] chooseSavePath result:", savePath);
    if (!savePath) {
      try {
        await window.fileAPI.delete(tempDir);
      } catch (e) {
        console.warn(
          "[exportToZip] cleanup tempDir after cancel failed",
          e?.message || e
        );
      }
      onStatus("Экспорт отменён");
      return null;
    }

    console.log("[exportToZip] calling archiveAPI.create with", {
      filesCount: archiveFiles.length,
      savePath,
    });

    // call main to create archive (main will emit writing progress)
    const archivePath = await window.archiveAPI.create(archiveFiles, savePath);
    console.log("[exportToZip] archiveAPI.create returned:", archivePath);

    if (!archivePath) {
      try {
        await window.fileAPI.delete(tempDir);
      } catch (e) {
        console.warn(
          "[exportToZip] cleanup tempDir after archive error failed",
          e?.message || e
        );
      }
      onError("Ошибка при создании архива");
      return null;
    }

    // cleanup temp
    try {
      await window.fileAPI.delete(tempDir);
    } catch (e) {
      console.warn("[exportToZip] cleanup tempDir failed", e?.message || e);
    }

    onStatus("✅ Архив сохранён");
    console.log(
      "[exportToZip] finished successfully, archivePath:",
      archivePath
    );
    return archivePath;
  } catch (err) {
    console.error("exportPeopleToZip error:", err);
    onError(`Ошибка: ${err?.message || String(err)}`);
    return null;
  }
};
