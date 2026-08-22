// exportToZip.js
export const exportPeopleToZip = async ({
  people,
  defaultFilename = `Genealogy_export_${Date.now()}.zip`,
  onProgress = () => {},
  onStatus = () => {},
  onError = () => {},
  archiveName = null,
  selectedPhotoFolders = ["webp"],
  runMaintenanceBeforeExport = false,
}) => {
  const emitProgress = (payload) => {
    try {
      if (
        payload &&
        typeof payload === "object" &&
        typeof payload.percent === "number"
      ) {
        payload.percent = Math.max(
          0,
          Math.min(100, Math.round(payload.percent)),
        );
      }
      onProgress(payload);
    } catch (e) {}
  };

  try {
    const photoFolders = Array.from(
      new Set((selectedPhotoFolders || []).filter(Boolean)),
    );
    if (!photoFolders.includes("original") && !photoFolders.includes("webp")) {
      throw new Error("Выберите original или webp для архивации фото");
    }

    // 1. ПЕРВЫМ ДЕЛОМ открываем диалог (пока прогресс еще 0%)
    onStatus("Выбор места сохранения...");
    const savePath = await window.dialogAPI.chooseSavePath(defaultFilename);

    // Если пользователь нажал "Отмена", выходим сразу, не нагружая систему
    if (!savePath) {
      onStatus("Экспорт отменён");
      return null;
    }

    if (runMaintenanceBeforeExport && window.appAPI?.runMaintenanceTask) {
      onStatus("Обслуживание базы данных...");
      await window.appAPI.runMaintenanceTask("sqlite-vacuum-analyze");
    }
    // 1. ОПРЕДЕЛЕНИЕ basePath
    let basePath = "";
    let samplePath = null;
    for (const p of people) {
      const photos = await window.photosAPI.getByOwner(p.id);
      if (photos && photos.length > 0) {
        samplePath = await window.photosAPI.getPath(photos[0].id);
        if (samplePath) break;
      }
      samplePath = await window.avatarAPI.getPath(p.id);
      if (samplePath) break;
    }
    if (!samplePath) samplePath = await window.avatarAPI.getPath("any");
    // Если прямого пути нет, ищем через первый доступный файл
    if (!basePath) {
      let samplePath = null;
      for (const p of people) {
        const photos = await window.photosAPI.getByOwner(p.id);
        if (photos?.length > 0) {
          samplePath = await window.photosAPI.getPath(photos[0].id);
          if (samplePath) break;
        }
        samplePath = await window.avatarAPI.getPath(p.id);
        if (samplePath) break;
      }

      // Если даже так не нашли (у людей нет фото), пробуем получить путь к "любому" аватару
      if (!samplePath) samplePath = await window.avatarAPI.getPath("any");

      if (samplePath) {
        const peopleMarker = "/people/";
        const markerIndex = samplePath.indexOf(peopleMarker);
        if (markerIndex !== -1) {
          basePath = samplePath.substring(
            0,
            markerIndex + peopleMarker.length - 1,
          );
        }
      }
    }

    const peopleMarker = "/people/";
    const markerIndex = samplePath.indexOf(peopleMarker);
    if (markerIndex === -1)
      throw new Error("Некорректный формат пути: " + samplePath);

    // Очищаем путь от file:// и лишних символов для Node.js
    basePath = samplePath
      .substring(0, markerIndex + peopleMarker.length - 1)
      .replace(/^file:\/\//, "")
      .replace(/%20/g, " ");

    // basePath указывает на .../Genealogy/people, а база лежит в .../Genealogy
    const genealogyRootPath = basePath.endsWith("/people")
      ? basePath.slice(0, -"/people".length)
      : basePath;

    console.log("[exportToZip] Clean basePath for Node.js:", basePath);
    console.log("[exportToZip] Genealogy root path:", genealogyRootPath);

    onStatus("Подготовка архива...");
    const total = Array.isArray(people) ? people.length : 0;
    const archiveFiles = [];
    const tempDir = await window.pathAPI.getTempDir();
    await window.fileAPI.ensureDir(tempDir);

    const createdAt = new Date().toISOString();
    const resolvedArchiveName = archiveName || defaultFilename.replace(/\.zip$/i, "");

    // Сохраняем паспорт архива и главный JSON
    const manifestPath = `${tempDir}/manifest.json`;
    await window.fileAPI.writeText(
      manifestPath,
      JSON.stringify(
        {
          appIdentifier: "MY_GENEALOGY_APP",
          archiveName: resolvedArchiveName,
          createdAt,
          selectedPhotoFolders: photoFolders,
          photoFolders,
          kind: "genealogy-archive",
          version: 1,
        },
        null,
        2,
      ),
    );
    archiveFiles.push(manifestPath);

    const jsonPath = `${tempDir}/genealogy-data.json`;
    await window.fileAPI.writeText(
      jsonPath,
      JSON.stringify(
        {
          appIdentifier: "MY_GENEALOGY_APP",
          archiveName: resolvedArchiveName,
          exportedAt: createdAt,
          selectedPhotoFolders: photoFolders,
          photoFolders,
          people,
        },
        null,
        2,
      ),
    );

    archiveFiles.push(jsonPath);

    const databaseFiles = [
      "genealogy.sqlite",
      "genealogy.sqlite-wal",
      "genealogy.sqlite-shm",
    ];
    for (const fileName of databaseFiles) {
      try {
        const srcPath = `${genealogyRootPath}/${fileName}`
          .replace(/\\/g, "/")
          .replace(/\/+/g, "/");
        const destPath = `${tempDir}/${fileName}`;
        const res = await window.fileAPI.copyFile(srcPath, destPath);
        if (res && res.success !== false) {
          archiveFiles.push(destPath);
        }
      } catch (error) {
        console.warn(
          `[exportToZip] Не удалось добавить файл базы ${fileName}:`,
          error,
        );
      }
    }

    let processedFilesCount = 0;

    onStatus("Подсчет файлов...");
    let totalFilesEstimated = 1 + databaseFiles.length; // genealogy-data.json + база

    // for (const p of people) {
    //   // 1. Проверяем аватар так же, как в цикле копирования
    //   const avatarPath = await window.avatarAPI.getPath(p.id);
    //   if (avatarPath) totalFilesEstimated += 1;

    //   // 2. Биография и картинки внутри неё
    //   const bioText = await window.bioAPI.load(p.id);
    //   if (bioText) {
    //     totalFilesEstimated += 1; // bio.md
    //     const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
    //     totalFilesEstimated += imageMatches.length;
    //   }

    //   // 3. Фотографии и их JSON
    //   const photos = await window.photosAPI.getByOwner(p.id);
    //   if (photos && photos.length > 0) {
    //     totalFilesEstimated += 1; // photos.json
    //     totalFilesEstimated += photos.length; // сами файлы фото
    //   }

    //   // 4. Дополнительные файлы
    //   const personFiles = await window.fileAPI.getPersonFiles(p.id);
    //   if (personFiles) {
    //     totalFilesEstimated += personFiles.length;
    //   }
    // }

    let avatar = 0;
    let bio_json = 0;
    let bio_img = 0;
    let photo_json = 0;
    let photo_img = 0;
    let photo_thumbs = 0;
    let files_d = 0;
    let external_json = 0;
    let external_avatar = 0;

    const allExternal = (await window.externalAPI?.getAll?.()) || [];

    for (const entity of allExternal) {
      external_json = 1;
      const avatarPath = await window.externalAPI.avatar.getPath(entity.id);
      if (avatarPath) external_avatar += 1;
    }

    for (const p of people) {
      // 1. Проверяем аватар так же, как в цикле копирования
      const avatarPath = await window.avatarAPI.getPath(p.id);
      if (avatarPath) {
        totalFilesEstimated += 1;
        avatar += 1;
      }

      // 2. Биография и картинки внутри неё
      const bioText = await window.bioAPI.load(p.id);
      if (bioText) {
        totalFilesEstimated += 1; // bio.md
        bio_json += 1;
        const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
        totalFilesEstimated += imageMatches.length;
        bio_img += imageMatches.length;
      }

      // 3. Фотографии и их JSON
      const photos = await window.photosAPI.getByOwner(p.id);
      if (photos && photos.length > 0) {
        totalFilesEstimated += 1; // photos.json
        photo_json += 1;
        const selectedVariantsCount =
          (photoFolders.includes("original") ? 1 : 0) +
          (photoFolders.includes("webp") ? 1 : 0) +
          (photoFolders.includes("thumbs") ? 1 : 0);
        totalFilesEstimated += photos.length * selectedVariantsCount;
        photo_img += photos.length * selectedVariantsCount;
        if (photoFolders.includes("thumbs")) {
          photo_thumbs += photos.length;
        }
      }

      // 4. Дополнительные файлы
      const personFiles = await window.fileAPI.getPersonFiles(p.id);
      if (personFiles) {
        totalFilesEstimated += personFiles.length;
        files_d += personFiles.length;
      }
    }
    console.log("avatar", avatar);
    console.log("bio_json", bio_json);
    console.log("bio_img", bio_img);
    console.log("photo_img", photo_img);
    console.log("photo_json", photo_json);
    console.log("files_d", files_d);
    console.log("external_json", external_json);
    console.log("external_avatar", external_avatar);
    console.log("photo_thumbs", photo_thumbs);

    totalFilesEstimated += external_json + external_avatar;

    // ОСНОВНОЙ ЦИКЛ ОБРАБОТКИ
    for (let i = 0; i < total; i++) {
      const person = people[i];
      const personId = person?.id ?? `idx_${i}`;
      const personPath = `${tempDir}/people/${personId}`;
      await window.fileAPI.ensureDir(personPath);

      emitProgress({
        phase: "preparation",
        percent: Math.round((i / Math.max(1, total)) * 100),
        message: `${person.firstName || ""} ${person.lastName || ""}`, // Имя для UI
        processedFiles: processedFilesCount, // ТЕКУЩИЙ СЧЕТЧИК
        totalFiles: totalFilesEstimated, // ОБЩЕЕ КОЛИЧЕСТВО
        currentFile: "Обработка данных...",
      });

      // --- Аватар ---
      try {
        const avatarPath = await window.avatarAPI.getPath(personId);
        if (avatarPath) {
          const cleanSrc = avatarPath
            .replace(/^file:\/\//, "")
            .replace(/%20/g, " ");
          const dest = `${personPath}/avatar.jpg`;
          const res = await window.fileAPI.copyFile(cleanSrc, dest);
          if (res && res.success !== false) {
            archiveFiles.push(dest);
            processedFilesCount++; // <--- ДОБАВИТЬ
            // И сразу отправить в UI, чтобы имя файла мелькало
            emitProgress({
              phase: "preparation",
              processedFiles: processedFilesCount,
              totalFiles: totalFilesEstimated,
              currentFile: `Аватар: ${personId}.jpg`,
            });
          }
        }
      } catch (e) {}

      // --- Биография ---
      // --- Биография и вложенные изображения ---
      // --- Биография и вложенные изображения ---
      try {
        const bioText = await window.bioAPI.load(personId);

        if (bioText) {
          // 1. Сохраняем файл биографии
          const bioPath = `${personPath}/bio.md`;
          await window.fileAPI.writeText(bioPath, bioText);
          archiveFiles.push(bioPath);
          processedFilesCount++; // Исправлено (было rocessedFilesCount)

          // 2. Ищем картинки
          const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
          const imageNames = imageMatches.map((m) => m[1]);

          for (const relPath of imageNames) {
            try {
              if (relPath.startsWith("http")) continue;

              // ВАЖНО: Декодируем relPath на случай, если там %20
              const cleanRelPath = decodeURIComponent(relPath);

              // Формируем абсолютный путь к исходнику
              // Убедитесь, что basePath заканчивается правильно
              const srcPath = `${basePath}/${personId}/${cleanRelPath}`
                .replace(/\\/g, "/")
                .replace(/\/+/g, "/")
                .replace(/%20/g, " ");

              // Целевой путь во временной папке
              const destPath = `${personPath}/${cleanRelPath}`
                .replace(/\\/g, "/")
                .replace(/\/+/g, "/");

              // Создаем подпапку (например, bio_images)
              const destSubDir = destPath.substring(
                0,
                destPath.lastIndexOf("/"),
              );
              await window.fileAPI.ensureDir(destSubDir);

              console.log(`[BioExport] Copying: ${srcPath} -> ${destPath}`);

              const res = await window.fileAPI.copyFile(srcPath, destPath);

              if (res && res.success !== false) {
                archiveFiles.push(destPath);
                processedFilesCount++;

                // Обновляем прогресс, чтобы видеть копирование картинок био
                emitProgress({
                  phase: "preparation",
                  processedFiles: processedFilesCount,
                  totalFiles: totalFilesEstimated,
                  currentFile: cleanRelPath.split("/").pop(),
                });
              } else {
                console.warn(`[exportToZip] Файл био не найден: ${srcPath}`);
              }
            } catch (imgErr) {
              console.warn(
                `[exportToZip] Ошибка картинки био ${relPath}:`,
                imgErr,
              );
            }
          }
        }
      } catch (e) {
        console.warn(`[exportToZip] Ошибка биографии ${personId}:`, e);
      }

      // --- ФОТОГРАФИИ ---
      try {
        const photos = await window.photosAPI.getByOwner(personId);
        if (Array.isArray(photos) && photos.length) {
          const photoJsonPath = `${personPath}/photos.json`;
          await window.fileAPI.writeText(
            photoJsonPath,
            JSON.stringify(photos, null, 2),
          );
          archiveFiles.push(photoJsonPath);

          const photoDir = `${personPath}/photos`;
          await window.fileAPI.ensureDir(photoDir);

          for (let k = 0; k < photos.length; k++) {
            const photo = photos[k];
            const photoId = String(photo.id);
            // Декодируем имя файла на случай, если там %20
            const origName = photo.filename ? decodeURI(photo.filename) : null;
            const webpFromName = origName
              ? origName.replace(/\.[^.]+$/, ".webp")
              : null;

            const personPhotosDir = `${basePath}/${personId}/photos`;

            const variants = [
              {
                enabled: photoFolders.includes("original"),
                subDir: "original",
                ext: null,
                candidates: [
                  `${personPhotosDir}/original/${origName}`,
                  `${personPhotosDir}/${origName}`,
                ],
              },
              {
                enabled: photoFolders.includes("webp"),
                subDir: "webp",
                ext: "webp",
                candidates: [
                  `${personPhotosDir}/webp/${webpFromName}`,
                  `${personPhotosDir}/webp/${photoId}.webp`,
                ],
              },
              {
                enabled: photoFolders.includes("thumbs"),
                subDir: "thumbs",
                ext: "webp",
                candidates: [
                  `${personPhotosDir}/thumbs/${webpFromName}`,
                  `${personPhotosDir}/thumbs/${photoId}.webp`,
                ],
              },
            ];

            let copiedAtLeastOne = false;

            for (const variant of variants) {
              if (!variant.enabled) continue;

              let variantCopied = false;
              const checkedCandidates = [];

              for (const candidate of variant.candidates) {
                if (!candidate || candidate.includes("null")) continue;

                // Очищаем путь от возможных двойных слешей
                const srcPath = candidate.replace(/\\/g, "/").replace(/\/+/g, "/");
                checkedCandidates.push(srcPath);

                const finalExt = variant.ext || srcPath.split(".").pop();
                const destFilename = origName
                  ? origName.replace(/\.[^.]+$/, `.${finalExt}`)
                  : `${photoId}.${finalExt}`;

                const finalSubDir = `${photoDir}/${variant.subDir}`;
                await window.fileAPI.ensureDir(finalSubDir);
                const destPath = `${finalSubDir}/${destFilename}`;

                const result = await window.fileAPI.copyFile(srcPath, destPath);

                if (result && result.success !== false) {
                  archiveFiles.push(destPath);
                  processedFilesCount++;
                  copiedAtLeastOne = true;
                  variantCopied = true;
                  emitProgress({
                    phase: "preparation",
                    processedFiles: processedFilesCount,
                    totalFiles: totalFilesEstimated,
                    currentFile: destFilename,
                  });
                  break;
                }
              }

              if (!variantCopied) {
                console.warn(
                  `[exportToZip] ${variant.subDir} для фото ${photoId} не найден. Проверяли:`,
                  checkedCandidates,
                );
              }
            }

            if (!copiedAtLeastOne) {
              console.warn(`[exportToZip] Ни один вариант фото ${photoId} не был скопирован`);
            }
          }
        }
      } catch (e) {
        console.error("Photos error", e);
      }

      // --- ПРОЧИЕ ФАЙЛЫ (Видео, Аудио, Документы) ---
      try {
        // Получаем список файлов через API, который мы создали ранее
        const personFiles = await window.fileAPI.getPersonFiles(personId);

        if (Array.isArray(personFiles) && personFiles.length > 0) {
          const destFilesDir = `${personPath}/files`;
          await window.fileAPI.ensureDir(destFilesDir);

          // Путь к исходной папке файлов на диске
          const srcFilesDir = `${basePath}/${personId}/files`
            .replace(/\\/g, "/")
            .replace(/\/+/g, "/")
            .replace(/%20/g, " ");

          for (const fileObj of personFiles) {
            try {
              const fileName = fileObj.name;
              const srcFilePath = `${srcFilesDir}/${fileName}`;
              const destFilePath = `${destFilesDir}/${fileName}`;

              // Копируем файл во временную директорию архива
              const res = await window.fileAPI.copyFile(
                srcFilePath,
                destFilePath,
              );

              if (res && res.success !== false) {
                archiveFiles.push(destFilePath);
              }
            } catch (fileErr) {
              console.warn(
                `[exportToZip] Не удалось скопировать файл ${fileObj.name}:`,
                fileErr,
              );
            }
          }
        }
      } catch (e) {
        console.warn(
          `[exportToZip] Ошибка экспорта раздела "Файлы" для ${personId}:`,
          e,
        );
      }

      if ((i + 1) % 20 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    // --- СПРАВОЧНИК (внешние люди и питомцы) ---
    try {
      if (allExternal.length > 0) {
        onStatus("Экспорт справочника...");
        const externalJsonPath = `${tempDir}/external-entities.json`;
        await window.fileAPI.writeText(
          externalJsonPath,
          JSON.stringify(allExternal, null, 2),
        );
        archiveFiles.push(externalJsonPath);
        processedFilesCount++;
        emitProgress({
          phase: "preparation",
          processedFiles: processedFilesCount,
          totalFiles: totalFilesEstimated,
          currentFile: "external-entities.json",
        });

        for (const entity of allExternal) {
          try {
            const avatarPath = await window.externalAPI.avatar.getPath(entity.id);
            if (!avatarPath) continue;

            const entityDir = `${tempDir}/external/${entity.id}`;
            await window.fileAPI.ensureDir(entityDir);

            const cleanSrc = avatarPath
              .replace(/^file:\/\//, "")
              .replace(/%20/g, " ");
            const dest = `${entityDir}/avatar.jpg`;
            const res = await window.fileAPI.copyFile(cleanSrc, dest);

            if (res && res.success !== false) {
              archiveFiles.push(dest);
              processedFilesCount++;
              emitProgress({
                phase: "preparation",
                processedFiles: processedFilesCount,
                totalFiles: totalFilesEstimated,
                currentFile: `external/${entity.id}/avatar.jpg`,
              });
            }
          } catch (entityErr) {
            console.warn(
              `[exportToZip] Ошибка экспорта ${entity.id}:`,
              entityErr,
            );
          }
        }
      }
    } catch (e) {
      console.warn("[exportToZip] Ошибка экспорта справочника:", e);
    }

    // ЗАВЕРШЕНИЕ
    onStatus("Создание архива...");
    // const savePath = await window.dialogAPI.chooseSavePath(defaultFilename);
    // if (!savePath) {
    //   await window.fileAPI.delete(tempDir);
    //   onStatus("Экспорт отменён");
    //   return null;
    // }

    const archivePath = await window.archiveAPI.create(archiveFiles, savePath);
    await window.fileAPI.delete(tempDir);

    // ПРИНУДИТЕЛЬНО отправляем 100% перед выходом
    emitProgress({
      phase: "done",
      percent: 100,
      processedFiles: totalFilesEstimated,
      totalFiles: totalFilesEstimated,
      message: "✅ Готово",
    });

    if (!archivePath) {
      onError("Ошибка при создании архива");
      return null;
    }

    onStatus("✅ Архив сохранён");
    return archivePath;
  } catch (err) {
    console.error("exportPeopleToZip error:", err);
    onError(`Ошибка: ${err?.message || String(err)}`);
    return null;
  }
};
