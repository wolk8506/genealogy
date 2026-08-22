import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Card,
  Dialog,
  Slider,
  Chip,
  Alert,
  LinearProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { useSnackbar } from "notistack";

// Иконки
import SdStorageIcon from "@mui/icons-material/SdStorage";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import StorageIcon from "@mui/icons-material/Storage";

// Твои импорты сторов и компонентов
import { useNotificationStore } from "../../store/useNotificationStore";
import CustomSwitch from "../../components/CustomSwitch";

// Анимация блика для прогресс-бара
const shimmer = keyframes`
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(150%) skewX(-20deg); }
`;

const maintenanceTasks = [
  {
    id: "run-audit",
    label: "Аудит файлов",
    desc: "Подсчет всех фото, аватаров и био на диске",
  },
  {
    id: "debug-diff",
    label: "Поиск расхождений",
    desc: "Сравнение JSON и реальных файлов в папках",
  },
  {
    id: "deep-audit",
    label: "Глубокий аудит",
    desc: "Поиск дублей внутри JSON и проверка наличия аватаров",
  },
  {
    id: "fix-missing-files",
    label: "Удалить битые ссылки",
    desc: "Убирает из JSON записи о файлах, которых нет на диске",
  },
  {
    id: "remove-duplicates",
    label: "Очистить дубликаты",
    desc: "Удаляет повторяющиеся записи в photos.json",
  },
  {
    id: "geo-patcher",
    label: "Гео-патчер (EXIF)",
    desc: "Достает координаты из фото и пишет адреса текстом",
  },
  {
    id: "sqlite-db-stats",
    label: "SQLite: статистика",
    desc: "Размер базы, число шаблонов лиц и статус scan state",
  },
  {
    id: "sqlite-vacuum-analyze",
    label: "SQLite: VACUUM + ANALYZE",
    desc: "Оптимизирует файл базы и обновляет статистику запросов",
  },
  {
    id: "sqlite-integrity-check",
    label: "SQLite: integrity check",
    desc: "Проверка целостности SQLite через PRAGMA integrity_check",
  },
];

export const OptimizationMasterCard = ({ cardStyle }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  // Состояния карточки: 'info' -> 'settings' -> 'processing'
  const [view, setView] = useState("info");
  const [maintenanceConsoleOpen, setMaintenanceConsoleOpen] = useState(false);
  const [isRunningTask, setIsRunningTask] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastMaintenanceReport, setLastMaintenanceReport] = useState(null);

  // Состояния настроек
  const [quality, setQuality] = useState(80);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [overwrite, setOverwrite] = useState(false);

  // Состояния процесса
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
  });

  const [activeMaintenanceTask, setActiveMaintenanceTask] = useState("");

  useEffect(() => {
    // Подписываемся на логи обслуживания
    const removeListener = window.appAPI?.onMaintenanceLog?.((message) => {
      setLogs((prev) => {
        const next = [...prev, message];
        return next.slice(-1000);
      });
    });

    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, []);

  useEffect(() => {
    if (view !== "processing") return;

    const removeListener = window.appAPI?.onConversionProgress?.((data) => {
      setProgress(data);
    });

    return () => {
      if (typeof removeListener === "function") removeListener();
    };
  }, [view]);

  // Запуск конвертации
  const handleStart = async () => {
    setView("processing");
    setProgress({ current: 0, total: 0, percent: 0 });

    try {
      const result = await window.appAPI?.startConversion?.({
        quality,
        keepOriginal,
        overwrite,
      });

      if (result?.cancelled) {
        enqueueSnackbar("Конвертация прервана пользователем", {
          variant: "info",
        });
        setView("info");
      } else if (result?.success) {
        enqueueSnackbar(`Успешно обработано фото: ${result.processed}`, {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Мастер конвертации",
          message: `Успешно обработано фото: ${result.processed}`,
          type: "success",
          category: "optimizationMaster",
        });
        setView("info");
      }
    } catch (err) {
      enqueueSnackbar("Ошибка при конвертации", { variant: "error" });
      console.error(err);
      setView("settings");
    }
  };

  // Остановка конвертации
  const handleCancel = () => {
    if (
      window.confirm("Вы уверены, что хотите прервать процесс конвертации?")
    ) {
      window.appAPI?.cancelConversion?.();
    }
  };

  // Запуск скриптов обслуживания
  const handleRunMaintenanceTask = async (taskName, label) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] > ${label}: запуск...`]);
    setActiveMaintenanceTask(label);
    setIsRunningTask(true);
    try {
      const result = await window.appAPI?.runMaintenanceTask?.(taskName);

      if (result?.success) {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✓ ${label}: выполнено. Изменений: ${result.affectedCount}`,
        ]);
        setLastMaintenanceReport({
          ok: true,
          label,
          affectedCount: result.affectedCount,
          at: new Date().toISOString(),
        });
        enqueueSnackbar(
          `${label}: выполнено. Изменений: ${result.affectedCount}`,
          { variant: "success" },
        );
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✗ ${label}: ошибка выполнения`,
      ]);
      setLastMaintenanceReport({
        ok: false,
        label,
        affectedCount: 0,
        at: new Date().toISOString(),
      });
      enqueueSnackbar(`Ошибка: ${label}`, { variant: "error" });
    } finally {
      setIsRunningTask(false);
      setActiveMaintenanceTask("");
    }
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          ...cardStyle,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
      {/* ШАПКА - УБРАЛИ КНОПКУ, ТЕПЕРЬ ОНА ЧИСТАЯ И ЕДИНАЯ ДЛЯ ВСЕХ ЭКРАНОВ */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {view === "maintenance" ? (
            <BuildCircleIcon color="primary" sx={{ fontSize: 20 }} />
          ) : (
            <AutoFixHighIcon color="action" sx={{ fontSize: 20 }} />
          )}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: "0.7rem",
              letterSpacing: 1,
            }}
          >
            {view === "info" && "Интеллектуальный помощник"}
            {view === "settings" && "Настройки оптимизации"}
            {view === "processing" && "Оптимизация медиа"}
          </Typography>
        </Stack>
      </Box>

      {/* ТЕЛО КАРТОЧКИ */}
      <Box
        sx={{
          p: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* --- СОСТОЯНИЕ 1: ИНФО (ОБНОВЛЕННЫЙ СТАРТОВЫЙ ЭКРАН) --- */}
        {view === "info" && (
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Box sx={{ textAlign: "center", mb: 4, mt: 1 }}>
              <AutoFixHighIcon
                sx={{
                  fontSize: 48,
                  color: "primary.main",
                  mb: 1,
                  opacity: 0.9,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Управление архивом
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", lineHeight: 1.4, px: 2 }}
              >
                Оптимизация медиафайлов и техническое обслуживание базы данных
                генеалогического древа.
              </Typography>
            </Box>

            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha(theme.palette.action.hover, 0.08),
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.secondary", mb: 0.5 }}
              >
                Последний отчет обслуживания БД
              </Typography>
              {lastMaintenanceReport ? (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip
                    size="small"
                    color={lastMaintenanceReport.ok ? "success" : "error"}
                    label={lastMaintenanceReport.ok ? "Успешно" : "Ошибка"}
                  />
                  <Typography variant="caption" sx={{ color: "text.primary" }}>
                    {lastMaintenanceReport.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {lastMaintenanceReport.ok
                      ? `Изменений: ${lastMaintenanceReport.affectedCount}`
                      : "Требуется проверка логов"}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  Пока нет запусков обслуживания
                </Typography>
              )}
            </Box>

            <Stack spacing={2} sx={{ mt: "auto", mb: 2 }}>
              {/* Кнопка 1: Оптимизация */}
              <Box
                onClick={() => setView("settings")}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                    display: "flex",
                  }}
                >
                  <SdStorageIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Сжатие и конвертация
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.2,
                      display: "block",
                    }}
                  >
                    Уменьшение веса фотографий (WebP) и автоматическая генерация
                    миниатюр.
                  </Typography>
                </Box>
              </Box>

              {/* Кнопка 2: Обслуживание */}
              <Box
                onClick={() => setMaintenanceConsoleOpen(true)}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  p: 2,
                  borderRadius: 3,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    borderColor: alpha(theme.palette.info.main, 0.3),
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: "info.main",
                    display: "flex",
                  }}
                >
                  <StorageIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Обслуживание БД
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      lineHeight: 1.2,
                      display: "block",
                    }}
                  >
                    Запуск скриптов обслуживания в отдельной консоли с полным
                    отчетом и журналом.
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        )}

        {/* --- СОСТОЯНИЕ НАСТРОЕК (БЕЗ ИЗМЕНЕНИЙ) --- */}
        {view === "settings" && (
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{
                mb: 3,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                "& .MuiAlert-message": { fontSize: "0.75rem" },
              }}
            >
              Использование <b>WebP</b> снижает нагрузку на диск до <b>70%</b>{" "}
              без потери качества.
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha(theme.palette.action.hover, 0.1),
                mb: "auto",
              }}
            >
              <Box sx={{ mb: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Качество сжатия
                  </Typography>
                  <Chip
                    label={`${quality}%`}
                    color="primary"
                    size="small"
                    sx={{
                      fontWeight: 900,
                      borderRadius: 1.5,
                      height: 20,
                      "& .MuiChip-label": { px: 1, fontSize: "0.7rem" },
                    }}
                  />
                </Stack>
                <Slider
                  value={quality}
                  onChange={(e, v) => setQuality(v)}
                  step={5}
                  min={60}
                  max={95}
                  marks={[
                    { value: 60, label: "Эконом" },
                    { value: 80, label: "Баланс" },
                    { value: 95, label: "Макс" },
                  ]}
                  sx={{
                    width: "calc(100% - 40px)",
                    ml: 2.5,
                    mr: 2.5,
                    "& .MuiSlider-thumb": { width: 16, height: 16 },
                    "& .MuiSlider-markLabel": { fontSize: "0.65rem" },
                  }}
                />
              </Box>

              <Stack spacing={1}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: alpha(theme.palette.divider, 0.5),
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    fontSize="0.8rem"
                  >
                    Сохранять оригиналы
                  </Typography>
                  <CustomSwitch
                    size="small"
                    checked={keepOriginal}
                    onChange={(e) => setKeepOriginal(e.target.checked)}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: alpha(theme.palette.divider, 0.5),
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    fontSize="0.8rem"
                  >
                    Перезаписывать файлы
                  </Typography>
                  <CustomSwitch
                    size="small"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                </Box>
              </Stack>
            </Box>

            <Stack
              direction="row"
              justifyContent={"space-between"}
              sx={{ mt: 3 }}
            >
              <Button
                color="inherit"
                onClick={() => setView("info")}
                sx={{
                  height: 24,
                  borderRadius: "6px",
                  py: 1.2,
                  px: 3.6,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "text.primary",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                  },
                }}
              >
                Отменить
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleStart}
                sx={{
                  height: 24,
                  borderRadius: "6px",
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  bgcolor: "#007AFF",
                  "&:hover": { bgcolor: "#0062CC" },
                }}
              >
                Запустить процесс
              </Button>
            </Stack>
          </Box>
        )}

        {/* --- СОСТОЯНИЕ PROCESSING (БЕЗ ИЗМЕНЕНИЙ) --- */}
        {view === "processing" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "center",
            }}
          >
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
                mb: 4,
              }}
            >
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
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    Конвертация фото
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline" }}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 900, lineHeight: 1 }}
                    >
                      {progress.current.toLocaleString()}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "1rem",
                        opacity: 0.5,
                        ml: 1,
                      }}
                    >
                      / {progress.total.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 900,
                      lineHeight: 0.8,
                      letterSpacing: -2,
                      color: theme.palette.common.white,
                      textShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.2)}`,
                    }}
                  >
                    {progress.percent}
                    <span style={{ fontSize: "1.5rem", opacity: 0.8 }}>%</span>
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress.percent || 0}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: alpha(theme.palette.common.black, 0.2),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      bgcolor: theme.palette.common.white,
                      boxShadow: `0 0 10px ${alpha(theme.palette.common.white, 0.5)}`,
                    },
                  }}
                />
              </Box>
            </Box>

            <Button
              color="error"
              startIcon={<StopIcon />}
              onClick={handleCancel}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.15) },
              }}
            >
              Остановить процесс
            </Button>
          </Box>
        )}
      </Box>
      </Card>

      <Dialog
        open={maintenanceConsoleOpen}
        onClose={() => !isRunningTask && setMaintenanceConsoleOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: "min(90vh, 820px)",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            flexWrap="wrap"
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <StorageIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: 1 }}>
                Консоль обслуживания БД
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {activeMaintenanceTask && (
                <Chip size="small" color="warning" label={`Выполняется: ${activeMaintenanceTask}`} />
              )}
              {lastMaintenanceReport && (
                <Chip
                  size="small"
                  color={lastMaintenanceReport.ok ? "success" : "error"}
                  label={`${lastMaintenanceReport.ok ? "OK" : "ERR"}: ${lastMaintenanceReport.label}`}
                />
              )}
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 2, flex: 1, minHeight: 0, display: "flex", gap: 2 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              borderRadius: 2,
              bgcolor: "#1e1e1e",
              color: "#d4d4d4",
              fontFamily: "monospace",
              fontSize: "0.76rem",
              border: "1px solid #333",
              p: 1.5,
              overflow: "auto",
              whiteSpace: "pre",
              "&::-webkit-scrollbar": { width: 8, height: 8 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#444", borderRadius: 2 },
            }}
          >
            {logs.length === 0 ? (
              <Box sx={{ color: "#808080" }}>[ожидание] Запустите команду справа...</Box>
            ) : (
              logs.map((log, i) => (
                <Box key={`${i}-${log}`} sx={{ mb: 0.4 }}>
                  {log}
                </Box>
              ))
            )}
          </Box>

          <Box
            sx={{
              width: 360,
              maxWidth: "42%",
              minWidth: 300,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(theme.palette.action.hover, 0.05),
              p: 1.2,
              overflowY: "auto",
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
            }}
          >
            <Stack spacing={1}>
              {maintenanceTasks.map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.78rem", mb: 0.2 }}>
                    {task.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                    {task.desc}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={isRunningTask}
                    onClick={() => handleRunMaintenanceTask(task.id, task.label)}
                    sx={{
                      height: 24,
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                    }}
                  >
                    Запуск
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setLogs([])}
            disabled={isRunningTask || logs.length === 0}
            startIcon={<CleaningServicesIcon />}
            sx={{
              height: 24,
              borderRadius: "6px",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Очистить лог
          </Button>

          <Button
            variant="outlined"
            onClick={() => setMaintenanceConsoleOpen(false)}
            disabled={isRunningTask}
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 24,
              borderRadius: "6px",
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Закрыть
          </Button>
        </Box>
      </Dialog>
    </>
  );
};
