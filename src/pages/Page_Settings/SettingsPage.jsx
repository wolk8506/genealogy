//SettingsPage
import React, { useEffect, useState, useContext, useRef } from "react";
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
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import ErrorIcon from "@mui/icons-material/Error";

import { ListItemSecondaryAction } from "@mui/material";

import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

import { ThemeContext } from "../../theme/ThemeContext.cjs";
import { ImportDecisionModal } from "./ImportDecisionModal";

import electronIcon from "../../img/electron-logo.svg";
import reactIcon from "../../img/react-icon.svg";
import reduxIcon from "../../img/redux-logo.svg";
import muiIcon from "../../img/material-ui-logo.svg";
import viteIcon from "../../img/vitejs-logo.svg";
import ExportConfirmModal from "../../components/ExportConfirmModal";
import { exportPeopleToZip } from "../utils/exportToZip";

export default function SettingsPage() {
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saveDone, setSaveDone] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingOpen, setIsImportingOpen] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importStatus, setImportStatus] = useState("");

  const [modalToAdd, setModalToAdd] = useState([]);

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
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [archiveProgress, setArchiveProgress] = useState({
    percent: 0,
    processedBytes: 0,
    totalBytes: 0,
    currentFile: "",
    filePercent: 0,
    currentOwner: null,
  });

  const [confirmConflicts, setConfirmConflicts] = useState([]);
  const confirmResolveRef = useRef(null);
  // const [exportPath, setExportPath] = useState("");

  // Подписка на событие от main, ставим в useEffect
  useEffect(() => {
    const handler = (event, data) => {
      // data: { conflicts, toAdd, toUpdate }
      const toAddFromMain = data.toAdd || [];
      const toUpdateFromMain = data.toUpdate || [];
      setModalToAdd(toAddFromMain.map((id) => ({ id }))); // если ImportDecisionModal ожидает объекты
      setConfirmConflicts(toUpdateFromMain); // используем для отображения обновлений
      setImportConfirmOpen(true);

      confirmResolveRef.current = (response) => {
        window.electron.ipcRenderer.send("import:confirm-response", response);
        setImportConfirmOpen(false);
        setConfirmConflicts([]);
        setModalToAdd([]);
        confirmResolveRef.current = null;
      };
    };

    window.electron.ipcRenderer.on("import:confirm", handler);
    return () => {
      window.electron.ipcRenderer.removeListener("import:confirm", handler);
    };
  }, []);

  // Функция, которую передаём в ImportDecisionModal как onSelect
  const handleImportDecision = (response) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(response);
    } else {
      window.electron.ipcRenderer.send("import:confirm-response", response);
      setImportConfirmOpen(false);
      setConfirmConflicts([]);
    }
  };

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
      // console.log("👀 Update available:", info);
      setUpdateInfo(info);
    });

    // 3) Подписаться на прогресс
    window.updater.onProgress((pct) => {
      // console.log("📊 Progress:", pct);
      setProgress(pct);
    });

    // 4) Подписаться на завершение
    window.updater.onDownloaded((path) => {
      // console.log("✅ Downloaded to:", path);
      setDownloaded(true);
      setFilePath(path);
    });

    // 5) Снять все подписки при unmount
    return () => window.updater.removeAll();
  }, []);

  useEffect(() => {
    const onProgressHandler = (data) => {
      if (!data || typeof data !== "object") return;
      const {
        phase = "writing",
        percent = 0,
        processedBytes = 0,
        totalBytes = 0,
        totalFiles = 0,
        processedFiles = 0,
        currentFile = "",
        filePercent = 0,
        message = "",
      } = data;

      setArchiveProgress({
        phase,
        percent,
        processedBytes,
        totalBytes,
        totalFiles,
        processedFiles,
        currentFile,
        filePercent,
        message,
      });
    };

    let off = null;
    if (window.archiveAPI?.onProgress) {
      off = window.archiveAPI.onProgress(onProgressHandler);
    } else if (window.electron?.ipcRenderer) {
      const wrapped = (_, d) => onProgressHandler(d);
      window.electron.ipcRenderer.on("archive:progress", wrapped);
      off = () =>
        window.electron.ipcRenderer.removeListener("archive:progress", wrapped);
    }

    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  useEffect(() => {
    window.appAPI?.getVersion?.().then(setVersion);
    window.appAPI?.getPlatform?.().then(setPlatform);
  }, []);

  // useEffect(() => {
  //   window.archiveAPI.onProgress(({ percent, files }) => {
  //     setProgressArhive(percent); // отдельный state, например setArchiveProgress
  //   });
  // }, []);

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

      // в handleExportAll при вызове exportPeopleToZip
      const archivePath = await exportPeopleToZip({
        people: allPeople,
        defaultFilename: `Genealogy_all_${Date.now()}.zip`,
        onProgress: (payload) => {
          if (typeof payload === "number") {
            setProgressArhive(payload);
            setArchiveProgress((prev) => ({ ...prev, percent: payload }));
            return;
          }
          const pct = typeof payload.percent === "number" ? payload.percent : 0;
          // если пришла фаза writing и pct === 0 — явно сбрасываем
          if (payload.phase === "writing" && pct === 0) {
            setArchiveProgress((prev) => ({ ...prev, ...payload, percent: 0 }));
            setProgressArhive(0);
            return;
          }
          setArchiveProgress((prev) => ({ ...prev, ...payload, percent: pct }));
          if (typeof pct === "number") setProgressArhive(pct);
        },

        onStatus: (s) => setExportStatus(s),
        onError: (errMsg) => {
          setExportStatus(errMsg);
          setExportError(true);
        },
      });

      if (!archivePath) {
        setIsSaving(false);
        return;
      }

      setExportPath(archivePath);
      setSaveDone(true);
      setExportStatus("✅ Архив сохранён...");

      setTimeout(() => {
        // setIsSaving(false);
        setSaveDone(false);
        setProgressArhive(0);
        // сбрасываем фазу, чтобы при следующем экспорте всё началось заново
        setArchiveProgress({
          phase: "done",
          percent: 0,
          processedBytes: 0,
          totalBytes: 0,
          currentFile: "",
          filePercent: 0,
          currentOwner: null,
        });
      }, 1500);
    } catch (err) {
      console.error("handleExportAll error:", err);
      setExportStatus(`❌ Ошибка: ${err?.message || "Неизвестно"}`);
      setIsSaving(false);
      setExportError(true);
    }
  };

  // вычисление перед return или внутри компонента
  const percentValue = (() => {
    const bytePct = archiveProgress?.percent ?? null;
    if (typeof bytePct === "number" && bytePct > 0)
      return Math.max(0, Math.min(100, bytePct));
    // если нет байтового процента, используем подготовочный прогресс (по файлам)
    if (archiveProgress?.totalFiles) {
      return Math.round(
        ((archiveProgress.processedFiles ?? 0) / archiveProgress.totalFiles) *
          100
      );
    }
    // fallback на старый стейт
    return progressArhive ?? 0;
  })();

  // ~ Восстановление данных

  //! 1.1

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setIsImportingOpen(true);
      setImportStatus("📥 Выберите ZIP для импорта...");
      setImportProgress((prev) => ({
        ...prev,
        current: 0,
        total: 0,
      }));
      const zipPath = await window.dialogAPI.chooseOpenZip();
      if (!zipPath) {
        setImportStatus("Импорт отменён");
        setIsImporting(false);
        setIsImportingOpen(false);
        return;
      }

      setImportStatus(`📦 Начинаю импорт: ${zipPath}`);
      // подписка на прогресс
      const onProgress = (data) => {
        // console.log("data", data);
        setImportProgress((prev) => ({
          ...prev,
          current: data.current || prev.current,
          total: data.total || prev.total,
        }));
        setImportStatus(data.message || "");
        // можно хранить percent в отдельном state, если нужно
      };
      window.importAPI.onProgress(onProgress);

      const result = await window.importAPI.importZip(zipPath);
      if (result && result.ok) {
        const { report } = result.report ? result : result; // result может содержать report
        // показываем итоговый отчёт в модальном окне или логируем
        const summary = `Импорт завершён: всего ${
          (result.report?.totalPersons ?? report?.totalPersons) || 0
        }, успешно ${
          (result.report?.success ?? report?.success) || 0
        }, с ошибками ${(result.report?.failed ?? report?.failed) || 0}`;
        setImportStatus(summary);
        // можно показать детальный лог: result.report.perPerson
        // console.log("Import report", result.report || report);
      } else {
        setImportStatus(`❌ Ошибка: ${result?.error || "Неизвестно"}`);
      }
    } catch (err) {
      console.error("Ошибка импорта", err);
      setImportStatus(`❌ Ошибка: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <ImportDecisionModal
        open={importConfirmOpen}
        summary={`Найдено конфликтов: ${confirmConflicts.length}`}
        toAdd={modalToAdd} // теперь содержит объекты {id}
        toUpdate={confirmConflicts.map((id) => ({ id }))}
        onSelect={handleImportDecision}
      />

      {/* Модалка экспорта — использует confirmOpen */}

      <ExportConfirmModal
        open={confirmOpen}
        allPeople={true}
        onCancel={() => {
          setConfirmOpen(false);
          setExportPath("");
          setExportStatus("Подготовка архива...");
          setProgressArhive(0);
          setArchiveProgress({
            percent: 0,
            processedBytes: 0,
            totalBytes: 0,
            currentFile: "",
            filePercent: 0,
            currentOwner: null,
          });
        }}
        onConfirm={handleExportAll}
      />

      <Backdrop
        open={isSaving}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          p: 2,
        }}
      >
        {exportError ? (
          <>
            <ErrorIcon sx={{ fontSize: 60, color: "red" }} />
            <Box
              mt={2}
              sx={{ textAlign: "center", width: "100%", maxWidth: 600 }}
            >
              <Typography variant="h6" color="inherit">
                {exportStatus}
              </Typography>
              <Button sx={{ mt: 3 }} onClick={() => setIsSaving(false)}>
                Закрыть
              </Button>
            </Box>
          </>
        ) : saveDone ? (
          <Box
            mt={0}
            sx={{ textAlign: "center", width: "100%", maxWidth: 600 }}
          >
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Архив сохранён!
              </Typography>
              {exportPath && (
                <>
                  <Typography variant="body2" color="inherit" sx={{ mt: 1 }}>
                    Сохранено: {exportPath}
                  </Typography>
                  <Button sx={{ mt: 3 }} onClick={() => setIsSaving(false)}>
                    Закрыть
                  </Button>
                </>
              )}
            </Box>
          </Box>
        ) : (
          <>
            {archiveProgress?.phase !== "done" && (
              <CircularProgress sx={{ mb: 2 }} color="inherit" />
            )}
            <Box
              mt={0}
              sx={{ textAlign: "center", width: "100%", maxWidth: 600 }}
            >
              {archiveProgress?.phase !== "done" && (
                <Typography variant="h6" color="inherit">
                  {exportStatus}
                </Typography>
              )}
              {/* {console.log(archiveProgress?.phase)}
              {console.log(
                archiveProgress?.phase === ("preparation" || "writing")
              )} */}
              {/* {console.log(archiveProgress)} */}
              {/* --- Показать фазу подготовки или запись архива --- */}
              {archiveProgress?.phase !== "done" ? (
                <Box sx={{ mt: 2, width: "100%" }}>
                  <Typography variant="body2" color="inherit" sx={{ mb: 1 }}>
                    Выполнено: {percentValue}
                    {"%"}
                    {/* {archiveProgress.processedBytes} */}
                    {/* {Math.round(
                      (archiveProgress?.processedFiles /
                        Math.max(1, archiveProgress?.totalFiles)) *
                        100
                    )} */}
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={percentValue || 0}
                  />
                  {archiveProgress?.phase !== "writing2" ? (
                    <Typography
                      variant="caption"
                      color="inherit"
                      sx={{ display: "block", mt: 1 }}
                    >
                      {archiveProgress.message ||
                        `Подготовлено ${archiveProgress.processedFiles ?? 0}`}
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      color="inherit"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Текущий файл: {archiveProgress.currentFile}
                      {/* {archiveProgress.filePercent}% */}
                    </Typography>
                  )}
                </Box>
              ) : (
                <>
                  <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen" }} />
                  <Box mt={2}>
                    <Typography variant="h6" color="inherit">
                      Архив сохранён!
                    </Typography>
                    {exportPath && (
                      <>
                        <Typography
                          variant="body2"
                          color="inherit"
                          sx={{ mt: 1 }}
                        >
                          Сохранено: {exportPath}
                        </Typography>
                        <Button
                          sx={{ mt: 3 }}
                          onClick={() => setIsSaving(false)}
                        >
                          Закрыть
                        </Button>
                      </>
                    )}
                  </Box>
                </>
              )}
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
        // open={isImporting}
        open={isImportingOpen}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          p: 2,
        }}
      >
        {isImporting ? (
          <>
            <CircularProgress sx={{ mb: 2 }} color="inherit" />
            <Box
              mt={2}
              sx={{ textAlign: "center", width: "100%", maxWidth: 600 }}
            >
              <Typography variant="h6" color="inherit">
                Восстановление архива...
              </Typography>
              <Box sx={{ mt: 2, width: "100%" }}>
                <Typography variant="body2" color="inherit" sx={{ mb: 1 }}>
                  Выполнено: {importProgress.current} из {importProgress.total}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.round(
                    (importProgress.current /
                      Math.max(1, importProgress.total)) *
                      100
                  )}
                />

                {/* //------------------------- */}
                <Typography
                  variant="caption"
                  color="inherit"
                  sx={{ display: "block", mt: 1 }}
                >
                  {importStatus}
                </Typography>
                {/* <Typography variant="body2" color="inherit">
              {importProgress.current} из {importProgress.total}
            </Typography> */}
                {/* {
                  <Button
                    sx={{ mt: 3 }}
                    onClick={() => setIsImportingOpen(false)}
                  >
                    Закрыть
                  </Button>
                } */}
              </Box>
            </Box>
          </>
        ) : (
          <Box
            mt={0}
            sx={{ textAlign: "center", width: "100%", maxWidth: 600 }}
          >
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen" }} />
            <Box mt={2}>
              <Typography variant="h6" color="inherit">
                Архив восстановлен!
              </Typography>

              <Button sx={{ mt: 3 }} onClick={() => setIsImportingOpen(false)}>
                Закрыть
              </Button>
            </Box>
          </Box>
        )}
      </Backdrop>

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
        {/* //-------------------------------------------------------------------------------------------- */}
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
                    <Alert
                      severity="error"
                      sx={{
                        borderRadius: "15px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
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
                    <Box component="span" mt={2} sx={{ width: "100%" }}>
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
                            // console.log("👆 Download click, info:", updateInfo);
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
                      onClick={() => {
                        window.updater.install(filePath);
                        window.electronAPI.quitApp(); // вызвать закрытие
                      }}
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
            </ListItem>
          </List>
        </Paper>
      </Stack>
    </Box>
  );
}
