import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  List,
  ListItem,
  Tooltip,
  LinearProgress,
  Grid,
  Card,
  TextField,
  Chip,
  IconButton,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  RestoreFromTrash as RestoreIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

import { exportPeopleToZip } from "../utils/exportToZip";
import ErrorIcon from "@mui/icons-material/Error";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PieChartIcon from "@mui/icons-material/PieChart";
import SaveIcon from "@mui/icons-material/Save";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SellIcon from "@mui/icons-material/Sell";
import HistoryIcon from "@mui/icons-material/History";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BuildIcon from "@mui/icons-material/Build";
import { ImportDecisionInline } from "./ImportDecisionInline";
import CustomSwitch from "../../components/CustomSwitch";
import AppButton from "../../components/AppButton";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
  chevron,
} from "./settingsUi";

export const StatisticCard = ({ cardStyle, loadAll, onSubpageChange }) => {
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
  const [backupIncludeTags, setBackupIncludeTags] = useState(true);
  const [backupIncludeHistory, setBackupIncludeHistory] = useState(true);

  // --- Состояние подготовки восстановления ---
  const [importSetupOpen, setImportSetupOpen] = useState(false);
  const [importZipPath, setImportZipPath] = useState("");
  const [importArchiveMeta, setImportArchiveMeta] = useState(null);
  const [importPhotoFolders, setImportPhotoFolders] = useState([]);
  const [importIncludeTags, setImportIncludeTags] = useState(false);
  const [importIncludeHistory, setImportIncludeHistory] = useState(false);

  // --- Состояния экспорта (Бэкапа) ---
  const [isSaving, setIsSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);
  const [exportStatus, setExportStatus] = useState("Подготовка бэкапа...");
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
      console.warn("Не удалось открыть путь бэкапа", error);
    }
  };

  const openBackupSetup = () => {
    setBackupArchiveName(getDefaultArchiveName());
    setBackupPhotoFolders({ original: true, thumbs: false, webp: false });
    setBackupMaintenance(false);
    setBackupIncludeTags(true);
    setBackupIncludeHistory(true);
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
        message: "Выберите original или webp для бэкапа фото",
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
        includeTags: backupIncludeTags,
        includeHistory: backupIncludeHistory,
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

      setExportStatus("✅ Полный бэкап сохранён");
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message:
          allExternal.length > 0
            ? `✅ Бэкап сохранён (родственники + справочник: ${allExternal.length})`
            : `✅ Полный бэкап сохранён`,
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
    setImportIncludeTags(false);
    setImportIncludeHistory(false);
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
          message: "Файл не распознан как ZIP-бэкап этого приложения",
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
      setImportIncludeTags(Boolean(archiveInfo.hasTagsFile));
      setImportIncludeHistory(Boolean(archiveInfo.hasHistoryFile));
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
    setImportStatus("📥 Восстановление из бэкапа...");

    try {
      const importResult = await window.importAPI.importZip(importZipPath, {
        photoFolders: selectedFolders,
        includeTags: importIncludeTags,
        includeHistory: importIncludeHistory,
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
            : "Импорт из ZIP-бэкапа выполнен успешно",
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

  function StatRow({
    icon,
    color = "gray",
    label,
    value,
    detailList,
    hoverLabel,
  }) {
    const content = (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.4,
          width: "100%",
        }}
      >
        <RowIcon bg={color}>{icon}</RowIcon>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            variant="body2"
            fontWeight={400}
            noWrap
            sx={{ fontSize: "0.8125rem" }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: "0.8125rem",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {value}
        </Typography>
      </Box>
    );

    if (!detailList || !detailList.length) return content;

    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5, minWidth: 220 }}>
            <Typography
              variant="caption"
              sx={{ opacity: 0.8, display: "block", mb: 1 }}
            >
              {hoverLabel || label}
            </Typography>
            <List dense disablePadding sx={{ m: 0 }}>
              {detailList.map((item) => (
                <ListItem
                  key={item.label}
                  disableGutters
                  sx={{ py: 0.25, px: 0 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
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
  const headerTitle = showExportProcess
    ? "Экспорт данных"
    : showBackupSetup
      ? "Параметры бэкапа"
      : showImportSetup
        ? "Восстановление из бэкапа"
        : showImportDecision
          ? "Подтверждение импорта"
          : showImportProcess
            ? "Импорт данных"
            : "Статистика хранилища";

  const headerSubtitle = showExportProcess
    ? "Упаковка данных библиотеки"
    : showBackupSetup
      ? "Состав и имя архива"
      : showImportSetup
        ? "Выбор архива и параметров"
        : showImportDecision
          ? "Выберите способ импорта"
          : showImportProcess
            ? "Распаковка данных"
            : "Размеры файлов и обслуживание";

  // Открываем экспорт/импорт как отдельную страницу раздела,
  // а не блоком внизу статистики.
  const subpageActive = !showDefaultContent;

  useEffect(() => {
    onSubpageChange?.(subpageActive);
  }, [subpageActive, onSubpageChange]);

  useEffect(() => () => onSubpageChange?.(false), [onSubpageChange]);

  const backDisabled =
    (showExportProcess && isSaving && !saveDone && !exportError) ||
    (showImportProcess && isImporting);

  const handleSubpageBack = () => {
    if (showBackupSetup) {
      closeBackupSetup();
      return;
    }
    if (showImportSetup) {
      resetImportSetup();
      return;
    }
    if (showImportDecision) {
      handleImportDecision({ action: "cancel", selected: [] });
      return;
    }
    if (showExportProcess) {
      if (backDisabled) return;
      setIsSaving(false);
      setSaveDone(false);
      setExportError(false);
      return;
    }
    if (showImportProcess) {
      if (backDisabled) return;
      setIsImportingOpen(false);
      setImportError(false);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "18px",
        border: "none",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {subpageActive && (
          <IconButton
            size="small"
            onClick={handleSubpageBack}
            disabled={backDisabled}
            aria-label="Назад"
            sx={{ ml: -0.75, mr: -0.5, color: "text.secondary" }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}
        <RowIcon bg="indigo">
          <PieChartIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {headerTitle}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            {headerSubtitle}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 2,
          flexGrow: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {/* --- ВИД: ПАРАМЕТРЫ БЭКАПА --- */}
        {showBackupSetup && (
          <Stack spacing={2.5} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: 0.5 }}
            >
              Настройте имя архива, папки фото и обслуживание базы перед
              упаковкой.
            </Typography>

            <Box>
              <Typography sx={sectionLabelSx}>Архив</Typography>
              <Box sx={groupSx}>
                <Box sx={{ px: 2, pt: 2.75, pb: 1.5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Имя бэкапа"
                    value={backupArchiveName}
                    onChange={(e) => setBackupArchiveName(e.target.value)}
                    helperText={`Дата и время: ${new Date().toLocaleString("ru-RU")}`}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Фото в бэкапе</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  {[
                    ["original", "Оригиналы", "Исходные файлы", "blue"],
                    ["webp", "WebP", "Сжатые версии", "orange"],
                    ["thumbs", "Превью", "Миниатюры", "gray"],
                  ].map(([value, title, subtitle, color]) => (
                    <SettingsRow
                      key={value}
                      icon={
                        <RowIcon bg={color}>
                          <PhotoLibraryIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={title}
                      subtitle={subtitle}
                      trailing={
                        <CustomSwitch
                          checked={Boolean(backupPhotoFolders[value])}
                          onChange={() =>
                            setBackupPhotoFolders((prev) => ({
                              ...prev,
                              [value]: !prev[value],
                            }))
                          }
                        />
                      }
                    />
                  ))}
                </Stack>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, ml: 0.5 }}
              >
                Выберите хотя бы один из вариантов: оригиналы или WebP.
              </Typography>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Дополнительные данные</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <SettingsRow
                    icon={
                      <RowIcon bg="purple">
                        <SellIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Метки"
                    subtitle="tags.json"
                    trailing={
                      <CustomSwitch
                        checked={backupIncludeTags}
                        onChange={() => setBackupIncludeTags((prev) => !prev)}
                      />
                    }
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="indigo">
                        <HistoryIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Журнал действий"
                    subtitle="history.jsonl"
                    trailing={
                      <CustomSwitch
                        checked={backupIncludeHistory}
                        onChange={() =>
                          setBackupIncludeHistory((prev) => !prev)
                        }
                      />
                    }
                  />
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Обслуживание</Typography>
              <Box sx={groupSx}>
                <SettingsRow
                  icon={
                    <RowIcon bg="green">
                      <BuildIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Обслуживание базы"
                  subtitle="VACUUM + ANALYZE перед экспортом"
                  trailing={
                    <CustomSwitch
                      checked={backupMaintenance}
                      onChange={(e) => setBackupMaintenance(e.target.checked)}
                    />
                  }
                />
              </Box>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ pt: 0.5 }}
            >
              <AppButton
                preset="ghost"
                onClick={closeBackupSetup}
                sx={{ px: 2.5 }}
              >
                Отмена
              </AppButton>
              <AppButton
                preset="primary"
                onClick={handleExportAll}
                disabled={
                  !backupPhotoFolders.original && !backupPhotoFolders.webp
                }
                startIcon={<SaveIcon />}
                sx={{ px: 2.5 }}
              >
                Создать бэкап
              </AppButton>
            </Stack>
          </Stack>
        )}

        {/* --- ВИД: ПАРАМЕТРЫ ВОССТАНОВЛЕНИЯ --- */}
        {showImportSetup && (
          <Stack spacing={2.5} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: 0.5 }}
            >
              Проверьте бэкап, выберите нужные папки фото для восстановления и
              запустите импорт.
            </Typography>

            <Box>
              <Typography sx={sectionLabelSx}>Бэкап</Typography>
              <Box sx={groupSx}>
                <Box sx={{ px: 2, py: 1.75 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {importArchiveMeta?.archiveName || "Без имени"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    {importArchiveMeta?.createdAt
                      ? `Создан: ${new Date(
                          importArchiveMeta.createdAt,
                        ).toLocaleString("ru-RU")}`
                      : "Дата создания неизвестна"}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap">
                    {(importArchiveMeta?.availablePhotoFolders || []).map(
                      (folder) => (
                        <Chip
                          key={folder}
                          label={folder}
                          size="small"
                          sx={{
                            height: 22,
                            borderRadius: "7px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}
                        />
                      ),
                    )}
                    {importArchiveMeta?.hasTagsFile && (
                      <Chip
                        label="tags.json"
                        size="small"
                        sx={{
                          height: 22,
                          borderRadius: "7px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      />
                    )}
                    {importArchiveMeta?.hasHistoryFile && (
                      <Chip
                        label="history.jsonl"
                        size="small"
                        sx={{
                          height: 22,
                          borderRadius: "7px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Дополнительные данные</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <SettingsRow
                    icon={
                      <RowIcon bg="purple">
                        <SellIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Метки"
                    subtitle="tags.json"
                    trailing={
                      <CustomSwitch
                        disabled={!importArchiveMeta?.hasTagsFile}
                        checked={importIncludeTags}
                        onChange={() => setImportIncludeTags((prev) => !prev)}
                      />
                    }
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="indigo">
                        <HistoryIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Журнал действий"
                    subtitle="history.jsonl"
                    trailing={
                      <CustomSwitch
                        disabled={!importArchiveMeta?.hasHistoryFile}
                        checked={importIncludeHistory}
                        onChange={() =>
                          setImportIncludeHistory((prev) => !prev)
                        }
                      />
                    }
                  />
                </Stack>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, ml: 0.5 }}
              >
                Переключатели активны только если файл есть в бэкапе.
              </Typography>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>
                Восстанавливать папки фото
              </Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  {[
                    ["original", "Оригиналы", "Исходные файлы", "blue"],
                    ["webp", "WebP", "Сжатые версии", "orange"],
                    ["thumbs", "Превью", "Миниатюры", "gray"],
                  ].map(([value, title, subtitle, color]) => (
                    <SettingsRow
                      key={value}
                      icon={
                        <RowIcon bg={color}>
                          <PhotoLibraryIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title={title}
                      subtitle={subtitle}
                      trailing={
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
                      }
                    />
                  ))}
                </Stack>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, ml: 0.5 }}
              >
                Если какой-то папки нет в бэкапе, она просто будет пропущена.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ pt: 0.5 }}
            >
              <AppButton
                preset="ghost"
                onClick={resetImportSetup}
                sx={{ px: 2.5 }}
              >
                Отмена
              </AppButton>
              <AppButton
                preset="primary"
                onClick={handleRunImport}
                disabled={importPhotoFolders.length === 0}
                startIcon={<RestoreIcon />}
                sx={{ px: 2.5 }}
              >
                Восстановить
              </AppButton>
            </Stack>
          </Stack>
        )}

        {/* --- СТАНДАРТНЫЙ ВИД (Статистика) --- */}
        {showDefaultContent && (
          <Stack spacing={2.5} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Box>
              <Typography sx={sectionLabelSx}>Системный том</Typography>
              <Box sx={groupSx}>
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    sx={{ mb: 1.25 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Занято{" "}
                        {(((total - free) / total) * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatStorage(total - free)} из {formatStorage(total)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatStorage(free)} свободно
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      height: 10,
                      width: "100%",
                      bgcolor: "action.hover",
                      borderRadius: "5px",
                      overflow: "hidden",
                      display: "flex",
                      mb: 2,
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
                        bgcolor: "text.disabled",
                        opacity: 0.55,
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
                            borderRadius: "3px",
                            bgcolor: "primary.main",
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Файлы библиотеки
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
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
                            borderRadius: "3px",
                            bgcolor: "text.disabled",
                            opacity: 0.55,
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Система и кэш
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
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
                            borderRadius: "3px",
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider",
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Доступно (прибл.)
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={free < 10240 ? "error.main" : "inherit"}
                          >
                            {formatStorage(free)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Медиа файлы</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <StatRow
                    color="blue"
                    icon={<CameraAltIcon sx={{ fontSize: 18 }} />}
                    label="Оригиналы"
                    value={formatSize(storageStats?.original || 0)}
                  />
                  <StatRow
                    color="green"
                    icon={<PhotoSizeSelectLargeIcon sx={{ fontSize: 18 }} />}
                    label="Сжатые (WebP)"
                    value={formatSize(storageStats?.webp || 0)}
                  />
                  <StatRow
                    color="gray"
                    icon={<PhotoLibraryIcon sx={{ fontSize: 18 }} />}
                    label="Превью (Thumbs)"
                    value={formatSize(storageStats?.thumbs || 0)}
                  />
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Инфо и БД</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <StatRow
                    color="indigo"
                    icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                    label="Биографии (BIO)"
                    value={formatSize(storageStats?.bio || 0)}
                  />
                  <StatRow
                    color="green"
                    icon={<StorageIcon sx={{ fontSize: 18 }} />}
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
                    color="orange"
                    icon={<FolderOpenIcon sx={{ fontSize: 18 }} />}
                    label="Папка external"
                    value={formatSize(storageStats?.externalFolder || 0)}
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="gray">
                        <FolderOpenIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Открыть директорию"
                    onClick={() => window.appAPI.openDataFolder()}
                    trailing={chevron}
                  />
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Импорт и экспорт</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <SettingsRow
                    icon={
                      <RowIcon bg="blue">
                        <SaveIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Экспорт данных"
                    subtitle="Создать резервную копию библиотеки"
                    trailing={chevron}
                    onClick={openBackupSetup}
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="green">
                        <RestoreIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Импорт данных"
                    subtitle="Восстановить из ZIP-бэкапа"
                    trailing={chevron}
                    onClick={handleImportAll}
                  />
                </Stack>
              </Box>
            </Box>
          </Stack>
        )}

        {/* --- ВИД: ПРОЦЕСС ЭКСПОРТА --- */}
        {showExportProcess && (
          <Box sx={{ py: 1 }}>
            {exportError ? (
              <Box sx={groupSx}>
                <Stack
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2, py: 3, textAlign: "center" }}
                >
                  <RowIcon bg="red">
                    <ErrorIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Ошибка экспорта
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {exportStatus}
                  </Typography>
                  <AppButton
                    preset="secondary"
                    onClick={() => {
                      setIsSaving(false);
                      setExportError(false);
                    }}
                    sx={{ px: 3, mt: 1 }}
                  >
                    Вернуться
                  </AppButton>
                </Stack>
              </Box>
            ) : saveDone ? (
              <Box sx={groupSx}>
                <Stack
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2, py: 3, textAlign: "center" }}
                >
                  <RowIcon bg="green">
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Бэкап готов
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Нажмите на путь, чтобы показать файл в Finder.
                  </Typography>
                  <Box
                    component="button"
                    onClick={handleOpenArchivePath}
                    sx={{
                      font: "inherit",
                      width: "100%",
                      border: 0,
                      borderRadius: "10px",
                      bgcolor: "action.hover",
                      px: 1.5,
                      py: 1,
                      cursor: "pointer",
                      color: "text.secondary",
                      fontFamily: "Monospace",
                      fontSize: "0.72rem",
                      wordBreak: "break-all",
                      textAlign: "center",
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                  >
                    {exportPath}
                  </Box>
                  <AppButton
                    preset="primary"
                    onClick={() => {
                      setIsSaving(false);
                      setSaveDone(false);
                    }}
                    sx={{ px: 4, minWidth: 120, mt: 0.5 }}
                  >
                    Готово
                  </AppButton>
                </Stack>
              </Box>
            ) : (
              <Box sx={groupSx}>
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ minWidth: 0 }}
                    >
                      <RowIcon bg="blue">
                        <SaveIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          Экспорт данных
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          noWrap
                        >
                          {exportStatus}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        ml: 2,
                      }}
                    >
                      {exportPercent}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={exportPercent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1.25,
                      "& .MuiLinearProgress-bar": { borderRadius: 4 },
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                    >
                      {(archiveProgress.processedFiles || 0).toLocaleString()}{" "}
                      из{" "}
                      {(archiveProgress.totalFiles || 0).toLocaleString()}{" "}
                      файлов
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {archiveProgress.phase.startsWith("writing")
                        ? "Сжатие и упаковка"
                        : archiveProgress.currentFile ||
                          archiveProgress.currentOwner ||
                          "Инициализация..."}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* --- ВИД: ПРОЦЕСС ИМПОРТА --- */}
        {showImportProcess && (
          <Box sx={{ py: 1 }}>
            {importError ? (
              <Box sx={groupSx}>
                <Stack
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2, py: 3, textAlign: "center" }}
                >
                  <RowIcon bg="red">
                    <ErrorIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Ошибка импорта
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {importStatus}
                  </Typography>
                  <AppButton
                    preset="secondary"
                    onClick={() => {
                      setIsImportingOpen(false);
                      setImportError(false);
                    }}
                    sx={{ px: 3, mt: 1 }}
                  >
                    Вернуться
                  </AppButton>
                </Stack>
              </Box>
            ) : isImporting ? (
              <Box sx={groupSx}>
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ minWidth: 0 }}
                    >
                      <RowIcon bg="green">
                        <RestoreIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          Восстановление данных
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          noWrap
                        >
                          {importStatus || "Чтение бэкапа..."}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        ml: 2,
                      }}
                    >
                      {progressValue}%
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      mb: 1.25,
                      "& .MuiLinearProgress-bar": { borderRadius: 4 },
                    }}
                  />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                    >
                      {(importProgress.processedFiles || 0).toLocaleString()}{" "}
                      из{" "}
                      {(importProgress.totalFiles || 0).toLocaleString()}{" "}
                      файлов
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{
                        textAlign: "right",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Распаковка бэкапа
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            ) : (
              <Box sx={groupSx}>
                <Stack
                  spacing={1.5}
                  alignItems="center"
                  sx={{ px: 2, py: 3, textAlign: "center" }}
                >
                  <RowIcon bg="green">
                    <CheckCircleIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Данные успешно восстановлены
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Библиотека обновлена — можно продолжать работу.
                  </Typography>
                  <AppButton
                    preset="primary"
                    onClick={() => setIsImportingOpen(false)}
                    sx={{ px: 4, minWidth: 120, mt: 0.5 }}
                  >
                    Готово
                  </AppButton>
                </Stack>
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
