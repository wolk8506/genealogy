import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  List,
  ListItem,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Grid,
  Card,
  Divider,
  TextField,
  Alert,
  Chip,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  RestoreFromTrash as RestoreIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import { exportPeopleToZip } from "../utils/exportToZip";
import { useTheme } from "@mui/material/styles";
import ErrorIcon from "@mui/icons-material/Error";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PieChartIcon from "@mui/icons-material/PieChart";
import SaveIcon from "@mui/icons-material/Save";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { alpha } from "@mui/material/styles";
import { ImportDecisionInline } from "./ImportDecisionInline";
import CustomSwitch from "../../components/CustomSwitch";

import { keyframes } from "@mui/system";

// Анимация блеска
const shimmer = keyframes`
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(150%) skewX(-20deg); }
`;

export const StatisticCard = ({ cardStyle, loadAll }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const lastUpdateRef = useRef(0);

  const [storageStats, setStorageStats] = useState(null);

  const getDefaultArchiveName = () => {
    const now = new Date();
    const stamp = now
      .toLocaleString("sv-SE", { hour12: false })
      .replace(/[\s:]/g, "-")
      .replace(",", "_");
    return `Genealogy_Backup_${stamp}`;
  };

  // --- Состояние подготовки бэкапа ---
  const [backupSetupOpen, setBackupSetupOpen] = useState(false);
  const [backupArchiveName, setBackupArchiveName] = useState(
    getDefaultArchiveName(),
  );
  const [backupPhotoFolders, setBackupPhotoFolders] = useState({
    original: false,
    thumbs: false,
    webp: true,
  });
  const [backupMaintenance, setBackupMaintenance] = useState(false);

  // --- Состояние подготовки восстановления ---
  const [importSetupOpen, setImportSetupOpen] = useState(false);
  const [importZipPath, setImportZipPath] = useState("");
  const [importArchiveMeta, setImportArchiveMeta] = useState(null);
  const [importPhotoFolders, setImportPhotoFolders] = useState([]);

  // --- Состояния экспорта (Бэкапа) ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [exportStatus, setExportStatus] = useState("Подготовка архива...");
  const [exportError, setExportError] = useState(false);
  const [exportPath, setExportPath] = useState("");
  const [archiveProgress, setArchiveProgress] = useState({
    phase: "idle",
    percent: 0,
    processedFiles: 0,
    totalFiles: 0,
    currentFile: "",
    message: "",
    currentOwner: null,
  });

  // --- Состояния импорта ---
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingOpen, setIsImportingOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState(false); // Добавлено для фикса ошибки
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
    processedFiles: 0, // Добавить это
    totalFiles: 0, // Добавить это
    percent: 0, // Добавить это
  });
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [confirmConflicts, setConfirmConflicts] = useState([]);
  const [modalToAdd, setModalToAdd] = useState([]);
  const confirmResolveRef = useRef(null);

  // --- Состояния диска ---
  const [totalSize, setTotalSize] = useState(null);
  const [diskInfo, setDiskInfo] = useState({ total: 0, free: 0 });

  // Основные переменные для расчетов
  const total = diskInfo.total || 1;
  const free = diskInfo.free;
  const library = parseFloat(totalSize) || 0;
  const other = Math.max(0, total - free - library);

  const libPct = (library / total) * 100;
  const otherPct = (other / total) * 100;

  const formatSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
  };

  const formatStorage = (mb) => {
    const val = parseFloat(mb);
    if (!val || isNaN(val)) return "0 GB";
    if (val < 1024) return `${val.toFixed(1)} MB`;
    return `${(val / 1024).toFixed(1)} GB`;
  };

  // --- Эффекты ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const diskData = await window.electronAPI.getDiskUsage();
        if (diskData) setDiskInfo(diskData);

        const detailedData = await window.appAPI.getDetailedStorageStats();
        if (detailedData) setStorageStats(detailedData);
      } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event, data) => {
      setModalToAdd(data.toAdd?.map((id) => ({ id })) || []);
      setConfirmConflicts(data.toUpdate || []);
      setIsImporting(false);
      setImportConfirmOpen(true);

      confirmResolveRef.current = (response) => {
        window.electron.ipcRenderer.send("import:confirm-response", response);
        setImportConfirmOpen(false);
        setIsImporting(true);
      };
    };

    window.electron.ipcRenderer.on("import:confirm", handler);
    return () => {
      window.electron.ipcRenderer.removeListener("import:confirm", handler);
    };
  }, []);

  useEffect(() => {
    if (!window.importAPI?.onProgress) return;
    const removeListener = window.importAPI.onProgress((data) => {
      const now = Date.now();
      // Обновляем чаще или если это финальный файл
      if (now - lastUpdateRef.current > 50 || data.current === data.total) {
        lastUpdateRef.current = now;
        setImportProgress((prev) => ({
          current: data.current ?? prev.current,
          total: data.total ?? prev.total,
          // ДОБАВЛЯЕМ НОВЫЕ ПОЛЯ:
          processedFiles: data.processedFiles ?? prev.processedFiles,
          totalFiles: data.totalFiles ?? prev.totalFiles,
          percent: data.percent ?? prev.percent,
        }));
        if (data.message) setImportStatus(data.message);
      }
    });
    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, []);

  useEffect(() => {
    fetchTotalSize();
    window.appAPI.onFolderSizeUpdated?.(() => fetchTotalSize());
  }, []);

  useEffect(() => {
    let lastUpdate = 0;
    const onProgressHandler = (data) => {
      if (!data || typeof data !== "object") return;
      const now = Date.now();
      if (now - lastUpdate > 100 || data.phase !== archiveProgress.phase) {
        lastUpdate = now;
        setArchiveProgress((prev) => {
          if (
            prev.percent === data.percent &&
            prev.processedFiles === data.processedFiles &&
            prev.phase === data.phase
          ) {
            return prev;
          }
          return {
            ...prev,
            ...data,
            percent:
              typeof data.percent === "number" ? data.percent : prev.percent,
          };
        });
      }
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
  }, [archiveProgress.phase]);

  const handleImportDecision = (response) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(response);
    }
  };

  const handleOpenArchivePath = async () => {
    if (!exportPath) return;
    try {
      await window.appAPI.revealPath?.(exportPath);
    } catch (error) {
      console.warn("Не удалось открыть путь архива", error);
    }
  };

  const openBackupSetup = () => {
    setBackupArchiveName(getDefaultArchiveName());
    setBackupPhotoFolders({ original: true, thumbs: false, webp: false });
    setBackupMaintenance(false);
    setBackupSetupOpen(true);
  };

  const closeBackupSetup = () => setBackupSetupOpen(false);

  const handleExportAll = async () => {
    const selectedPhotoFolders = Object.entries(backupPhotoFolders)
      .filter(([, checked]) => Boolean(checked))
      .map(([folder]) => folder);

    if (!selectedPhotoFolders.includes("original") && !selectedPhotoFolders.includes("webp")) {
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message: "Выберите original или webp для архивации фото",
        type: "warning",
        category: "dataManagement",
      });
      return;
    }

    setBackupSetupOpen(false);
    setIsSaving(true);
    setSaveDone(false);
    setExportError(false);
    setExportStatus("Подготовка файлов...");
    setArchiveProgress({
      phase: "idle",
      percent: 0,
      processedFiles: 0,
      totalFiles: 0,
    });

    try {
      const basePath = (await window.appAPI.getDataPath?.()) || "";
      const allPeople = await window.peopleAPI.getAll();
      const allExternal = (await window.externalAPI?.getAll?.()) || [];

      const archivePath = await exportPeopleToZip({
        people: allPeople,
        basePath: basePath,
        defaultFilename: `${backupArchiveName}.zip`,
        archiveName: backupArchiveName,
        selectedPhotoFolders,
        runMaintenanceBeforeExport: backupMaintenance,
        onProgress: (payload) => {
          setArchiveProgress((prev) => ({
            ...prev,
            ...payload,
            currentOwner: payload.message,
            currentFile: payload.currentFile ?? prev.currentFile,
            processedFiles: payload.processedFiles ?? prev.processedFiles,
            totalFiles: payload.totalFiles ?? prev.totalFiles,
          }));
        },
        onStatus: setExportStatus,
      });

      if (!archivePath) {
        setIsSaving(false);
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Бэкап",
          message: `Отменено пользователем`,
          type: "warning",
          category: "dataManagement",
        });
        return;
      }

      setArchiveProgress((prev) => ({ ...prev, phase: "done", percent: 100 }));
      setExportPath(archivePath);
      setSaveDone(true);

      setExportStatus("✅ Полный архив сохранён");
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message:
          allExternal.length > 0
            ? `✅ Архив сохранён (родственники + справочник: ${allExternal.length})`
            : `✅ Полный архив сохранён`,
        type: "success",
        category: "dataManagement",
      });
      fetchTotalSize();
    } catch (e) {
      setExportError(true);
      setExportStatus("Ошибка: " + e.message);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message: "Ошибка: " + e.message,
        type: "error",
        category: "dataManagement",
      });
    }
  };

  const resetImportSetup = () => {
    setImportSetupOpen(false);
    setImportZipPath("");
    setImportArchiveMeta(null);
    setImportPhotoFolders([]);
  };

  const handleImportAll = async () => {
    try {
      setImportError(false);
      const zipPath = await window.dialogAPI.chooseOpenZip();
      if (!zipPath) {
        return;
      }
      const archiveInfo = await window.importAPI.inspect(zipPath);
      if (!archiveInfo?.isOurArchive) {
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Импорт",
          message: "Архив не распознан как архив этого приложения",
          type: "error",
          category: "dataManagement",
        });
        return;
      }

      const availableFolders = Array.isArray(archiveInfo.availablePhotoFolders)
        ? archiveInfo.availablePhotoFolders
        : [];
      const presetFolders = Array.isArray(archiveInfo.selectedPhotoFolders)
        ? archiveInfo.selectedPhotoFolders
        : [];
      const defaultFolders =
        presetFolders.length > 0
          ? presetFolders
          : availableFolders.length > 0
            ? availableFolders
            : ["original", "webp"];

      setImportZipPath(zipPath);
      setImportArchiveMeta(archiveInfo);
      setImportPhotoFolders(defaultFolders);
      setImportSetupOpen(true);
    } catch (err) {
      setImportError(true);
      setImportStatus(`❌ Ошибка: ${err.message}`);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: `❌ Ошибка: ${err.message}`,
        type: "error",
        category: "dataManagement",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunImport = async () => {
    if (!importZipPath) return;

    const selectedFolders = importPhotoFolders.filter(Boolean);
    setImportSetupOpen(false);
    setIsImporting(true);
    setIsImportingOpen(true);
    setImportStatus("📥 Восстановление архива...");

    try {
      const importResult = await window.importAPI.importZip(importZipPath, {
        photoFolders: selectedFolders,
      });

      if (importResult?.cancelled) {
        setImportStatus("Импорт отменён");
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Импорт",
          message: "Импорт отменён пользователем",
          type: "warning",
          category: "dataManagement",
        });
        return;
      }

      if (loadAll) loadAll();

      const externalCount = importResult?.report?.externalImported || 0;
      const externalFiles = importResult?.report?.externalFiles || 0;
      const externalError = importResult?.report?.errors?.find(
        (e) => e.scope === "external",
      )?.error;
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: externalError
          ? `Импорт завершён с ошибкой справочника: ${externalError}`
          : externalCount > 0
            ? `Импорт выполнен. Справочник: ${externalCount} записей${externalFiles ? `, ${externalFiles} файлов` : ""}.`
            : "Импорт из ZIP архива выполнен успешно",
        type: externalError ? "warning" : "success",
        category: "dataManagement",
      });
      resetImportSetup();
    } catch (err) {
      setImportError(true);
      setImportStatus(`❌ Ошибка: ${err.message}`);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: `❌ Ошибка: ${err.message}`,
        type: "error",
        category: "dataManagement",
      });
    } finally {
      setIsImporting(false);
    }
  };

  function fetchTotalSize() {
    window.appAPI.getFolderSize().then(setTotalSize);
  }

  const percentValue = (() => {
    if (saveDone || archiveProgress.phase === "done") return 100;
    if (archiveProgress.phase && archiveProgress.phase.startsWith("writing")) {
      return Math.round(archiveProgress.percent || 0);
    }
    if (archiveProgress.totalFiles > 0) {
      return Math.round(
        ((archiveProgress.processedFiles || 0) / archiveProgress.totalFiles) *
        100,
      );
    }
    return Math.round(archiveProgress.percent || 0);
  })();

  function StatRow({ icon, label, value, detailList, hoverLabel }) {
    const content = (
      <ListItem disableGutters>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              p: 0.5,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </ListItem>
    );

    if (!detailList || !detailList.length) return content;

    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5, minWidth: 220 }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 1 }}>
              {hoverLabel || label}
            </Typography>
            <List dense disablePadding sx={{ m: 0 }}>
              {detailList.map((item) => (
                <ListItem key={item.label} disableGutters sx={{ py: 0.25, px: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        }
        arrow
        placement="top"
        sx={{
          "& .MuiTooltip-tooltip": {
            bgcolor: "rgba(17, 24, 39, 0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 2,
            color: "#fff",
          },
        }}
      >
        <Box>{content}</Box>
      </Tooltip>
    );
  }

  // Флаги для определения того, какой контент рендерить внутри карточки
  const showExportProcess = isSaving || saveDone || exportError;
  const showImportDecision = importConfirmOpen;
  const showImportProcess = isImportingOpen && !importConfirmOpen;
  const showBackupSetup =
    backupSetupOpen && !showExportProcess && !showImportProcess && !showImportDecision;
  const showImportSetup =
    importSetupOpen && !showExportProcess && !showImportProcess && !showImportDecision;

  // Дефолтный контент показывается только если нет ни одного активного процесса
  const showDefaultContent =
    !showExportProcess && !showImportProcess && !showImportDecision && !showBackupSetup && !showImportSetup;
  // const progressValue = Math.round(
  //   (importProgress.current / Math.max(1, importProgress.total)) * 100,
  // );
  const progressValue = importProgress.percent || 0;
  const exportPercent = percentValue || 0;
  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        // height: 469,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ШАПКА всегда видна */}
      <Box
        sx={{
          p: 2,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1.5,
        }}
      >
        <PieChartIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          {showExportProcess
            ? "Экспорт данных"
            : showBackupSetup
              ? "Параметры архива"
              : showImportSetup
                ? "Восстановление архива"
                : showImportDecision
                  ? "Подтверждение импорта" // Добавили заголовок
                  : showImportProcess
                    ? "Импорт данных"
                    : "Статистика хранилища"}
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          minHeight: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* --- ВИД: ПАРАМЕТРЫ БЭКАПА --- */}
        {showBackupSetup && (
          <Stack spacing={1.25} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Настройте имя архива, включаемые папки фото и, при необходимости,
              обслуживание базы перед упаковкой.
            </Alert>

            <TextField
              fullWidth
              label="Имя архива"
              value={backupArchiveName}
              onChange={(e) => setBackupArchiveName(e.target.value)}
              helperText={`Дата и время: ${new Date().toLocaleString("ru-RU")}`}
            />

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Фото в архиве
                </Typography>
                {[
                  ["original", "original"],
                  ["thumbs", "thumbs"],
                  ["webp", "webp"],
                ].map(([value, label]) => (
                  <Stack
                    key={value}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">{label}</Typography>
                    <CustomSwitch
                      checked={Boolean(backupPhotoFolders[value])}
                      onChange={() =>
                        setBackupPhotoFolders((prev) => ({
                          ...prev,
                          [value]: !prev[value],
                        }))
                      }
                    />
                  </Stack>
                ))}

                <Typography variant="caption" color="text.secondary">
                  Выберите хотя бы один из вариантов: original или webp.
                </Typography>
              </Stack>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Обслуживание базы
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    VACUUM + ANALYZE перед архивацией
                  </Typography>
                </Box>
                <CustomSwitch
                  checked={backupMaintenance}
                  onChange={(e) => setBackupMaintenance(e.target.checked)}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={closeBackupSetup}
                sx={{
                  height: 24,
                  borderRadius: "8px",
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleExportAll}
                disabled={
                  !backupPhotoFolders.original && !backupPhotoFolders.webp
                }
                startIcon={<SaveIcon />}
                sx={{
                  height: 24,
                  borderRadius: "8px",
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Создать архив
              </Button>
            </Stack>
          </Stack>
        )}

        {/* --- ВИД: ПАРАМЕТРЫ ВОССТАНОВЛЕНИЯ --- */}
        {showImportSetup && (
          <Stack spacing={1.75} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Проверьте архив, выберите нужные папки фото для восстановления и
              запустите импорт.
            </Alert>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Архив
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {importArchiveMeta?.archiveName || "Без имени"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {importArchiveMeta?.createdAt
                    ? `Создан: ${new Date(importArchiveMeta.createdAt).toLocaleString("ru-RU")}`
                    : "Дата создания неизвестна"}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {(importArchiveMeta?.availablePhotoFolders || []).map(
                    (folder) => (
                      <Chip key={folder} label={folder} size="small" />
                    ),
                  )}
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Восстанавливать папки фото
                </Typography>
                {[
                  ["original", "original"],
                  ["thumbs", "thumbs"],
                  ["webp", "webp"],
                ].map(([value, label]) => (
                  <Stack
                    key={value}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">{label}</Typography>
                    <CustomSwitch
                      disabled={!importArchiveMeta?.availablePhotoFolders?.includes(
                        value,
                      )}
                      checked={importPhotoFolders.includes(value)}
                      onChange={() =>
                        setImportPhotoFolders((prev) =>
                          prev.includes(value)
                            ? prev.filter((item) => item !== value)
                            : [...prev, value],
                        )
                      }
                    />
                  </Stack>
                ))}
                <Typography variant="caption" color="text.secondary">
                  Если какой-то папки нет в архиве, она просто будет пропущена.
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={resetImportSetup}
                sx={{
                  height: 24,
                  borderRadius: "8px",
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleRunImport}
                disabled={importPhotoFolders.length === 0}
                startIcon={<RestoreIcon />}
                sx={{
                  height: 24,
                  borderRadius: "8px",
                  px: 3,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Восстановить
              </Button>
            </Stack>
          </Stack>
        )}

        {/* --- СТАНДАРТНЫЙ ВИД (Статистика) --- */}
        {showDefaultContent && (
          <Stack
            justifyContent="space-between"
            sx={{ flexGrow: 1, minHeight: 0 }}
          >
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.25 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <StorageIcon
                    sx={{ fontSize: 20, color: "text.secondary", opacity: 0.8 }}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        fontSize: "0.6rem",
                        letterSpacing: 0.5,
                      }}
                    >
                      Системный том
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 800, lineHeight: 1 }}
                    >
                      {formatStorage(total)}
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "primary.main",
                      fontWeight: 800,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      px: 1,
                      py: 0.2,
                      borderRadius: 1,
                    }}
                  >
                    Занято: {(((total - free) / total) * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  height: 12,
                  width: "100%",
                  bgcolor: alpha(theme.palette.divider, 0.2),
                  borderRadius: 7,
                  overflow: "hidden",
                  display: "flex",
                  boxShadow: `inset 0 1px 3px ${alpha("#000", 0.1)}`,
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    width: `${libPct}%`,
                    bgcolor: "primary.main",
                    transition: "width 1s",
                  }}
                />
                <Box
                  sx={{
                    width: `${otherPct}%`,
                    bgcolor: alpha(theme.palette.text.disabled, 0.5),
                    borderLeft: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Stack direction="row" spacing={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        bgcolor: "primary.main",
                        mt: 0.5,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          color: "text.secondary",
                        }}
                      >
                        Файлы библиотеки
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatStorage(library)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Stack direction="row" spacing={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        bgcolor: alpha(theme.palette.text.disabled, 0.8),
                        mt: 0.5,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          color: "text.secondary",
                        }}
                      >
                        Система и кэш
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatStorage(total - free - library)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Stack direction="row" spacing={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        bgcolor: alpha(theme.palette.divider, 0.8),
                        mt: 0.5,
                        border: "1px solid divider",
                      }}
                    />
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          lineHeight: 1.1,
                          color: "text.secondary",
                        }}
                      >
                        Доступно (прибл.)
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 800,
                          color: free < 10240 ? "error.main" : "inherit",
                        }}
                      >
                        {formatStorage(free)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ borderStyle: "dashed" }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 900, color: "primary.main", ml: 1 }}
                >
                  Медиа файлы
                </Typography>
                <List
                  data-density="compact"
                  sx={{ "& .MuiListItem-root": { px: 0.75, py: 0.35 } }}
                >
                  <StatRow
                    icon={
                      <CameraAltIcon sx={{ fontSize: 18 }} color="primary" />
                    }
                    label="Оригиналы"
                    value={formatSize(storageStats?.original || 0)}
                  />
                  <StatRow
                    icon={
                      <PhotoSizeSelectLargeIcon
                        sx={{ fontSize: 18 }}
                        color="action"
                      />
                    }
                    label="Сжатые (WebP)"
                    value={formatSize(storageStats?.webp || 0)}
                  />
                  <StatRow
                    icon={
                      <PhotoLibraryIcon
                        sx={{ fontSize: 18 }}
                        color="disabled"
                      />
                    }
                    label="Превью (Thumbs)"
                    value={formatSize(storageStats?.thumbs || 0)}
                  />
                </List>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 900, color: "secondary.main", ml: 1 }}
                >
                  Инфо и БД
                </Typography>
                <List
                  data-density="compact"
                  sx={{ "& .MuiListItem-root": { px: 0.75, py: 0.35 } }}
                >
                  <StatRow
                    icon={
                      <DescriptionIcon
                        sx={{ fontSize: 18 }}
                        color="secondary"
                      />
                    }
                    label="Биографии (BIO)"
                    value={formatSize(storageStats?.bio || 0)}
                  />
                  <StatRow
                    icon={<StorageIcon sx={{ fontSize: 18 }} color="success" />}
                    label="База данных"
                    value={formatSize(
                      Math.max(
                        0,
                        (storageStats?.db || 0) +
                          (storageStats?.sqlite || 0) -
                          (storageStats?.externalJson || 0),
                      ),
                    )}
                    hoverLabel="База данных"
                    detailList={[
                      {
                        label: "База данных",
                        value: formatSize(storageStats?.db || 0),
                      },
                      {
                        label: "external-entities.json",
                        value: formatSize(storageStats?.externalJson || 0),
                      },
                      {
                        label: "SQLite (genealogy.sqlite)",
                        value: formatSize(storageStats?.sqlite || 0),
                      },
                    ]}
                  />
                  <StatRow
                    icon={<FolderOpenIcon sx={{ fontSize: 18 }} color="info" />}
                    label="Папка external"
                    value={formatSize(storageStats?.externalFolder || 0)}
                  />
                  <Button
                    fullWidth
                    variant="text"
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => window.appAPI.openDataFolder()}
                    sx={{
                      justifyContent: "flex-start",
                      mt: 0.5,
                      fontSize: "0.65rem",
                      opacity: 0.7,
                    }}
                  >
                    Открыть директорию
                  </Button>
                </List>
              </Grid>
            </Grid>

            <Divider />
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={1.5} flexDirection={"column"}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Импорт / экспорт данных
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent={"space-evenly"}
                  pt={1}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={openBackupSetup}
                    sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      boxShadow: "none",
                      fontWeight: "bold",
                    }}
                  >
                    Экспорт
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<RestoreIcon />}
                    onClick={handleImportAll}
                    sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}
                  >
                    Импорт
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* --- ВИД: ПРОЦЕСС ЭКСПОРТА --- */}
        {showExportProcess && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
              py: 2,
              px: 1,
            }}
          >
            {exportError ? (
              /* --- СОСТОЯНИЕ: ОШИБКА (Красный градиент) --- */
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                  color: "error.contrastText",
                  boxShadow: `0 12px 32px ${alpha(theme.palette.error.main, 0.3)}`,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <ErrorIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography variant="h6" fontWeight={900} gutterBottom>
                  Ошибка экспорта
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 3, opacity: 0.8, fontWeight: 500 }}
                >
                  {exportStatus}
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsSaving(false);
                    setExportError(false);
                  }}
                  sx={{
                    bgcolor: "common.white",
                    color: "error.main",
                    fontWeight: 700,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.9),
                    },
                  }}
                >
                  Вернуться
                </Button>
              </Box>
            ) : saveDone ? (
              /* --- СОСТОЯНИЕ: УСПЕХ (Зеленый градиент) --- */
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  color: "success.contrastText",
                  boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.3)}`,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography variant="h6" fontWeight={900} gutterBottom>
                  Бэкап готов
                </Typography>
                <Typography
                  variant="caption"
                  component="button"
                  onClick={handleOpenArchivePath}
                  sx={{
                    display: "block",
                    mb: 3,
                    opacity: 0.8,
                    wordBreak: "break-all",
                    fontFamily: "Monospace",
                    bgcolor: alpha(theme.palette.common.black, 0.1),
                    p: 1,
                    borderRadius: 1,
                    border: 0,
                    width: "100%",
                    textAlign: "left",
                    color: "inherit",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {exportPath}
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setIsSaving(false);
                    setSaveDone(false);
                  }}
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    py: 1.2,
                    bgcolor: "common.white",
                    color: "success.dark",
                    fontWeight: 700,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.9),
                    },
                  }}
                >
                  Готово
                </Button>
              </Box>
            ) : (
              /* --- СОСТОЯНИЕ: ПРОЦЕСС (Твой новый синий стиль) --- */
              <Box sx={{ width: "100%" }}>
                {/* Заголовок процесса */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                    px: 1,
                  }}
                >
                  <Box sx={{ position: "relative", display: "flex" }}>
                    <CircularProgress
                      size={42}
                      thickness={3}
                      sx={{
                        color: "primary.main",
                        position: "absolute",
                        zIndex: 1,
                      }}
                    />
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "12px",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SaveIcon color="primary" fontSize="small" />
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={900}
                      lineHeight={1.1}
                    >
                      Экспорт данных
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {exportStatus}
                    </Typography>
                  </Box>
                </Box>
                {/* Основная карточка прогресса */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    color: "primary.contrastText",
                    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.35)}`,
                    position: "relative",
                    overflow: "hidden",
                    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
                  }}
                >
                  {/* Анимация блика */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "50%",
                      height: "100%",
                      background: `linear-gradient(to right, transparent, ${alpha(theme.palette.common.white, 0.15)}, transparent)`,
                      animation: `${shimmer} 3s infinite ease-in-out`,
                      zIndex: 0,
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                    sx={{ mb: 2, position: "relative", zIndex: 1 }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          fontSize: "0.65rem",
                        }}
                      >
                        {archiveProgress.phase.startsWith("writing")
                          ? "Сжатие и упаковка"
                          : "Подготовка файлов"}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "baseline",
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 900, lineHeight: 1 }}
                        >
                          {(
                            archiveProgress.processedFiles || 0
                          ).toLocaleString()}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            opacity: 0.5,
                            ml: 1,
                          }}
                        >
                          / {(archiveProgress.totalFiles || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 900,
                        lineHeight: 0.8,
                        letterSpacing: -2,
                        color: "common.white",
                        textShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                      }}
                    >
                      {exportPercent}
                      <span style={{ fontSize: "1.5rem", opacity: 0.8 }}>
                        %
                      </span>
                    </Typography>
                  </Stack>

                  <Box sx={{ position: "relative", zIndex: 1, mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={exportPercent}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: alpha(theme.palette.common.black, 0.2),
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          bgcolor: "common.white",
                          boxShadow: `0 0 10px ${alpha(theme.palette.common.white, 0.5)}`,
                        },
                      }}
                    />
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      opacity: 0.7,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {archiveProgress.currentFile ||
                      archiveProgress.currentOwner ||
                      "Инициализация..."}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* --- ВИД: ПРОЦЕСС ИМПОРТА --- */}
        {showImportProcess && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
              py: 2,
              px: 1,
            }}
          >
            {importError ? (
              <Box sx={{ textAlign: "center" }}>
                <ErrorIcon sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Ошибка импорта
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  {importStatus}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsImportingOpen(false);
                    setImportError(false);
                  }}
                >
                  Вернуться
                </Button>
              </Box>
            ) : isImporting ? (
              <Box sx={{ width: "100%" }}>
                {/* Иконка и текущий статус */}
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}
                >
                  <Box sx={{ position: "relative", display: "flex" }}>
                    <CircularProgress
                      size={48}
                      thickness={2}
                      sx={{
                        color: "success.main",
                        position: "absolute",
                        zIndex: 1,
                      }}
                    />
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <RestoreIcon color="success" />
                    </Box>
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={800}
                      lineHeight={1.2}
                    >
                      Восстановление данных
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600 }}
                    >
                      {importStatus || "Чтение архива..."}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 4, // Чуть больше скругление для мягкости
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                    color: "primary.contrastText",
                    boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.35)}`,
                    position: "relative",
                    overflow: "hidden",
                    border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`, // Тонкая граница для эффекта стекла
                  }}
                >
                  {/* Улучшенный декоративный блеск */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "50%",
                      height: "100%",
                      background: `linear-gradient(to right, transparent, ${alpha(theme.palette.common.white, 0.15)}, transparent)`,
                      animation: `${shimmer} 4s infinite ease-in-out`,
                      zIndex: 0,
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-end"
                    sx={{ mb: 2, position: "relative", zIndex: 1 }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          fontSize: "0.65rem",
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        Идет распаковка архива
                      </Typography>

                      <Box sx={{ display: "flex", alignItems: "baseline" }}>
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 900, lineHeight: 1 }}
                        >
                          {/* {importProgress.current.toLocaleString()} */}
                          {(
                            importProgress.processedFiles || 0
                          ).toLocaleString()}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "1rem",
                            opacity: 0.5,
                            ml: 1,
                          }}
                        >
                          {/* / {importProgress.total.toLocaleString()} */}/{" "}
                          {(importProgress.totalFiles || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="h2" // Еще крупнее для акцента
                        sx={{
                          fontWeight: 900,
                          lineHeight: 0.8,
                          letterSpacing: -2,
                          // Вместо зеленого используем белый с небольшим свечением
                          color: theme.palette.common.white,
                          textShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                        }}
                      >
                        {progressValue}
                        <span style={{ fontSize: "1.5rem", opacity: 0.8 }}>
                          %
                        </span>
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Кастомный прогресс-бар с внутренним свечением */}
                  <Box sx={{ position: "relative", zIndex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progressValue}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: alpha(theme.palette.common.black, 0.2), // Темная подложка
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          bgcolor: theme.palette.common.white, // Белый бар на синем фоне — классика Apple/macOS
                          boxShadow: `0 0 10px ${alpha(theme.palette.common.white, 0.5)}`, // Мягкое свечение самого бара
                        },
                      }}
                    />
                  </Box>

                  {/* Фоновая иконка для контекста (опционально) */}
                  <Box
                    sx={{
                      position: "absolute",
                      right: -10,
                      bottom: -10,
                      opacity: 0.05,
                      transform: "rotate(-15deg)",
                      zIndex: 0,
                    }}
                  >
                    <Box sx={{ fontSize: 120, fontWeight: 900 }}>ZIP</Box>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                  color: "success.contrastText",
                  boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.3)}`,
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
                <Typography variant="h6" fontWeight={900} gutterBottom>
                  Архив успешно восстановлен!
                </Typography>
                <Button
                  variant="contained"
                  disableElevation
                  sx={{
                    height: 24,
                    borderRadius: "6px",
                    py: 1.2,
                    bgcolor: "common.white",
                    color: "success.dark",
                    fontWeight: 700,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.9),
                    },
                  }}
                  onClick={() => setIsImportingOpen(false)}
                >
                  Готово
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* 4. ВИД: ПРИНЯТИЕ РЕШЕНИЯ ОБ ИМПОРТЕ (ВМЕСТО МОДАЛКИ) */}
        {showImportDecision && (
          <ImportDecisionInline
            summary={`Найдено конфликтов: ${confirmConflicts.length}`}
            toAdd={modalToAdd}
            toUpdate={confirmConflicts.map((id) => ({ id }))}
            onSelect={handleImportDecision}
          />
        )}
      </Box>
    </Card>
  );
};
