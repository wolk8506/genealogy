const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const exifParser = require("exif-parser"); // Не забудь: npm install exif-parser
// Путь к данным
const DATA_PATH = path.join(
  require("os").homedir(),
  "Documents",
  "Genealogy",
  "people",
);
const GENEALOGY_DATA_PATH = path.join(DATA_PATH, "..", "genealogy-data.json");

function formatAsTable(data) {
  const keys = Object.keys(data);
  // Находим ширину колонки для текста (минимум 30 символов)
  const labelWidth = Math.max(...keys.map((k) => k.length), 30) + 2;
  // Находим ширину колонки для цифр
  const valueWidth =
    Math.max(...Object.values(data).map((v) => String(v).length), 6) + 2;

  const top = `┌${"─".repeat(labelWidth)}┬${"─".repeat(valueWidth)}┐`;
  const bottom = `└${"─".repeat(labelWidth)}┴${"─".repeat(valueWidth)}┘`;
  const separator = `├${"─".repeat(labelWidth)}┼${"─".repeat(valueWidth)}┤`;

  const rows = keys.map((key) => {
    const label = key.padEnd(labelWidth);
    const value = String(data[key]).padStart(valueWidth);
    return `│${label}│${value}│`;
  });

  return [top, rows.join(`\n${separator}\n`), bottom].join("\n");
}

/**
 * ФУНКЦИЯ 1: Очистка от битых ссылок (когда запись в JSON есть, а файла нет)
 */
async function fixMissingPhotos(sendLog) {
  const personFolders = fs
    .readdirSync(DATA_PATH)
    .filter((f) => fs.statSync(path.join(DATA_PATH, f)).isDirectory());

  sendLog(`Проверка ${personFolders.length} папок на битые ссылки...`);
  let globalDeletedCount = 0;

  personFolders.forEach((id) => {
    const pPath = path.join(DATA_PATH, id);
    const jsonPath = path.join(pPath, "photos.json");
    const diskPath = path.join(pPath, "photos", "original");

    if (fs.existsSync(jsonPath)) {
      try {
        const originalData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        const filesOnDisk = fs.existsSync(diskPath)
          ? new Set(fs.readdirSync(diskPath).filter((f) => !f.startsWith(".")))
          : new Set();

        const cleanedData = originalData.filter((photo) => {
          const exists = filesOnDisk.has(photo.filename);
          if (!exists) {
            sendLog(
              `[ID ${id}] Удалена ссылка на отсутствующий файл: ${photo.filename}`,
            );
            globalDeletedCount++;
          }
          return exists;
        });

        if (cleanedData.length !== originalData.length) {
          fs.writeFileSync(
            jsonPath,
            JSON.stringify(cleanedData, null, 2),
            "utf8",
          );
        }
      } catch (err) {
        sendLog(`[ID ${id}] Ошибка чтения JSON: ${err.message}`);
      }
    }
  });

  return { success: true, affectedCount: globalDeletedCount };
}

/**
 * ФУНКЦИЯ 2: Удаление дублей (когда один файл прописан в JSON несколько раз)
 */
async function removePhotoDuplicates(sendLog) {
  const personFolders = fs
    .readdirSync(DATA_PATH)
    .filter((f) => fs.statSync(path.join(DATA_PATH, f)).isDirectory());

  sendLog(`Проверка ${personFolders.length} папок на дубликаты...`);
  let totalFixed = 0;

  personFolders.forEach((id) => {
    const jPath = path.join(DATA_PATH, id, "photos.json");

    if (fs.existsSync(jPath)) {
      try {
        const photos = JSON.parse(fs.readFileSync(jPath, "utf8"));
        const seen = new Set();
        const uniquePhotos = [];

        photos.forEach((photo) => {
          if (!seen.has(photo.filename)) {
            seen.add(photo.filename);
            uniquePhotos.push(photo);
          } else {
            sendLog(`[ID ${id}] Удален дубликат записи: ${photo.filename}`);
            totalFixed++;
          }
        });

        if (photos.length !== uniquePhotos.length) {
          fs.writeFileSync(
            jPath,
            JSON.stringify(uniquePhotos, null, 2),
            "utf8",
          );
        }
      } catch (err) {
        sendLog(`[ID ${id}] Ошибка: ${err.message}`);
      }
    }
  });

  return { success: true, affectedCount: totalFixed };
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Гео-кодирование (твоя логика с Nominatim)
const geoCache = new Map();
async function getFriendlyLocation(lat, lng) {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`,
      { headers: { "User-Agent": "FamilyArchivePatcher/1.0" } },
    );
    const data = await response.json();
    if (data && data.address) {
      const a = data.address;
      const city = a.city || a.town || a.village || a.hamlet || a.suburb;
      const result =
        city && a.country ? `${a.country}, ${city}` : a.display_name;
      geoCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    return null;
  }
}

// --- ОСНОВНЫЕ ОБРАБОТЧИКИ ТАСКОВ ---

const tasks = {
  // 1. Общий аудит системы
  "run-audit": async (sendLog) => {
    const folders = fs
      .readdirSync(DATA_PATH)
      .filter((f) => fs.statSync(path.join(DATA_PATH, f)).isDirectory());

    let s = { photos: 0, avatars: 0, bios: 0, extra: 0 };

    folders.forEach((id) => {
      const p = path.join(DATA_PATH, id);
      if (fs.existsSync(path.join(p, "avatar.jpg"))) s.avatars++;
      if (fs.existsSync(path.join(p, "bio.md"))) s.bios++;

      const photoDir = path.join(p, "photos", "original");
      if (fs.existsSync(photoDir)) {
        s.photos += fs
          .readdirSync(photoDir)
          .filter((f) => !f.startsWith(".")).length;
      }

      const extraDir = path.join(p, "files");
      if (fs.existsSync(extraDir)) {
        s.extra += fs
          .readdirSync(extraDir)
          .filter((f) => !f.startsWith(".")).length;
      }
    });

    // Формируем данные для таблицы
    const stats = {
      "Всего карточек людей": folders.length,
      "Аватары на диске": s.avatars,
      "Биографии (.md)": s.bios,
      "Файлы фото (original)": s.photos,
      "Доп. файлы (files/)": s.extra,
    };

    // Отправляем готовую таблицу одним логом
    await sendLog("\n" + formatAsTable(stats));

    return { success: true, affectedCount: folders.length };
  },

  // 2. Поиск битых ссылок
  "fix-missing-files": async (sendLog) => {
    return await fixMissingPhotos(sendLog);
  },

  // 3. Удаление дубликатов
  "remove-duplicates": async (sendLog) => {
    return await removePhotoDuplicates(sendLog);
  },

  // 4. Глубокий поиск расхождений
  "debug-diff": async (sendLog) => {
    const folders = fs
      .readdirSync(DATA_PATH)
      .filter((f) => fs.statSync(path.join(DATA_PATH, f)).isDirectory());
    let diffCount = 0;

    for (const id of folders) {
      const jsonPath = path.join(DATA_PATH, id, "photos.json");
      const diskPath = path.join(DATA_PATH, id, "photos", "original");
      if (fs.existsSync(jsonPath)) {
        const jsonFiles = JSON.parse(fs.readFileSync(jsonPath, "utf8")).map(
          (p) => p.filename,
        );
        const diskFiles = fs.existsSync(diskPath)
          ? fs.readdirSync(diskPath).filter((f) => !f.startsWith("."))
          : [];

        if (jsonFiles.length !== diskFiles.length) {
          diffCount++;
          await sendLog(
            `⚠️ [ID ${id}] Разница! JSON: ${jsonFiles.length}, Диск: ${diskFiles.length}`,
          );
        }
      }
    }
    await sendLog(
      diffCount > 0
        ? `❌ Найдено проблем: ${diffCount}`
        : `✅ Расхождений нет.`,
    );
    return { success: true, affectedCount: diffCount };
  },

  // 5. Гео-патчер (Самый важный фикс тут)
  "geo-patcher": async (sendLog) => {
    if (!fs.existsSync(GENEALOGY_DATA_PATH)) {
      await sendLog("❌ Ошибка: genealogy-data.json не найден!");
      return { success: false };
    }

    // Внутренняя функция для формирования красивого адреса
    const getExtendedLocation = async (lat, lng) => {
      const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
      if (geoCache.has(cacheKey)) return geoCache.get(cacheKey);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ru`,
          { headers: { "User-Agent": "FamilyArchivePatcher/1.0" } },
        );
        const data = await response.json();
        if (data && data.address) {
          const a = data.address;
          const city =
            a.city ||
            a.town ||
            a.village ||
            a.hamlet ||
            a.suburb ||
            a.city_district;
          const country = a.country;
          const suburb = a.suburb ? `, ${a.suburb}` : "";
          const road = a.road ? `, ${a.road}` : "";

          const result =
            city && country
              ? `${country}, ${city}${suburb}${road}`
              : country || data.display_name;

          geoCache.set(cacheKey, result);
          return result;
        }
      } catch (err) {
        return null;
      }
    };

    try {
      const data = await fs.promises.readFile(GENEALOGY_DATA_PATH, "utf-8");
      const people = JSON.parse(data);
      await sendLog(
        `Начинаем массовую обработку для ${people.length} человек...`,
      );

      let totalUpdated = 0;

      for (const person of people) {
        const personId = String(person.id);
        const jsonPath = path.join(DATA_PATH, personId, "photos.json");
        const origDir = path.join(DATA_PATH, personId, "photos", "original");

        if (!fs.existsSync(jsonPath)) {
          // Чтобы видеть, что процесс идет, даже если папок нет
          await new Promise((resolve) => setImmediate(resolve));
          continue;
        }

        await sendLog(`\n--- Обработка человека ID: ${personId} ---`);

        try {
          const photoData = await fs.promises.readFile(jsonPath, "utf-8");
          let photos = JSON.parse(photoData);
          let updatedInThisPerson = 0;

          for (let photo of photos) {
            let lat = photo.lat;
            let lng = photo.lng;
            const fullPath = path.join(origDir, photo.filename);

            // 1. Пытаемся достать координаты из EXIF, если их нет в JSON
            if ((!lat || !lng) && fs.existsSync(fullPath)) {
              try {
                const buffer = await fs.promises.readFile(fullPath);
                const parser = exifParser.create(buffer);
                const res = parser.parse();
                if (res.tags.GPSLatitude && res.tags.GPSLongitude) {
                  lat = res.tags.GPSLatitude;
                  lng = res.tags.GPSLongitude;
                  photo.lat = lat;
                  photo.lng = lng;
                  // Не ставим changed = true здесь, подождем адреса,
                  // либо можно добавить сохранение и без адреса ниже
                }
              } catch (e) {
                await sendLog(`Ошибка EXIF в ${photo.filename}: ${e.message}`);
              }
            }

            // 2. Ищем адрес, если координаты есть, а имени места нет
            if (lat && lng && !photo.locationName) {
              const location = await getExtendedLocation(lat, lng);
              if (location) {
                photo.locationName = location;
                updatedInThisPerson++;
                await sendLog(
                  `[${personId}] Найдено место: ${location} для ${photo.filename}`,
                );

                // Вежливая пауза для API
                await new Promise((r) => setTimeout(r, 1100));
              }
            }
          }

          if (updatedInThisPerson > 0) {
            await fs.promises.writeFile(
              jsonPath,
              JSON.stringify(photos, null, 2),
            );
            totalUpdated++;
            await sendLog(
              `✅ [${personId}] Обновлено записей: ${updatedInThisPerson}`,
            );
          }
        } catch (err) {
          await sendLog(`❌ [${personId}] Ошибка: ${err.message}`);
        }

        // Микро-пауза для "дыхания" интерфейса
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await sendLog(`\n🚀 Массовая обработка завершена!`);
      await sendLog(`Итого изменено профилей: ${totalUpdated}`);
      return { success: true, affectedCount: totalUpdated };
    } catch (err) {
      await sendLog(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${err.message}`);
      return { success: false };
    }
  },
  /**
   * ГЛУБОКИЙ АУДИТ: Поиск дублей внутри JSON и проверка наличия аватаров
   */
  "deep-audit": async (sendLog) => {
    const folders = fs
      .readdirSync(DATA_PATH)
      .filter((f) => fs.statSync(path.join(DATA_PATH, f)).isDirectory());

    await sendLog(`🔍 Запуск глубокого аудита для ${folders.length} папок...`);

    let duplicatesCount = 0;
    let missingAvatars = 0;
    let processed = 0;

    for (const id of folders) {
      processed++;
      const pPath = path.join(DATA_PATH, id);

      // 1. Проверка дублей имён файлов в photos.json
      const jPath = path.join(pPath, "photos.json");
      if (fs.existsSync(jPath)) {
        try {
          const fileData = await fs.promises.readFile(jPath, "utf8");
          const photos = JSON.parse(fileData);
          const filenames = photos.map((p) => p.filename);

          // Ищем конкретные дубликаты
          const seen = new Set();
          const duplicateNames = new Set(); // Используем Set, чтобы если файл записан 3 раза, он вывелся один раз

          for (const name of filenames) {
            if (seen.has(name)) {
              duplicateNames.add(name);
            } else {
              seen.add(name);
            }
          }

          if (duplicateNames.size > 0) {
            // Вычисляем, сколько именно "лишних" записей
            const diff = filenames.length - seen.size;
            duplicatesCount += diff;

            // Превращаем найденные имена в строку через запятую
            const namesList = Array.from(duplicateNames).join(", ");
            await sendLog(
              `⚠️ [ID ${id}] Дубли в JSON (${diff} шт): ${namesList}`,
            );
          }
        } catch (e) {
          await sendLog(`❌ [ID ${id}] Ошибка парсинга photos.json`);
        }
      }

      // 2. Проверка физического наличия аватара
      const avPath = path.join(pPath, "avatar.jpg");
      if (!fs.existsSync(avPath)) {
        missingAvatars++;
      }

      // Каждые 50 папок даем интерфейсу "вздохнуть"
      if (processed % 50 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    await sendLog(`\n=== ИТОГИ ПРОВЕРКИ ===`);
    await sendLog(`👯 Повторяющиеся записи в JSON (дубли): ${duplicatesCount}`);
    await sendLog(`🖼️ Папок без файла avatar.jpg: ${missingAvatars}`);
    await sendLog(`✅ Проверка завершена.`);

    return { success: true, affectedCount: duplicatesCount + missingAvatars };
  },
};

/**
 * ЕДИНЫЙ ОБРАБОТЧИК ДЛЯ ВЫЗОВА ИЗ UI
 */
ipcMain.handle("run-maintenance-task", async (event, taskName) => {
  const sendLog = (msg) => event.sender.send("maintenance-log", msg);

  try {
    // Проверяем, существует ли такая задача в нашем списке
    if (typeof tasks[taskName] === "function") {
      // Запускаем её
      const result = await tasks[taskName](sendLog);
      return result;
    } else {
      // Если задачи нет в объекте tasks — выдаем ошибку
      throw new Error(
        `Задача "${taskName}" не найдена в реестре tasks. Проверь ключи в объекте tasks.`,
      );
    }
  } catch (error) {
    sendLog(`❌ ОШИБКА: ${error.message}`);
    return { success: false, error: error.message };
  }
});
