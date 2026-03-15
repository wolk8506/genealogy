// import React, { useState, useEffect } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   Slider,
//   Typography,
//   Box,
//   FormControlLabel,
//   Switch,
//   LinearProgress,
//   Stack,
//   Divider,
//   Alert,
// } from "@mui/material";
// import { useSnackbar } from "notistack";

// const qualityGrades = [
//   { value: 60, label: "Эконом" },
//   { value: 80, label: "Баланс" },
//   { value: 95, label: "Максимум" },
// ];

// export default function PhotoConverterModal({ open, onClose }) {
//   const { enqueueSnackbar } = useSnackbar();

//   // Состояния настроек
//   const [quality, setQuality] = useState(80);
//   const [keepOriginal, setKeepOriginal] = useState(true);
//   const [overwrite, setOverwrite] = useState(false);

//   // Состояния процесса
//   const [processing, setProcessing] = useState(false);
//   const [progress, setProgress] = useState({
//     current: 0,
//     total: 0,
//     percent: 0,
//   });

//   // Подписка на прогресс из Main Process
//   useEffect(() => {
//     if (!open) return;

//     const removeListener = window.appAPI.onConversionProgress((data) => {
//       setProgress(data);
//     });

//     return () => {
//       if (removeListener) removeListener();
//     };
//   }, [open]);

//   // Запуск конвертации
//   const handleStart = async () => {
//     setProcessing(true);
//     setProgress({ current: 0, total: 0, percent: 0 });

//     try {
//       const result = await window.appAPI.startConversion({
//         quality,
//         keepOriginal,
//         overwrite,
//       });

//       if (result?.cancelled) {
//         enqueueSnackbar("Конвертация прервана пользователем", {
//           variant: "info",
//         });
//       } else if (result?.success) {
//         enqueueSnackbar(`Успешно обработано фото: ${result.processed}`, {
//           variant: "success",
//         });
//         onClose(); // Закрываем окно только при успешном завершении
//       }
//     } catch (err) {
//       enqueueSnackbar("Ошибка при конвертации", { variant: "error" });
//       console.error(err);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // Кнопка отмены
//   const handleCancel = () => {
//     if (
//       window.confirm(
//         "Вы уверены, grow что хотите прервать процесс конвертации?",
//       )
//     ) {
//       window.appAPI.cancelConversion();
//     }
//   };

//   return (
//     <Dialog
//       open={open}
//       onClose={processing ? null : onClose}
//       maxWidth="sm"
//       fullWidth
//     >
//       <DialogTitle>Конвертер медиа-библиотеки</DialogTitle>

//       <DialogContent>
//         <Stack spacing={3} sx={{ mt: 1 }}>
//           {/* Блок выбора качества (уменьшенная ширина) */}
//           <Box
//             sx={{
//               maxWidth: 300,
//               mx: "auto",
//               width: "100%",
//               textAlign: "center",
//             }}
//           >
//             <Typography gutterBottom variant="subtitle2">
//               Качество WebP: <b>{quality}%</b>
//             </Typography>
//             <Slider
//               value={quality}
//               onChange={(e, v) => setQuality(v)}
//               step={5}
//               marks={qualityGrades}
//               min={60}
//               max={95}
//               disabled={processing} // Блокировка при работе
//             />
//           </Box>

//           <Divider />

//           {/* Переключатели настроек */}
//           <Stack spacing={1}>
//             <FormControlLabel
//               control={
//                 <Switch
//                   checked={keepOriginal}
//                   onChange={(e) => setKeepOriginal(e.target.checked)}
//                   disabled={processing} // Блокировка при работе
//                 />
//               }
//               label="Сохранять оригиналы в /original"
//             />
//             <FormControlLabel
//               control={
//                 <Switch
//                   checked={overwrite}
//                   onChange={(e) => setOverwrite(e.target.checked)}
//                   disabled={processing} // Блокировка при работе
//                 />
//               }
//               label="Перезаписывать существующие WebP/Thumbs"
//             />
//           </Stack>

//           {/* Индикатор прогресса */}
//           {processing && (
//             <Box sx={{ width: "100%", mt: 2 }}>
//               <Box
//                 sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
//               >
//                 <Typography variant="body2">
//                   Обработка: {progress.current} из {progress.total}
//                 </Typography>
//                 <Typography variant="body2">{progress.percent}%</Typography>
//               </Box>
//               <LinearProgress
//                 variant="determinate"
//                 value={progress.percent}
//                 sx={{ height: 10, borderRadius: 5 }}
//               />
//             </Box>
//           )}

//           {!processing && (
//             <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
//               Конвертация оптимизирует размер фото для быстрого отображения в
//               дереве.
//             </Alert>
//           )}
//         </Stack>
//       </DialogContent>

//       <DialogActions sx={{ px: 3, pb: 2 }}>
//         {!processing ? (
//           <>
//             <Button onClick={onClose} color="inherit">
//               Закрыть
//             </Button>
//             <Button onClick={handleStart} variant="contained" color="primary">
//               Начать конвертацию
//             </Button>
//           </>
//         ) : (
//           <Button onClick={handleCancel} variant="outlined" color="error">
//             Отменить процесс
//           </Button>
//         )}
//       </DialogActions>
//     </Dialog>
//   );
// }
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
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";

import { useSnackbar } from "notistack";

const qualityGrades = [
  { value: 60, label: "Эконом" },
  { value: 80, label: "Баланс" },
  { value: 95, label: "Максимум" },
];

export default function PhotoConverterModal({ open, onClose }) {
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
        sx: { borderRadius: 3, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          fontWeight: 700,
          bgcolor: processing ? "action.hover" : "transparent",
          transition: "background-color 0.3s",
        }}
      >
        <AutoFixHighIcon color={processing ? "primary" : "action"} />
        {processing
          ? "Идет оптимизация медиа..."
          : "Конвертер медиа-библиотеки"}
      </DialogTitle>

      <DialogContent dividers sx={{ borderBottom: "none" }}>
        <Stack spacing={4} sx={{ mt: 1 }}>
          {/* Настройки (скрываются или блокируются при работе) */}
          <Box
            sx={{ opacity: processing ? 0.6 : 1, transition: "opacity 0.3s" }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, color: "text.secondary", ml: 1 }}
            >
              Конфигурация сжатия
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(0,0,0,0.01)",
              }}
            >
              <Box sx={{ maxWidth: 350, mx: "auto", mb: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Качество WebP
                  </Typography>
                  <Chip
                    label={`${quality}%`}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 800, borderRadius: 1 }}
                  />
                </Stack>
                <Slider
                  value={quality}
                  onChange={(e, v) => setQuality(v)}
                  step={5}
                  marks={[
                    { value: 60, label: "Мин" },
                    { value: 80, label: "Оптимум" },
                    { value: 95, label: "Макс" },
                  ]}
                  min={60}
                  max={95}
                  disabled={processing}
                />
              </Box>

              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={keepOriginal}
                      onChange={(e) => setKeepOriginal(e.target.checked)}
                      disabled={processing}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Сохранять оригиналы (папка /original)
                    </Typography>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={overwrite}
                      onChange={(e) => setOverwrite(e.target.checked)}
                      disabled={processing}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Перезаписывать существующие файлы
                    </Typography>
                  }
                />
              </Stack>
            </Box>
          </Box>

          {/* Блок прогресса */}
          {processing && (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: "0 4px 15px rgba(25, 118, 210, 0.2)",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-end"
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.8, display: "block", mb: 0.5 }}
                  >
                    Выполняется обработка:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, lineHeight: 1 }}
                  >
                    {progress.current}{" "}
                    <small style={{ fontWeight: 400, opacity: 0.7 }}>из</small>{" "}
                    {progress.total}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  {progress.percent}%
                </Typography>
              </Stack>

              <LinearProgress
                variant="determinate"
                value={progress.percent}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: "rgba(255,255,255,0.2)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "white",
                    borderRadius: 6,
                  },
                }}
              />
            </Box>
          )}

          {!processing && (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon fontSize="small" />}
              sx={{
                borderRadius: 2,
                bgcolor: "aliceblue",
                color: "rgb(41, 182, 246)",
              }}
            >
              Рекомендуется использовать <b>80%</b> качества. Это обеспечит
              лучший баланс между весом файла и четкостью в дереве.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: "action.hover" }}>
        {!processing ? (
          <>
            <Button
              onClick={onClose}
              variant="text"
              color="inherit"
              sx={{ fontWeight: 600 }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleStart}
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              sx={{
                px: 4,
                borderRadius: 2,
                fontWeight: 700,
                boxShadow: "none",
              }}
            >
              Начать работу
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
              fontWeight: 700,
              borderWidth: 2,
              "&:hover": { borderWidth: 2 },
            }}
          >
            Остановить процесс
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
