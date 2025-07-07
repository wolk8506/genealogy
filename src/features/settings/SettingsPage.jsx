import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import { toggleTheme } from "../theme/themeSlice";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Backdrop, CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RestoreIcon from "@mui/icons-material/Restore";
import { Buffer } from "buffer";
import { ImportDecisionModal } from "./ImportDecisionModal";
import TuneIcon from "@mui/icons-material/Tune";
import FolderSharedIcon from "@mui/icons-material/FolderShared";

export default function SettingsPage() {
  const dispatch = useDispatch();
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saveDone, setSaveDone] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importStatus, setImportStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalSummary, setModalSummary] = useState("");
  const [modalToAdd, setModalToAdd] = useState([]);
  const [modalToUpdate, setModalToUpdate] = useState([]);
  const [modalResolve, setModalResolve] = useState(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    window.appAPI?.getVersion?.().then(setVersion);
    window.appAPI?.getPlatform?.().then(setPlatform);
  }, []);

  const fetchSize = () => {
    window.appAPI.getFolderSize().then(setSize);
  };
  useEffect(() => {
    fetchSize();
    window.appAPI.onFolderSizeUpdated(() => {
      fetchSize();
    });
  }, []);

  const handleOpenFolder = () => {
    window.appAPI?.openDataFolder?.();
  };

  const handleReset = () => {
    if (confirm("Вы уверены, что хотите сбросить все настройки?")) {
      window.appAPI?.resetSettings?.();
    }
  };

  const handleBackup = async () => {
    setIsSaving(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const people = await window.peopleAPI.getAll();
      const total = people.length;

      zip.file("genealogy-data.json", JSON.stringify({ people }, null, 2));

      for (let i = 0; i < total; i++) {
        const person = people[i];
        const personPath = `people/${person.id}`;
        const personFolder = zip.folder(personPath);
        let hasContent = false;

        // 2.1 Аватар
        try {
          const avatarPath = await window.avatarAPI.getPath(person.id);
          const res = await fetch(avatarPath);

          if (res.ok) {
            const avatarBlob = await res.blob();
            if (avatarBlob && avatarBlob.size >= 1024) {
              personFolder.file("avatar.jpg", avatarBlob);
              hasContent = true;
              console.log(`🧑‍🦱 Аватар добавлен для ${person.id}`);
            } else {
              console.warn(
                `⚠️ Аватар пустой или слишком маленький: ${avatarPath}`
              );
            }
          } else {
            console.warn(`⚠️ Аватар не найден: ${avatarPath}`);
          }
        } catch (err) {
          console.warn(`❌ Ошибка при загрузке аватара ${person.id}`, err);
        }

        // 2.2 Биография и изображения из неё
        try {
          const bioText = await window.bioAPI.read(person.id);
          if (bioText) {
            personFolder.file("bio.md", bioText);
            hasContent = true;
            console.log(`📄 bio.md добавлен для ${person.id}`);

            const imageMatches = [...bioText.matchAll(/!\[.*?\]\((.*?)\)/g)];
            const imagePaths = imageMatches.map((m) => m[1]);

            for (const relPath of imagePaths) {
              try {
                const blob = await window.bioAPI.readImage(person.id, relPath);
                personFolder.file(relPath, blob);
                hasContent = true;
                console.log(`🖼️ Изображение добавлено: ${relPath}`);
              } catch (err) {
                console.warn(
                  `⚠️ Не удалось загрузить изображение: ${relPath}`,
                  err
                );
              }
            }
          }
        } catch (err) {
          console.warn(`❌ Ошибка при чтении биографии ${person.id}`, err);
        }

        // 2.3 Фото
        if (window.photosAPI?.getByOwner) {
          try {
            const photos = await window.photosAPI.getByOwner(person.id);
            if (photos.length) {
              personFolder.file("photos.json", JSON.stringify(photos, null, 2));
              hasContent = true;

              const photoFolder = personFolder.folder("photos");

              for (const photo of photos) {
                try {
                  const photoPath = await window.photosAPI.getPath(photo.id);
                  if (!photoPath) {
                    console.warn(`⚠️ Путь к фото ${photo.id} не найден`);
                    continue;
                  }

                  const ext = photoPath.split(".").pop().split("?")[0];
                  const res = await fetch(photoPath);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);

                  const blob = await res.blob();
                  const filename = photo.filename || `${photo.id}.${ext}`;
                  photoFolder.file(filename, blob);
                  hasContent = true;
                  console.log(`📸 Фото добавлено: ${filename}`);
                } catch (err) {
                  console.warn(`❌ Не удалось загрузить фото ${photo.id}`, err);
                }
              }
            }
          } catch (err) {
            console.warn(`❌ Ошибка при получении фото для ${person.id}`, err);
          }
        }

        // 2.4 Удаление пустой папки, если ничего не добавлено
        if (!hasContent) {
          zip.remove(personPath);
          console.log(`🗑️ Папка ${personPath} удалена — нет содержимого`);
        }

        // 📊 Обновление прогресса
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `Genealogy_backup_${Date.now()}.zip`);
      setSaveDone(true);
      setTimeout(() => {
        setIsSaving(false);
        setSaveDone(false);
        setProgress(0);
      }, 1500); // Пауза перед закрытием
    } catch (err) {
      console.error("❌ Ошибка при создании архива:", err);
    } finally {
      setIsSaving(false);
      setProgress(0);
    }
  };

  // ~ Восстановление данных
  //! 1

  // const checkArchiveDiff = async (zip, archivePeople) => {
  //   const peopleToAdd = [];
  //   const biosToUpdate = [];
  //   const photosToUpdate = [];

  //   const existingPeople = await window.peopleAPI.getAll();
  //   const existingIds = existingPeople.map((p) => p.id);

  //   for (const person of archivePeople) {
  //     const personId = person.id;
  //     const personPath = `people/${personId}/`;

  //     if (!existingIds.includes(personId)) {
  //       peopleToAdd.push(personId);
  //     }

  //     const archiveBio = await zip.file(`${personPath}bio.md`)?.async("string");
  //     const existingBio = await window.bioAPI.read(personId);
  //     if (archiveBio && archiveBio !== existingBio) {
  //       biosToUpdate.push(personId);
  //     }

  //     const archivePhotosJson = await zip
  //       .file(`${personPath}photos.json`)
  //       ?.async("string");
  //     if (archivePhotosJson) {
  //       const archivePhotos = JSON.parse(archivePhotosJson);
  //       const archiveFilenames = archivePhotos.map((p) => p.filename);

  //       const existingPhotos = await window.photosAPI.read(personId);
  //       const existingFilenames = existingPhotos?.map((p) => p.filename) || [];

  //       const hasPhotoDiff =
  //         archiveFilenames.length !== existingFilenames.length ||
  //         archiveFilenames.some((f) => !existingFilenames.includes(f));

  //       if (hasPhotoDiff) {
  //         photosToUpdate.push(personId);
  //       }
  //     }
  //   }

  //   const totalChanges =
  //     peopleToAdd.length + biosToUpdate.length + photosToUpdate.length;

  //   if (totalChanges === 0) {
  //     alert("✅ Все данные актуальны. Импорт можно продолжать.");
  //     return true;
  //   }

  //   const message = [
  //     "Будут обновлены:",
  //     peopleToAdd.length
  //       ? `👤 Новые: ${peopleToAdd.length} (${peopleToAdd.join(", ")})`
  //       : null,
  //     biosToUpdate.length
  //       ? `📄 Биографии: ${biosToUpdate.length} (${biosToUpdate.join(", ")})`
  //       : null,
  //     photosToUpdate.length
  //       ? `📸 Фото: ${photosToUpdate.length} (${photosToUpdate.join(", ")})`
  //       : null,
  //     "",
  //     "Что сделать?",
  //     "✅ OK — обновить всех",
  //     "➕ Cancel — добавить только новых",
  //   ]
  //     .filter(Boolean)
  //     .join("\n");

  //   const confirm = window.confirm(message);
  //   if (!confirm) {
  //     if (peopleToAdd.length === 0) {
  //       alert("⛔ Импорт отменён. Нет новых людей для добавления.");
  //       return false;
  //     }

  //     // Обновлять только новых
  //     for (const personId of peopleToAdd) {
  //       const archivePhotosJson = await zip
  //         .file(`people/${personId}/photos.json`)
  //         ?.async("string");
  //       if (archivePhotosJson) {
  //         const archivePhotos = JSON.parse(archivePhotosJson);
  //         await window.photosAPI.write(personId, archivePhotos);
  //         console.log(`✅ Восстановлен photos.json для нового ${personId}`);
  //       }
  //     }

  //     // Возвращаем только новых
  //     return {
  //       only: peopleToAdd,
  //     };
  //   }

  //   // Обновляем всех
  //   for (const personId of photosToUpdate) {
  //     const archivePhotosJson = await zip
  //       .file(`people/${personId}/photos.json`)
  //       ?.async("string");
  //     if (archivePhotosJson) {
  //       const archivePhotos = JSON.parse(archivePhotosJson);
  //       await window.photosAPI.write(personId, archivePhotos);
  //       console.log(`✅ Обновлён photos.json для ${personId}`);
  //     }
  //   }

  //   return true;
  // };
  const checkArchiveDiff = async (zip, archivePeople) => {
    const toAdd = [];
    const toUpdate = [];

    const existingPeople = await window.peopleAPI.getAll();
    const existingIds = new Set(existingPeople.map((p) => String(p.id)));

    for (const person of archivePeople) {
      const personId = String(person.id);
      const personPath = `people/${personId}/`;

      const isNew = !existingIds.has(personId);
      let needsUpdate = false;

      if (!isNew) {
        const archiveBio = await zip
          .file(`${personPath}bio.md`)
          ?.async("string");
        const existingBio = await window.bioAPI.read(personId);
        if (archiveBio && archiveBio !== existingBio) {
          needsUpdate = true;
        }

        const archivePhotosJson = await zip
          .file(`${personPath}photos.json`)
          ?.async("string");
        if (archivePhotosJson) {
          const archivePhotos = JSON.parse(archivePhotosJson);
          const archiveFilenames = archivePhotos.map((p) => p.filename);

          const existingPhotos = await window.photosAPI.read(personId);
          const existingFilenames =
            existingPhotos?.map((p) => p.filename) || [];

          const hasPhotoDiff =
            archiveFilenames.length !== existingFilenames.length ||
            archiveFilenames.some((f) => !existingFilenames.includes(f));

          if (hasPhotoDiff) {
            needsUpdate = true;
          }
        }
      }

      if (isNew) {
        toAdd.push(person);
      } else if (needsUpdate) {
        toUpdate.push(person);
      }
    }

    if (toAdd.length === 0 && toUpdate.length === 0) {
      return {
        toAdd: [],
        toUpdate: [],
        summary: "✅ Все данные актуальны. Импорт можно продолжать.",
      };
    }

    const formatList = (label, list) => {
      const preview = list
        .slice(0, 10)
        .map((p) => p.id)
        .join(", ");
      const suffix = list.length > 10 ? `, ...и ещё ${list.length - 10}` : "";
      return `${label}: ${list.length} (${preview}${suffix})`;
    };

    const summaryLines = [];
    if (toAdd.length > 0) summaryLines.push(formatList("➕ Новые", toAdd));
    if (toUpdate.length > 0)
      summaryLines.push(formatList("🔄 Обновить", toUpdate));

    return {
      toAdd,
      toUpdate,
      summary: summaryLines.join("\n\n") + "\n\nВыберите действие:",
    };
  };

  //! 1.1

  //! 2
  // const handleImport = async () => {
  //   try {
  //     setIsImporting(true);
  //     setImportStatus("📥 Запуск импорта архива...");

  //     const [fileHandle] = await window.showOpenFilePicker({
  //       types: [
  //         { description: "ZIP архив", accept: { "application/zip": [".zip"] } },
  //       ],
  //       multiple: false,
  //     });

  //     const file = await fileHandle.getFile();
  //     const zip = await JSZip.loadAsync(file);
  //     setImportStatus(`📦 Архив загружен: ${file.name}`);

  //     const jsonText = await zip.file("genealogy-data.json")?.async("string");
  //     if (!jsonText) throw new Error("Файл genealogy-data.json не найден");

  //     const { people } = JSON.parse(jsonText);
  //     const result = await checkArchiveDiff(zip, people);
  //     if (!result) return;

  //     const finalList = result.only ?? people;

  //     setImportProgress({ current: 0, total: people.length });

  //     for (const person of people) {
  //       const personId = person.id;
  //       const personPath = `people/${personId}/`;

  //       setImportStatus(`🔄 Импортируем ${personId}...`);

  //       let totalPhotos = 0;
  //       let savedPhotos = 0;
  //       let skippedPhotos = 0;

  //       try {
  //         const bio = await zip.file(`${personPath}bio.md`)?.async("string");
  //         const avatarBlob = await zip
  //           .file(`${personPath}avatar.jpg`)
  //           ?.async("blob");
  //         const photosJson = await zip
  //           .file(`${personPath}photos.json`)
  //           ?.async("string");
  //         const photos = photosJson ? JSON.parse(photosJson) : [];

  //         // 📸 Собираем все имена фото
  //         const photoFilenames = new Set(photos.map((p) => p.filename));

  //         // 📎 Добавляем изображения из bio.md
  //         if (bio) {
  //           const matches = [
  //             ...bio.matchAll(/\]\(([\w\-\.]+\.(jpg|jpeg|png|webp))\)/gi),
  //           ];
  //           for (const match of matches) {
  //             photoFilenames.add(match[1]);
  //           }
  //         }

  //         const hasContent =
  //           bio || avatarBlob instanceof Blob || photoFilenames.size > 0;

  //         if (!hasContent) {
  //           const isNew = !(await window.peopleAPI.getById(personId));
  //           if (isNew) {
  //             await window.peopleAPI.upsert(person);
  //             await window.logAPI.append(`⚠️ Добавлен ${personId} без файлов`);
  //             console.log(`⚠️ Добавлен ${personId} без файлов`);
  //           } else {
  //             console.log(`⏭️ Пропускаем ${personId} — нет данных для импорта`);
  //             await window.logAPI.append(
  //               `⏭️ Пропущен ${personId} — нет данных`
  //             );
  //           }
  //           continue;
  //         }

  //         await window.fsAPI.ensurePersonFolder(personId);
  //         console.log("📁 Папка создана");

  //         if (bio) {
  //           await window.bioAPI.write(personId, bio);
  //           console.log("📄 bio.md импортирован");
  //         }

  //         if (avatarBlob instanceof Blob) {
  //           const buffer = Buffer.from(await avatarBlob.arrayBuffer());
  //           await window.avatarAPI.save(personId, buffer);
  //           console.log("🖼️ Аватар сохранён");
  //         }

  //         // 📥 Восстанавливаем все изображения
  //         for (const filename of photoFilenames) {
  //           totalPhotos++;

  //           const photoPaths = [
  //             { path: `${personPath}photos/${filename}`, source: "photos" },
  //             { path: `${personPath}${filename}`, source: "bio" },
  //           ];

  //           let photoBlob = null;
  //           let source = null;

  //           for (const entry of photoPaths) {
  //             const file = zip.file(entry.path);
  //             if (file) {
  //               photoBlob = await file.async("blob");
  //               source = entry.source;
  //               break;
  //             }
  //           }

  //           if (photoBlob instanceof Blob) {
  //             const buffer = Buffer.from(await photoBlob.arrayBuffer());

  //             if (source === "photos") {
  //               await window.photosAPI.saveFile(personId, filename, buffer);
  //             } else if (source === "bio") {
  //               await window.bioAPI.saveImage(personId, filename, buffer);
  //             }

  //             savedPhotos++;
  //             console.log(`🖼️ Фото ${filename} восстановлено из ${source}`);
  //           } else {
  //             skippedPhotos++;
  //             console.log(`⚠️ Фото ${filename} не найдено в архиве`);
  //           }
  //         }

  //         await window.peopleAPI.upsert(person);
  //         console.log("🧬 Данные человека добавлены в people.json");

  //         await window.logAPI.append(
  //           `Импорт ${personId}: всего ${totalPhotos}, сохранено ${savedPhotos}, пропущено ${skippedPhotos}`
  //         );
  //       } catch (personErr) {
  //         console.error(`❌ Ошибка при импорте ${personId}:`, personErr);
  //         await window.logAPI.append(
  //           `❌ Ошибка при импорте ${personId}: ${personErr.message}`
  //         );
  //       } finally {
  //         setImportProgress((prev) => ({ ...prev, current: prev.current + 1 }));
  //       }
  //     }

  //     setImportStatus("✅ Импорт архива завершён успешно");
  //     setTimeout(() => {
  //       alert("✅ Импорт завершён!");
  //     }, 100);
  //   } catch (err) {
  //     console.error("❌ Ошибка при импорте архива:", err);
  //     setImportStatus(`❌ Ошибка: ${err.message}`);
  //     alert("Ошибка при импорте архива: " + err.message);
  //   } finally {
  //     setIsImporting(false);
  //   }
  // };
  const handleImport = async () => {
    try {
      setIsImporting(true);
      setImportStatus("📥 Запуск импорта архива...");

      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          { description: "ZIP архив", accept: { "application/zip": [".zip"] } },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const zip = await JSZip.loadAsync(file);
      setImportStatus(`📦 Архив загружен: ${file.name}`);

      const jsonText = await zip.file("genealogy-data.json")?.async("string");
      if (!jsonText) throw new Error("Файл genealogy-data.json не найден");

      const { people } = JSON.parse(jsonText);
      const result = await checkArchiveDiff(zip, people);
      if (!result) return;

      // let finalList = [];

      // if (result.only) {
      //   finalList = result.only;
      // } else if (result.summary) {
      //   setModalSummary(result.summary);
      //   setModalToAdd(result.toAdd);
      //   setModalToUpdate(result.toUpdate);
      //   setModalOpen(true);

      //   const userChoice = await new Promise((resolve) =>
      //     setModalResolve(() => resolve)
      //   );

      //   if (userChoice === "cancel") return;
      //   finalList =
      //     userChoice === "new"
      //       ? result.toAdd
      //       : [...result.toAdd, ...result.toUpdate];
      // } else {
      //   finalList = people;
      // }
      let finalList = [];

      if (result.only) {
        finalList = result.only;
      } else {
        setModalSummary(result.summary);
        setModalToAdd(result.toAdd || []);
        setModalToUpdate(result.toUpdate || []);
        setModalOpen(true);

        const userChoice = await new Promise((resolve) =>
          setModalResolve(() => resolve)
        );

        if (userChoice === "cancel") return;

        if (result.toAdd.length === 0 && result.toUpdate.length === 0) {
          // Всё актуально — пользователь просто подтвердил
          return;
        }

        finalList =
          userChoice === "new"
            ? result.toAdd
            : [...result.toAdd, ...result.toUpdate];
      }

      // -----------------

      setImportProgress({ current: 0, total: finalList.length });

      for (const person of finalList) {
        const personId = person.id;
        const personPath = `people/${personId}/`;

        setImportStatus(`🔄 Импортируем ${personId}...`);

        let totalPhotos = 0;
        let savedPhotos = 0;
        let skippedPhotos = 0;

        try {
          const bio = await zip.file(`${personPath}bio.md`)?.async("string");
          const avatarBlob = await zip
            .file(`${personPath}avatar.jpg`)
            ?.async("blob");
          const photosJson = await zip
            .file(`${personPath}photos.json`)
            ?.async("string");
          const photos = photosJson ? JSON.parse(photosJson) : [];

          const photoFilenames = new Set(photos.map((p) => p.filename));

          if (bio) {
            const matches = [
              ...bio.matchAll(/\]\(([\w\-\.]+\.(jpg|jpeg|png|webp))\)/gi),
            ];
            for (const match of matches) {
              photoFilenames.add(match[1]);
            }
          }

          const hasContent =
            bio || avatarBlob instanceof Blob || photoFilenames.size > 0;

          if (!hasContent) {
            const isNew = !(await window.peopleAPI.getById(personId));
            if (isNew) {
              await window.peopleAPI.upsert(person);
              await window.logAPI.append(`⚠️ Добавлен ${personId} без файлов`);
              console.log(`⚠️ Добавлен ${personId} без файлов`);
            } else {
              console.log(`⏭️ Пропускаем ${personId} — нет данных для импорта`);
              await window.logAPI.append(
                `⏭️ Пропущен ${personId} — нет данных`
              );
            }
            continue;
          }

          await window.fsAPI.ensurePersonFolder(personId);
          if (bio) await window.bioAPI.write(personId, bio);
          if (avatarBlob instanceof Blob) {
            const buffer = Buffer.from(await avatarBlob.arrayBuffer());
            await window.avatarAPI.save(personId, buffer);
          }

          for (const filename of photoFilenames) {
            totalPhotos++;

            const photoPaths = [
              { path: `${personPath}photos/${filename}`, source: "photos" },
              { path: `${personPath}${filename}`, source: "bio" },
            ];

            let photoBlob = null;
            let source = null;

            for (const entry of photoPaths) {
              const file = zip.file(entry.path);
              if (file) {
                photoBlob = await file.async("blob");
                source = entry.source;
                break;
              }
            }

            if (photoBlob instanceof Blob) {
              const buffer = Buffer.from(await photoBlob.arrayBuffer());
              if (source === "photos") {
                await window.photosAPI.saveFile(personId, filename, buffer);
              } else {
                await window.bioAPI.saveImage(personId, filename, buffer);
              }

              savedPhotos++;
            } else {
              skippedPhotos++;
            }
          }

          if (photos.length > 0) {
            await window.photosAPI.write(personId, photos);
          }

          await window.peopleAPI.upsert(person);
          await window.logAPI.append(
            `Импорт ${personId}: всего ${totalPhotos}, сохранено ${savedPhotos}, пропущено ${skippedPhotos}`
          );
        } catch (personErr) {
          console.error(`❌ Ошибка при импорте ${personId}:`, personErr);
          await window.logAPI.append(
            `❌ Ошибка при импорте ${personId}: ${personErr.message}`
          );
        } finally {
          setImportProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        }
      }

      setImportStatus("✅ Импорт архива завершён успешно");
    } catch (err) {
      console.error("❌ Ошибка при импорте архива:", err);
      setImportStatus(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <ImportDecisionModal
        open={modalOpen}
        summary={modalSummary}
        toAdd={modalToAdd}
        toUpdate={modalToUpdate}
        onSelect={(choice) => {
          setModalOpen(false);
          if (modalResolve) modalResolve(choice);
        }}
      />

      <Backdrop
        open={isSaving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        {saveDone ? (
          <>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Архив сохранён!
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <CircularProgress color="inherit" />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Сохраняем архив... {progress}%
              </Typography>
            </Box>
          </>
        )}
      </Backdrop>
      <Backdrop
        open={isImporting}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        <CircularProgress color="inherit" />
        <Box mt={2}>
          <Typography variant="h6" color="inherit">
            {importStatus}
          </Typography>
          <Typography variant="body2" color="inherit">
            {importProgress.current} из {importProgress.total}
          </Typography>
        </Box>
      </Backdrop>

      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center" }}
      >
        <TuneIcon color="primary" fontSize="large" sx={{ marginRight: 0.5 }} />{" "}
        Настройки
      </Typography>
      <Stack spacing={3}>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Общие
          </Typography>
          <List>
            <ListItem button="true" onClick={() => dispatch(toggleTheme())}>
              <ListItemIcon>
                <Brightness4Icon />
              </ListItemIcon>
              <ListItemText primary="Переключить тему" />
            </ListItem>

            <Tooltip title={size ? `Размер: ${size} MB` : "Загрузка..."} arrow>
              <ListItem button="true" onClick={handleOpenFolder}>
                <ListItemIcon>
                  <FolderSharedIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Открыть папку данных"
                  secondary={`~/Documents/Genealogy${
                    size ? ` • ${size} MB` : ""
                  }`}
                />
              </ListItem>
            </Tooltip>
            <ListItem button="true" onClick={handleBackup}>
              <ListItemIcon>
                <SaveIcon />
              </ListItemIcon>
              <ListItemText
                primary="Резервная копия"
                secondary="~/Documents/Genealogy"
              />
            </ListItem>
            <ListItem button="true" onClick={handleImport}>
              <ListItemIcon>
                <RestoreIcon />
              </ListItemIcon>
              <ListItemText
                primary="Восстановление архива"
                secondary="Восстановить из .zip"
              />
            </ListItem>

            {/* <ListItem button="true" onClick={handleReset}>
              <ListItemIcon>
                <RestartAltIcon />
              </ListItemIcon>
              <ListItemText
                primary="Сбросить настройки"
                secondary="Удаляет локальные настройки (будет подтверждение)"
              />
            </ListItem> */}
          </List>
        </Paper>

        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            О приложении
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <InfoIcon />
              </ListItemIcon>
              <ListItemText
                primary={`Версия: ${version || "неизвестно"}`}
                secondary={`Платформа: ${platform || "неизвестно"}`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Технологии"
                secondary="Electron + React + Redux + MUI + Vite"
              />
            </ListItem>
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
