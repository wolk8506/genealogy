import React, { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Card,
  Slider,
  Chip,
  Alert,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { useSnackbar } from "notistack";

// Иконки
import SdStorageIcon from "@mui/icons-material/SdStorage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CollectionsIcon from "@mui/icons-material/Collections";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Твои импорты сторов и компонентов (раскомментируй их в реальном проекте)
import { useNotificationStore } from "../../store/useNotificationStore";
import CustomSwitch from "../../components/CustomSwitch";

// Анимация блика для прогресс-бара
const shimmer = keyframes`
  0% { transform: translateX(-150%) skewX(-20deg); }
  100% { transform: translateX(150%) skewX(-20deg); }
`;

export const OptimizationMasterCard = ({ cardStyle }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  // Состояния карточки: 'info' -> 'settings' -> 'processing'
  const [view, setView] = useState("info");

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

  // Подписка на прогресс (работает только когда view === 'processing')
  useEffect(() => {
    if (view !== "processing") return;

    const removeListener = window.appAPI?.onConversionProgress?.((data) => {
      setProgress(data);
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, [view]);

  // Запуск конвертации
  const handleStart = async () => {
    setView("processing");
    setProgress({ current: 0, total: 0, percent: 0 });

    try {
      // Если appAPI нет (например, при разработке в браузере), можно добавить мок-задержку
      const result = await window.appAPI?.startConversion?.({
        quality,
        keepOriginal,
        overwrite,
      });

      if (result?.cancelled) {
        enqueueSnackbar("Конвертация прервана пользователем", {
          variant: "info",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "Мастер конвертации",
          message: `Процесс конвертации фото прерван пользователем`,
          type: "warning",
          category: "optimizationMaster",
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
      setView("settings"); // При ошибке возвращаем на экран настроек
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Мастер конвертации",
        message: `Ошибка в процессе конвертации фото`,
        type: "error",
        category: "optimizationMaster",
      });
    }
  };

  // Остановка
  const handleCancel = () => {
    if (
      window.confirm("Вы уверены, что хотите прервать процесс конвертации?")
    ) {
      window.appAPI?.cancelConversion?.();
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
        bgcolor: "background.paper",
      }}
    >
      {/* ШАПКА */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor:
            view === "processing"
              ? alpha(theme.palette.primary.main, 0.05)
              : "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          transition: "background-color 0.3s",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AutoFixHighIcon
            color={view === "processing" ? "primary" : "action"}
            sx={{ fontSize: 20 }}
          />
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
        {view === "processing" && (
          <CircularProgress size={16} thickness={6} sx={{ opacity: 0.7 }} />
        )}
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
        {/* --- СОСТОЯНИЕ 1: ИНФО --- */}
        {view === "info" && (
          <>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
                <Box
                  sx={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    bgcolor: "primary.main",
                    filter: "blur(30px)",
                    opacity: 0.15,
                    zIndex: 0,
                  }}
                />
                <AutoFixHighIcon
                  sx={{
                    fontSize: 64,
                    color: "primary.main",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 900, mb: 1, lineHeight: 1.2 }}
              >
                Мастер оптимизации
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", lineHeight: 1.4 }}
              >
                Автоматизированная система подготовки медиа-файлов для быстрой
                работы архива.
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ mb: "auto" }}>
              {[
                {
                  title: "Конвертация в WebP",
                  desc: "Уменьшение веса до 70%",
                  icon: <SdStorageIcon />,
                },
                {
                  title: "Генерация миниатюр",
                  desc: "Мгновенная загрузка превью",
                  icon: <CollectionsIcon />,
                },
                {
                  title: "Умное хранение",
                  desc: "Разделение оригиналов и копий",
                  icon: <AccountTreeIcon />,
                },
              ].map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    gap: 2,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.action.hover, 0.4),
                  }}
                >
                  <Box
                    sx={{ color: "primary.main", "& svg": { fontSize: 20 } }}
                  >
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        display: "block",
                        lineHeight: 1.2,
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                    >
                      {item.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Button
              fullWidth
              variant="contained"
              startIcon={<SettingsSuggestIcon />}
              onClick={() => setView("settings")}
              sx={{
                mt: 3,
                height: 24,
                borderRadius: "6px",
                py: 1,
                fontWeight: 600,
                textTransform: "none",
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
              }}
            >
              Настроить параметры
            </Button>
          </>
        )}

        {/* --- СОСТОЯНИЕ 2: НАСТРОЙКИ --- */}
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
              {/* Слайдер качества */}
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

              {/* Переключатели */}
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
                    // disabled={processing}
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
                    // disabled={processing}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Кнопки действий */}
            <Stack
              direction="row"
              justifyContent={"space-between"}
              // spacing={1}
              sx={{ mt: 3 }}
            >
              <Button
                // variant="outlined"
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
                {/* <ArrowBackIcon fontSize="small" />  */}
              </Button>
              <Button
                // fullWidth
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={handleStart}
                sx={{
                  height: 24,
                  borderRadius: "6px", // Системный радиус macOS
                  py: 1.2,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  bgcolor: "#007AFF", // Фирменный Blue
                  "&:hover": {
                    bgcolor: "#0062CC",
                  },
                }}
              >
                Запустить процесс
              </Button>
            </Stack>
          </Box>
        )}

        {/* --- СОСТОЯНИЕ 3: ПРОЦЕСС --- */}
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
              {/* Анимация бегущего блика */}
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
  );
};
