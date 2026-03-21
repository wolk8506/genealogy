import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  LinearProgress,
  Stack,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSnackbar } from "notistack";

const qualityGrades = [
  { value: 60, label: "Эконом" },
  { value: 80, label: "Баланс" },
  { value: 95, label: "Максимум" },
];

export default function PhotoConverterModal({ open, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { enqueueSnackbar } = useSnackbar();

  // Состояния настроек
  const [quality, setQuality] = useState(80);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [overwrite, setOverwrite] = useState(false);

  // Состояния процесса
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percent: 0,
  });

  // Подписка на прогресс из Main Process
  useEffect(() => {
    if (!open) return;

    const removeListener = window.appAPI.onConversionProgress((data) => {
      setProgress(data);
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, [open]);

  // Запуск конвертации
  const handleStart = async () => {
    setProcessing(true);
    setProgress({ current: 0, total: 0, percent: 0 });

    try {
      const result = await window.appAPI.startConversion({
        quality,
        keepOriginal,
        overwrite,
      });

      if (result?.cancelled) {
        enqueueSnackbar("Конвертация прервана пользователем", {
          variant: "info",
        });
      } else if (result?.success) {
        enqueueSnackbar(`Успешно обработано фото: ${result.processed}`, {
          variant: "success",
        });
        onClose(); // Закрываем окно только при успешном завершении
      }
    } catch (err) {
      enqueueSnackbar("Ошибка при конвертации", { variant: "error" });
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // Кнопка отмены
  const handleCancel = () => {
    if (
      window.confirm(
        "Вы уверены, grow что хотите прервать процесс конвертации?",
      )
    ) {
      window.appAPI.cancelConversion();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={processing ? null : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 7,
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          backgroundImage: "none", // Убираем стандартное наложение в темной теме MUI
        },
      }}
    >
      {/* ШАПКА: Контрастная и четкая */}
      <DialogTitle
        sx={{
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: processing
            ? alpha(theme.palette.primary.main, 0.05)
            : "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          transition: "background-color 0.3s",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AutoFixHighIcon color={processing ? "primary" : "action"} />
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              fontSize: "0.85rem",
              letterSpacing: 1,
            }}
          >
            {processing ? "Оптимизация медиа" : "Мастер конвертации"}
          </Typography>
        </Stack>
        {processing && (
          <CircularProgress size={20} thickness={6} sx={{ opacity: 0.7 }} />
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* ОПИСАНИЕ */}
          {!processing && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              Этот инструмент создаст оптимизированные копии ваших изображений в
              формате <b>WebP</b> и обновит превью. Это значительно ускорит
              работу приложения.
            </Typography>
          )}

          {/* БЛОК НАСТРОЕК */}
          <Box
            sx={{ opacity: processing ? 0.6 : 1, transition: "opacity 0.3s" }}
          >
            <Typography
              variant="overline"
              sx={{
                fontWeight: 800,
                color: "text.secondary",
                ml: 0.5,
                mb: 1,
                display: "block",
              }}
            >
              Конфигурация сжатия
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha(theme.palette.action.hover, 0.1),
              }}
            >
              {/* Слайдер качества */}
              <Box sx={{ px: 2, mb: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Качество изображений
                  </Typography>
                  <Chip
                    label={`${quality}%`}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 900, borderRadius: 1.5, px: 1 }}
                  />
                </Stack>
                <Slider
                  value={quality}
                  onChange={(e, v) => setQuality(v)}
                  step={5}
                  min={60}
                  max={95}
                  disabled={processing}
                  marks={[
                    { value: 60, label: "Эконом" },
                    { value: 80, label: "Баланс" },
                    { value: 95, label: "Качество" },
                  ]}
                  sx={{
                    "& .MuiSlider-thumb": { width: 20, height: 20 },
                    "& .MuiSlider-valueLabel": { fontWeight: 800 },
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
                  <Typography variant="body2" fontWeight={600}>
                    Сохранять оригиналы
                  </Typography>
                  <Switch
                    size="small"
                    checked={keepOriginal}
                    onChange={(e) => setKeepOriginal(e.target.checked)}
                    disabled={processing}
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
                  <Typography variant="body2" fontWeight={600}>
                    Перезаписывать файлы
                  </Typography>
                  <Switch
                    size="small"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    disabled={processing}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* БЛОК ПРОГРЕССА */}
          {processing ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Декоративный блеск на фоне */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.1,
                  background:
                    "linear-gradient(45deg, transparent 45%, white 50%, transparent 55%)",
                  backgroundSize: "200% 200%",
                  animation: "shimmer 2s infinite linear",
                }}
              />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-end"
                sx={{ mb: 2, position: "relative" }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Обработка...
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {progress.current}{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: "1rem",
                        opacity: 0.7,
                      }}
                    >
                      / {progress.total}
                    </span>
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {progress.percent}%
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={progress.percent}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: alpha("#fff", 0.2),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "white",
                    borderRadius: 6,
                  },
                }}
              />
            </Box>
          ) : (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{
                borderRadius: 2.5,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                "& .MuiAlert-message": { fontSize: "0.8rem", lineHeight: 1.5 },
              }}
            >
              Использование <b>WebP</b> снижает нагрузку на диск до <b>70%</b>{" "}
              без видимой потери качества.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          bgcolor: "action.hover",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        {!processing ? (
          <>
            <Button
              onClick={onClose}
              color="inherit"
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleStart}
              variant="contained"
              startIcon={<PlayArrowIcon />}
              sx={{
                px: 4,
                py: 1,
                borderRadius: 2,
                fontWeight: 800,
                boxShadow: "none",
              }}
            >
              Начать оптимизацию
            </Button>
          </>
        ) : (
          <Button
            onClick={handleCancel}
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              px: 3,
              borderWidth: 2,
              "&:hover": { borderWidth: 2 },
            }}
          >
            Остановить процесс
          </Button>
        )}
      </DialogActions>

      <style>
        {`
      @keyframes shimmer {
        0% { background-position: -200% -200%; }
        100% { background-position: 200% 200%; }
      }
    `}
      </style>
    </Dialog>
  );
}
