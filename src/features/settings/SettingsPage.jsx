import React, { useEffect, useState, useContext } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Switch,
  Radio,
  Button,
  Alert,
  LinearProgress,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import { Backdrop, CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RestoreIcon from "@mui/icons-material/Restore";
import TuneIcon from "@mui/icons-material/Tune";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import ErrorIcon from "@mui/icons-material/Error";

import { ListItemSecondaryAction } from "@mui/material";

import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

import { ThemeContext } from "../../context/ThemeContext.cjs";
import JSZip from "jszip";
import { Buffer } from "buffer";
import { ImportDecisionModal } from "./ImportDecisionModal";

import electronIcon from "../../img/electron-logo.svg";
import reactIcon from "../../img/react-icon.svg";
import reduxIcon from "../../img/redux-logo.svg";
import muiIcon from "../../img/material-ui-logo.svg";
import viteIcon from "../../img/vitejs-logo.svg";
import ExportConfirmModal from "../people/ExportConfirmModal";
import { exportPeopleToZip } from "../people/utils/exportToZip";

export default function SettingsPage() {
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
  const { auto, setAuto, userPref, setUserPref } = useContext(ThemeContext);
  const [exportStatus, setExportStatus] = useState("Подготовка архива...");
  const [exportError, setExportError] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [updateInfo, setUpdateInfo] = useState(null);
  const [progressArhive, setProgressArhive] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [filePath, setFilePath] = useState("");

  const [error, setError] = useState(null);

  useEffect(() => {
    // подписываемся на канал ошибки
    window.updater.onError((msg) => setError(msg));
    return () => {
      window.updater.removeAllListeners?.("update:error");
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    onDownload(updateInfo);
  };

  useEffect(() => {
    // 1) Запросить проверку
    window.updater.check();

    // 2) Подписаться на ответ
    window.updater.onAvailable((info) => {
      console.log("👀 Update available:", info);
      setUpdateInfo(info);
    });

    // 3) Подписаться на прогресс
    window.updater.onProgress((pct) => {
      console.log("📊 Progress:", pct);
      setProgress(pct);
    });

    // 4) Подписаться на завершение
    window.updater.onDownloaded((path) => {
      console.log("✅ Downloaded to:", path);
      setDownloaded(true);
      setFilePath(path);
    });

    // 5) Снять все подписки при unmount
    return () => window.updater.removeAll();
  }, []);

  useEffect(() => {
    window.appAPI?.getVersion?.().then(setVersion);
    window.appAPI?.getPlatform?.().then(setPlatform);
  }, []);

  useEffect(() => {
    window.archiveAPI.onProgress(({ percent, files }) => {
      setProgress(percent); // отдельный state, например setArchiveProgress
    });
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

  const handleDialogExport = async () => {
    setConfirmOpen(true);
  };

  const handleExportAll = async () => {
    setConfirmOpen(false);
    setIsSaving(true);
    setSaveDone(false);
    setProgressArhive(0);
    setExportError(false);
    setExportStatus("Подготовка архива...");

    try {
      const allPeople = await window.peopleAPI.getAll();
      const archivePath = await exportPeopleToZip({
        people: allPeople,
        filename: `Genealogy_all_${Date.now()}.zip`,
        onProgress: setProgressArhive,
        onStatus: setExportStatus,
        onError: (msg) => {
          setExportStatus(msg);
          setExportError(true);
        },
      });

      if (!archivePath) return;

      setSaveDone(true);
      setExportStatus("✅ Архив сохранён");
      setTimeout(() => {
        setIsSaving(false);
        setSaveDone(false);
        setProgressArhive(0);
      }, 1500);
    } catch (err) {
      setExportStatus(`❌ Ошибка: ${err.message || "Неизвестно"}`);
      setIsSaving(false);
      setExportError(true);
    }
  };
  // ~ Восстановление данных
  //! 1

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

      {/* Export confirmation */}
      <ExportConfirmModal
        open={confirmOpen}
        allPeople={true}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleExportAll}
      />

      <Backdrop
        open={isSaving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
        }}
      >
        {exportError ? (
          <>
            <ErrorIcon sx={{ fontSize: 60, color: "red" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                {exportStatus}
              </Typography>
            </Box>
          </>
        ) : saveDone ? (
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
                {exportStatus} {progressArhive > 0 && `${progressArhive}%`}
              </Typography>
            </Box>
          </>
        )}
        {exportError && (
          <Button
            variant="contained"
            onClick={() => {
              setIsSaving(false);
              setExportError(false);
              setExportStatus("");
              setProgressArhive(0);
            }}
            sx={{ mt: 2 }}
          >
            Закрыть
          </Button>
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

      {/* <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center" }}
      >
        <TuneIcon color="primary" fontSize="large" sx={{ marginRight: 0.5 }} />{" "}
        Настройки
      </Typography> */}
      <Stack spacing={3}>
        <Paper elevation={2} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            Общие
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Paper sx={{ borderRadius: 3, mb: 2 }}>
            <List disablePadding>
              {/* Переключатель системной темы */}
              <ListItem>
                <ListItemIcon>
                  <Brightness4Icon />
                </ListItemIcon>
                <ListItemText primary="Следовать за системной темой" />
                <Switch
                  edge="end"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />
              </ListItem>

              {!auto && (
                <>
                  <Divider component="li" sx={{ my: 1 }} />

                  {/* Вложенный список */}
                  <List component="div" disablePadding>
                    <ListItem
                      button="true"
                      onClick={() => setUserPref("light")}
                      selected={userPref === "light"}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>
                        <LightModeIcon />
                      </ListItemIcon>
                      <ListItemText primary="Светлая" />
                      <Radio
                        edge="end"
                        value="light"
                        checked={userPref === "light"}
                        onChange={() => setUserPref("light")}
                      />
                    </ListItem>

                    <ListItem
                      button="true"
                      onClick={() => setUserPref("dark")}
                      selected={userPref === "dark"}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>
                        <DarkModeIcon />
                      </ListItemIcon>
                      <ListItemText primary="Тёмная" />
                      <Radio
                        edge="end"
                        value="dark"
                        checked={userPref === "dark"}
                        onChange={() => setUserPref("dark")}
                      />
                    </ListItem>
                  </List>
                </>
              )}
            </List>
          </Paper>
          <List>
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
            <ListItem button="true" onClick={handleDialogExport}>
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
          </List>
        </Paper>

        <Paper elevation={2} sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>
            О приложении
          </Typography>
          <Divider sx={{ mb: 2 }} />
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

            {/* Ошибка */}
            {error && (
              <ListItem>
                <ListItemIcon>
                  {/* Можно выбрать иконку ошибки */}
                  <InfoIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Alert severity="error">
                      Ошибка загрузки: {error}
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleRetry}
                        sx={{ ml: 2 }}
                      >
                        Повторить
                      </Button>
                    </Alert>
                  }
                />
              </ListItem>
            )}

            {/* Проверка обновлений */}
            {!updateInfo && !error && (
              <ListItem>
                <ListItemIcon>
                  <InfoIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Проверяю обновления…"
                  secondary={
                    <Box mt={2} sx={{ width: "100%" }}>
                      <LinearProgress />
                    </Box>
                  }
                />
              </ListItem>
            )}

            {updateInfo && !downloaded && (
              <ListItem>
                <ListItemIcon>
                  <CloudDownloadIcon />
                </ListItemIcon>
                {updateInfo?.version === version ? (
                  <ListItemText
                    primary={`Найдена версия ${updateInfo?.version}`}
                    secondary={"Обновление не требуется"}
                  />
                ) : (
                  <ListItemText
                    primary={`Найдена версия ${updateInfo?.version}`}
                    secondary={
                      progress > 0 ? (
                        `Загрузка: ${progress}%`
                      ) : (
                        <Button
                          // variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => {
                            console.log("👆 Download click, info:", updateInfo);
                            window.updater.download(updateInfo);
                          }}
                        >
                          Скачать
                        </Button>
                      )
                    }
                  />
                )}
              </ListItem>
            )}

            {downloaded && (
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Обновление загружено"
                  secondary={
                    <Button
                      // variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => window.updater.install(filePath)}
                    >
                      Установить
                    </Button>
                  }
                />
              </ListItem>
            )}

            <ListItem>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText
                primary="Технологии"
                secondaryTypographyProps={{ component: "div" }}
                secondary={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                      mt: 0.5,
                    }}
                  >
                    {[
                      { icon: electronIcon, name: "Electron" },
                      { icon: reactIcon, name: "React" },
                      { icon: reduxIcon, name: "Redux" },
                      { icon: muiIcon, name: "MUI" },
                      { icon: viteIcon, name: "Vite" },
                    ].map((tech, i, arr) => (
                      <Box
                        key={tech.name}
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        <Box
                          component="img"
                          src={tech.icon}
                          alt={tech.name}
                          sx={{ width: 20, height: 20, mr: 1 }}
                        />
                        <Typography variant="caption" noWrap>
                          {tech.name}
                        </Typography>

                        {i < arr.length - 1 && (
                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{
                              borderColor: "divider",
                              height: 16,
                              ml: 2,
                              mr: 1,
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                }
              />
              {/* <img src={reactIcon} alt="React" width={32} /> */}
            </ListItem>
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
