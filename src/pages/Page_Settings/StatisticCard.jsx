import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  List,
  ListItem,
  Backdrop,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  Divider,
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
import { ImportDecisionModal } from "./ImportDecisionModal";

export const StatisticCard = ({ cardStyle }) => {
  const theme = useTheme();
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const lastUpdateRef = useRef(0);

  const [storageStats, setStorageStats] = useState(null);
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
    currentOwner: null, // Добавляем поле для имени текущего человека
  });
  // Для импорта
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingOpen, setIsImportingOpen] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [confirmConflicts, setConfirmConflicts] = useState([]);
  const [modalToAdd, setModalToAdd] = useState([]);
  const confirmResolveRef = useRef(null);
  // disk info
  const [totalSize, setTotalSize] = useState(null);
  const [diskInfo, setDiskInfo] = useState({ total: 0, free: 0 });
  // Основные переменные для расчетов
  const total = diskInfo.total || 1;
  const free = diskInfo.free;
  const library = parseFloat(totalSize) || 0;
  // "Другое" — это (Всего - Свободно - Моя библиотека)
  const other = Math.max(0, total - free - library);
  // Проценты для полоски
  const libPct = (library / total) * 100;
  const otherPct = (other / total) * 100;

  // Функция для форматирования размера
  const formatSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
  };
  //
  const formatStorage = (mb) => {
    const val = parseFloat(mb);
    if (!val || isNaN(val)) return "0 GB";
    if (val < 1024) return `${val.toFixed(1)} MB`;
    return `${(val / 1024).toFixed(1)} GB`;
  };

  // ---   I M P O R T  /  E X P O R T  --------------------------------

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // 1. Запрос общего состояния диска (то, что мы делали для полоски)
        const diskData = await window.electronAPI.getDiskUsage();
        if (diskData) setDiskInfo(diskData);

        // 2. Запрос детальной статистики (то, что раньше было в handleOpenStorageInfo)
        const detailedData = await window.appAPI.getDetailedStorageStats();
        if (detailedData) setStorageStats(detailedData);
      } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
      }
    };

    loadAllData();

    // Если у тебя есть интервал обновления, можно оставить его
    const interval = setInterval(loadAllData, 60000); // Обновлять раз в минуту
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (event, data) => {
      // data: { conflicts, toAdd, toUpdate }
      setModalToAdd(data.toAdd?.map((id) => ({ id })) || []);
      setConfirmConflicts(data.toUpdate || []);
      // ВАЖНО: Скрываем индикатор прогресса, чтобы показать модалку выбора
      setIsImporting(false);
      setImportConfirmOpen(true);

      confirmResolveRef.current = (response) => {
        window.electron.ipcRenderer.send("import:confirm-response", response);
        setImportConfirmOpen(false);
        // Возвращаем индикатор прогресса ПОСЛЕ выбора
        setIsImporting(true);
      };
    };

    window.electron.ipcRenderer.on("import:confirm", handler);
    return () => {
      window.electron.ipcRenderer.removeListener("import:confirm", handler);
    };
  }, []);

  // Подписка на прогресс импорта
  useEffect(() => {
    if (!window.importAPI?.onProgress) return;
    const removeListener = window.importAPI.onProgress((data) => {
      const now = Date.now();
      if (now - lastUpdateRef.current > 100 || data.current === data.total) {
        lastUpdateRef.current = now;
        setImportProgress((prev) => ({
          current: data.current ?? prev.current,
          total: data.total ?? prev.total,
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
    // Обновляем размер, если сработал триггер в приложении
    window.appAPI.onFolderSizeUpdated?.(() => fetchTotalSize());
  }, []);
  useEffect(() => {
    let lastUpdate = 0;

    const onProgressHandler = (data) => {
      if (!data || typeof data !== "object") return;

      const now = Date.now();
      // Обновляем только если прошло 100мс или это финал/смена фазы
      if (now - lastUpdate > 100 || data.phase !== archiveProgress.phase) {
        lastUpdate = now;

        setArchiveProgress((prev) => {
          // Проверка: если данные те же, не обновляем (предотвращает петлю)
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
            // Гарантируем, что если фаза записи, мы берем проценты из системы
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
  }, []);

  const handleImportDecision = (response) => {
    if (confirmResolveRef.current) {
      confirmResolveRef.current(response);
    }
  };

  const handleExportAll = async () => {
    setIsSaving(true);
    setSaveDone(false);
    setExportError(false);
    setExportStatus("Подготовка файлов...");

    // Сброс прогресса
    setArchiveProgress({
      phase: "idle",
      percent: 0,
      processedFiles: 0,
      totalFiles: 0,
    });

    try {
      const basePath = (await window.appAPI.getDataPath?.()) || "";
      const allPeople = await window.peopleAPI.getAll();

      const archivePath = await exportPeopleToZip({
        people: allPeople,
        basePath: basePath,
        defaultFilename: `Full_Backup_${Date.now()}.zip`,
        onProgress: (payload) => {
          setArchiveProgress((prev) => ({
            ...prev,
            ...payload,
            // Явно подхватываем владельца или файл, если они пришли
            currentOwner: payload.message,
            currentFile: payload.currentFile ?? prev.currentFile,
            processedFiles: payload.processedFiles ?? prev.processedFiles,
            totalFiles: payload.totalFiles ?? prev.totalFiles,
          }));
        },
        onStatus: setExportStatus,
      });

      // ЕСЛИ ПОЛЬЗОВАТЕЛЬ ОТМЕНИЛ ВЫБОР ФАЙЛА
      if (!archivePath) {
        setIsSaving(false);
        setExportStatus("Отменено пользователем");
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Бэкап",
          message: `Отменено пользователем`,
          type: "warning",
        });
        return; // Прерываем выполнение, чтобы не сработал setSaveDone(true)
      }

      // ЕСЛИ ВСЕ ОК
      setExportPath(archivePath);
      setSaveDone(true);
      setArchiveProgress((prev) => ({ ...prev, phase: "done", percent: 100 }));
      setExportStatus("✅ Полный архив сохранён");
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Бэкап",
        message: `✅ Полный архив сохранён`,
        type: "success",
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
      });
    }
  };
  const handleImportAll = async () => {
    try {
      setIsImporting(true);
      setIsImportingOpen(true);
      setImportStatus("📥 Выберите ZIP для восстановления...");
      const zipPath = await window.dialogAPI.chooseOpenZip();
      if (!zipPath) {
        setIsImportingOpen(false);
        return;
      }
      await window.importAPI.importZip(zipPath);
      // После импорта обновляем список людей
      loadAll();
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: "Импорт из ZIP архива выполнен успешно",
        type: "success",
      });
    } catch (err) {
      setImportStatus(`❌ Ошибка: ${err.message}`);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Импорт",
        message: `❌ Ошибка: ${err.message}`,
        type: "error",
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

    // При записи ZIP ориентируемся строго на проценты от упаковщика
    if (archiveProgress.phase && archiveProgress.phase.startsWith("writing")) {
      return Math.round(archiveProgress.percent || 0);
    }

    // При подготовке файлов рассчитываем на основе кол-ва
    if (archiveProgress.totalFiles > 0) {
      return Math.round(
        ((archiveProgress.processedFiles || 0) / archiveProgress.totalFiles) *
          100,
      );
    }

    return Math.round(archiveProgress.percent || 0);
  })();

  function StatRow({ icon, label, value }) {
    return (
      <ListItem disableGutters>
        <ImportDecisionModal
          open={importConfirmOpen}
          summary={`Найдено конфликтов: ${confirmConflicts.length}`}
          toAdd={modalToAdd}
          toUpdate={confirmConflicts.map((id) => ({ id }))}
          onSelect={handleImportDecision}
        />
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
  }
  return (
    <>
      <Card
        variant="outlined"
        sx={{
          ...cardStyle,
        }}
      >
        {/* ШАПКА */}
        <Box
          sx={{
            p: 2,
            bgcolor: "action.hover",
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            // alignItems: "center",
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
            Статистика хранилища
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Stack spacing={3}>
            {/* 1. ВИЗУАЛИЗАЦИЯ ДИСКА */}
            {/* 1. ВИЗУАЛИЗАЦИЯ ДИСКА */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <StorageIcon
                    sx={{
                      fontSize: 20,
                      color: "text.secondary",
                      opacity: 0.8,
                    }}
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

              {/* Полоска прогресса (Трёхцветная) */}
              <Box
                sx={{
                  height: 14,
                  width: "100%",
                  // alignItems: "center",
                  bgcolor: alpha(theme.palette.divider, 0.2),
                  borderRadius: 7,
                  overflow: "hidden",
                  display: "flex",
                  boxShadow: `inset 0 1px 3px ${alpha("#000", 0.1)}`,
                  mb: 3,
                }}
              >
                {/* Библиотека */}
                <Box
                  sx={{
                    width: `${libPct}%`,
                    bgcolor: "primary.main",
                    transition: "width 1s",
                  }}
                />
                {/* Другие файлы */}
                <Box
                  sx={{
                    width: `${otherPct}%`,
                    bgcolor: alpha(theme.palette.text.disabled, 0.5),
                    borderLeft: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
                {/* Доступно (остаток полоски — автоматически прозрачный/фон) */}
              </Box>

              {/* ЛЕГЕНДА С ДВУХСТРОЧНОЙ ПОДПИСЬЮ */}
              <Grid container spacing={2}>
                {/* Библиотека */}
                <Grid item xs={4}>
                  <Stack direction="row" spacing={1}>
                    <Box
                      sx={{
                        // alignItems: "center",
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
                        {console.log(library)}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                {/* Другое */}
                <Grid item xs={4}>
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

                {/* Доступно */}
                <Grid item xs={4}>
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

            {/* 2. ПОДРОБНАЯ СТАТИСТИКА (ИЗ МОДАЛКИ) */}
            <Grid container spacing={9} justifyContent={"center"}>
              {/* Секция МЕДИА */}
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 900,
                    color: "primary.main",
                    ml: 1,
                  }}
                >
                  Медиа файлы
                </Typography>
                <List
                  data-density="compact"
                  sx={{ "& .MuiListItem-root": { px: 1, py: 0.5 } }}
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

              {/* Секция ДАННЫЕ */}
              <Grid item xs={12} sm={6}>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 900,
                    color: "secondary.main",
                    ml: 1,
                  }}
                >
                  Инфо и БД
                </Typography>
                <List
                  data-density="compact"
                  sx={{ "& .MuiListItem-root": { px: 1, py: 0.5 } }}
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
                    value={formatSize(storageStats?.db || 0)}
                  />
                  <Button
                    fullWidth
                    variant="text"
                    size="small"
                    startIcon={<FolderOpenIcon />}
                    onClick={() => window.appAPI.openDataFolder()}
                    sx={{
                      justifyContent: "flex-start",
                      mt: 1,
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

            {/* 3. КНОПКИ ДЕЙСТВИЙ */}
            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleExportAll}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  boxShadow: "none",
                  fontWeight: "bold",
                }}
              >
                Бэкап
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={handleImportAll}
                sx={{ borderRadius: 2, py: 1, fontWeight: "bold" }}
              >
                Импорт
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Card>

      {/* //------------   Backdrop  -------------- */}
      <Backdrop
        open={isSaving}
        sx={{ zIndex: 3000, color: "#fff", flexDirection: "column", p: 3 }}
      >
        {exportError ? (
          <Box sx={{ textAlign: "center" }}>
            <ErrorIcon sx={{ fontSize: 60, color: "red", mb: 2 }} />
            <Typography variant="h6">{exportStatus}</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Закрыть
            </Button>
          </Box>
        ) : saveDone ? (
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen", mb: 2 }} />
            <Typography variant="h6">Успешно выполнено!</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              {exportPath}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsSaving(false)}
            >
              Закрыть
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: "100%", maxWidth: 450, textAlign: "center" }}>
            <CircularProgress color="inherit" sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {exportStatus}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={percentValue}
              sx={{ height: 10, borderRadius: 5 }}
            />

            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 1 }}
            >
              <Typography variant="caption">
                {archiveProgress.phase.startsWith("writing")
                  ? `Сжатие и упаковка: ${archiveProgress.processedFiles || 0} из ${archiveProgress.totalFiles || 0}`
                  : `${archiveProgress.currentOwner} `}
              </Typography>

              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                {percentValue}%
              </Typography>
            </Stack>

            {archiveProgress.currentFile && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  opacity: 0.6,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {archiveProgress.currentFile}
              </Typography>
            )}
          </Box>
        )}
      </Backdrop>

      <Backdrop
        // ОТКРЫВАЕМ только если идет импорт И НЕ открыто окно подтверждения конфликтов
        open={isImportingOpen && !importConfirmOpen}
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: "column",
          p: 3,
          backdropFilter: "blur(4px)",
        }}
      >
        {isImporting ? (
          <>
            <CircularProgress color="inherit" sx={{ mb: 2 }} />
            <Typography variant="h6">{importStatus}</Typography>
            <Box sx={{ width: "100%", maxWidth: 400, mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={Math.round(
                  (importProgress.current / Math.max(1, importProgress.total)) *
                    100,
                )}
              />
              <Typography
                variant="caption"
                sx={{ mt: 1, display: "block", textAlign: "center" }}
              >
                Обработано: {importProgress.current} из {importProgress.total}
              </Typography>
            </Box>
          </>
        ) : (
          // Это состояние покажется, когда импорт полностью завершен (isImporting: false)
          <Box sx={{ textAlign: "center" }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: "limegreen", mb: 2 }} />
            <Typography variant="h6">Архив успешно восстановлен!</Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => setIsImportingOpen(false)}
            >
              Закрыть
            </Button>
          </Box>
        )}
      </Backdrop>
    </>
  );
};
