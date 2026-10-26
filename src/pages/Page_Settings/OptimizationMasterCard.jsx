import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  Card,
  Slider,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
} from "@mui/material";
import { useSnackbar } from "notistack";

// Иконки
import SdStorageIcon from "@mui/icons-material/SdStorage";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import StorageIcon from "@mui/icons-material/Storage";
import SaveIcon from "@mui/icons-material/Save";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Твои импорты сторов и компонентов
import { useNotificationStore } from "../../store/useNotificationStore";
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

export const OptimizationMasterCard = ({ cardStyle, onSubpageChange }) => {
  const { enqueueSnackbar } = useSnackbar();

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  // Состояния карточки: 'info' -> 'settings' -> 'processing'
  const [view, setView] = useState("info");
  const [activeTaskId, setActiveTaskId] = useState(null);
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

  const subpageActive = view !== "info";
  const activeTask =
    maintenanceTasks.find((task) => task.id === activeTaskId) || null;
  const backDisabled = view === "processing" || isRunningTask;

  const taskAccent = (id) =>
    id.startsWith("sqlite")
      ? { color: "indigo", icon: <StorageIcon sx={{ fontSize: 18 }} /> }
      : id === "geo-patcher"
        ? { color: "blue", icon: <BuildCircleIcon sx={{ fontSize: 18 }} /> }
        : { color: "green", icon: <CleaningServicesIcon sx={{ fontSize: 18 }} /> };

  const headerTitle =
    view === "info"
      ? "Обслуживание медиа"
      : view === "settings"
        ? "Настройки оптимизации"
        : view === "processing"
          ? "Оптимизация медиа"
          : view === "maintenance"
            ? "Обслуживание БД"
            : activeTask?.label || "Скрипт";

  const logsLabel = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} запись`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return `${n} записи`;
    }
    return `${n} записей`;
  };

  const headerSubtitle =
    view === "info"
      ? "Оптимизация файлов и базы данных"
      : view === "settings"
        ? "Сжатие WebP и параметры импорта"
        : view === "processing"
          ? "Идёт конвертация фотографий"
          : view === "maintenance"
            ? "Скрипты и журнал"
            : "Запуск и журнал";

  useEffect(() => {
    onSubpageChange?.(subpageActive);
  }, [subpageActive, onSubpageChange]);

  useEffect(() => () => onSubpageChange?.(false), [onSubpageChange]);

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
              onClick={() =>
                setView(view === "maintenance-task" ? "maintenance" : "info")
              }
              disabled={backDisabled}
              aria-label="Назад"
              sx={{ ml: -0.75, mr: -0.5, color: "text.secondary" }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <RowIcon bg="purple">
            <AutoFixHighIcon sx={{ fontSize: 18 }} />
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

        <Box sx={{ px: 2, pb: 2, flexGrow: 1, overflowY: "auto" }}>
          {view === "info" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Инструменты</Typography>
                <Box sx={groupSx}>
                  <Stack divider={<RowDivider />}>
                    <SettingsRow
                      icon={
                        <RowIcon bg="blue">
                          <SdStorageIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Сжатие и конвертация"
                      subtitle="WebP и автоматические миниатюры"
                      trailing={chevron}
                      onClick={() => setView("settings")}
                    />
                    <SettingsRow
                      icon={
                        <RowIcon bg="indigo">
                          <StorageIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Обслуживание БД"
                      subtitle="Скрипты, отчёт и журнал"
                      trailing={chevron}
                      onClick={() => setView("maintenance")}
                    />
                  </Stack>
                </Box>
              </Box>

              <Box>
                <Typography sx={sectionLabelSx}>Последний отчёт</Typography>
                <Box sx={groupSx}>
                  {lastMaintenanceReport ? (
                    <SettingsRow
                      icon={
                        <RowIcon
                          bg={
                            lastMaintenanceReport.ok ? "green" : "red"
                          }
                        >
                          {lastMaintenanceReport.ok ? (
                            <CheckCircleIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                          )}
                        </RowIcon>
                      }
                      title={lastMaintenanceReport.label}
                      subtitle={
                        lastMaintenanceReport.ok
                          ? `Изменений: ${lastMaintenanceReport.affectedCount}`
                          : "Требуется проверка логов"
                      }
                      trailing={
                        <Box
                          sx={{
                            px: 1,
                            height: 22,
                            borderRadius: "11px",
                            bgcolor: "action.hover",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color={
                              lastMaintenanceReport.ok
                                ? "success.main"
                                : "error.main"
                            }
                          >
                            {lastMaintenanceReport.ok ? "Успешно" : "Ошибка"}
                          </Typography>
                        </Box>
                      }
                    />
                  ) : (
                    <SettingsRow
                      title="Пока нет запусков обслуживания"
                      subtitle="Отчёт появится после первого запуска"
                    />
                  )}
                </Box>
              </Box>
            </Stack>
          )}

          {view === "settings" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Параметры</Typography>
                <Box sx={groupSx}>
                  <Stack divider={<Divider sx={{ ml: 2 }} />}>
                    <Box sx={{ px: 2, py: 1.4 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Качество сжатия
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Баланс между размером и качеством
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {quality}%
                        </Typography>
                      </Stack>
                      <Box sx={{ px: 2 }}>
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
                            mt: 1,
                            "& .MuiSlider-markLabel": {
                              fontSize: "0.65rem",
                              fontWeight: 600,
                            },
                          }}
                        />
                      </Box>
                    </Box>
                    <SettingsRow
                      icon={
                        <RowIcon bg="green">
                          <SaveIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Сохранять оригиналы"
                      subtitle="Копия в папке originals"
                      trailing={
                        <CustomSwitch
                          size="small"
                          checked={keepOriginal}
                          onChange={(e) => setKeepOriginal(e.target.checked)}
                        />
                      }
                      onClick={() => setKeepOriginal(!keepOriginal)}
                    />
                    <SettingsRow
                      icon={
                        <RowIcon bg="orange">
                          <FileCopyIcon sx={{ fontSize: 18 }} />
                        </RowIcon>
                      }
                      title="Перезаписывать файлы"
                      subtitle="Заменять существующие WebP"
                      trailing={
                        <CustomSwitch
                          size="small"
                          checked={overwrite}
                          onChange={(e) => setOverwrite(e.target.checked)}
                        />
                      }
                      onClick={() => setOverwrite(!overwrite)}
                    />
                  </Stack>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 1,
                    ml: 0.5,
                    lineHeight: 1.4,
                  }}
                >
                  WebP снижает нагрузку на диск до 70% без заметной потери
                  качества.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <AppButton
                  preset="secondary"
                  onClick={() => setView("info")}
                  sx={{ flex: 1 }}
                >
                  Отмена
                </AppButton>
                <AppButton
                  preset="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleStart}
                  sx={{ flex: 1.4 }}
                >
                  Запустить процесс
                </AppButton>
              </Stack>
            </Stack>
          )}

          {view === "processing" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Прогресс</Typography>
                <Box sx={groupSx}>
                  <Box sx={{ p: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress.percent || 0}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mt: 1.5 }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {progress.current.toLocaleString()} /{" "}
                        {progress.total.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {progress.percent}%
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5 }}
                    >
                      Конвертация фотографий
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <AppButton
                preset="dangerOutlined"
                startIcon={<StopIcon />}
                onClick={handleCancel}
                sx={{ width: "100%" }}
              >
                Остановить процесс
              </AppButton>
            </Stack>
          )}
          {view === "maintenance" && (
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Скрипты</Typography>
                <Box sx={groupSx}>
                  <Stack divider={<RowDivider />}>
                    {maintenanceTasks.map((task) => {
                      const accent = taskAccent(task.id);
                      return (
                        <SettingsRow
                          key={task.id}
                          icon={
                            <RowIcon bg={accent.color}>
                              {accent.icon}
                            </RowIcon>
                          }
                          title={task.label}
                          subtitle={task.desc}
                          trailing={chevron}
                          onClick={() => {
                            setActiveTaskId(task.id);
                            setView("maintenance-task");
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1, ml: 0.5 }}
                >
                  Выберите скрипт, чтобы запустить его и посмотреть журнал.
                </Typography>
              </Box>
            </Stack>
          )}

          {view === "maintenance-task" && activeTask && (
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={sectionLabelSx}>Задача</Typography>
                <Box sx={groupSx}>
                  <Box sx={{ px: 2, py: 2 }}>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <RowIcon bg={taskAccent(activeTask.id).color}>
                        {taskAccent(activeTask.id).icon}
                      </RowIcon>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          noWrap
                        >
                          {activeTask.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          noWrap
                        >
                          {activeTask.desc}
                        </Typography>
                      </Box>
                      {lastMaintenanceReport?.label === activeTask.label && (
                        <Chip
                          size="small"
                          color={
                            lastMaintenanceReport.ok ? "success" : "error"
                          }
                          label={
                            lastMaintenanceReport.ok ? "Успешно" : "Ошибка"
                          }
                          sx={{
                            height: 22,
                            borderRadius: "7px",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Stack>
                    {isRunningTask &&
                      activeMaintenanceTask === activeTask.label && (
                        <LinearProgress
                          sx={{ height: 6, borderRadius: 3, mb: 1.25 }}
                        />
                      )}
                    <Typography variant="caption" color="text.secondary">
                      Скрипт выполняется локально, результат пишется в журнал.
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box>
                <Typography sx={sectionLabelSx}>Журнал</Typography>
                <Box sx={groupSx}>
                  <Box sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        bgcolor: "#1e1e1e",
                        color: "#d4d4d4",
                        borderRadius: "10px",
                        border: "1px solid #333",
                        fontFamily: "monospace",
                        fontSize: "0.74rem",
                        lineHeight: 1.5,
                        p: 1.5,
                        minHeight: 120,
                        maxHeight: 280,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        "&::-webkit-scrollbar": { width: 8, height: 8 },
                        "&::-webkit-scrollbar-thumb": {
                          bgcolor: "#444",
                          borderRadius: 2,
                        },
                      }}
                    >
                      {logs.length === 0 ? (
                        <Box sx={{ color: "#808080" }}>
                          [ожидание] Нажмите «Запустить скрипт»…
                        </Box>
                      ) : (
                        logs.map((log, i) => (
                          <Box key={`${i}-${log}`} sx={{ mb: 0.4 }}>
                            {log}
                          </Box>
                        ))
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderTop: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {logsLabel(logs.length)}
                    </Typography>
                    <AppButton
                      preset="ghost"
                      size="small"
                      startIcon={<CleaningServicesIcon />}
                      onClick={() => setLogs([])}
                      disabled={isRunningTask || logs.length === 0}
                    >
                      Очистить
                    </AppButton>
                  </Box>
                </Box>
              </Box>

              <Stack direction="row" spacing={1}>
                <AppButton
                  preset="secondary"
                  onClick={() => setView("maintenance")}
                  disabled={isRunningTask}
                  sx={{ flex: 1 }}
                >
                  К списку
                </AppButton>
                <AppButton
                  preset="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={() =>
                    handleRunMaintenanceTask(activeTask.id, activeTask.label)
                  }
                  disabled={isRunningTask}
                  sx={{ flex: 1.4 }}
                >
                  {isRunningTask &&
                  activeMaintenanceTask === activeTask.label
                    ? "Выполняется…"
                    : "Запустить скрипт"}
                </AppButton>
              </Stack>
            </Stack>
          )}

        </Box>
    </Card>
  );
};
