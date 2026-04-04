import React, { useState, useEffect } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  Button,
  LinearProgress,
  Alert,
  alpha,
  useTheme,
  Chip,
  Divider,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

export const UpdateSettingsCard = ({ cardStyle }) => {
  const theme = useTheme();
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("");
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    window.appAPI?.getVersion?.().then(setVersion);
    window.appAPI?.getPlatform?.().then(setPlatform);

    window.updater.check();
    window.updater.onAvailable((info) => setUpdateInfo(info));
    window.updater.onProgress((pct) => setProgress(pct));
    window.updater.onDownloaded((path) => {
      setDownloaded(true);
      setFilePath(path);
    });
    window.updater.onError((msg) => setError(msg));

    return () => window.updater.removeAll();
  }, []);

  const handleInstall = () => {
    window.updater.install(filePath);
    window.electronAPI.quitApp();
  };

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        // borderRadius: 3,
        // width: "100%",
        // maxWidth: "600px",
        // bgcolor: alpha(theme.palette.background.paper, 0.4),
      }}
    >
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
        <SystemUpdateAltIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Обновление системы
        </Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Текущая версия */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Версия ПО: {version || "загрузка..."}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Платформа: {platform}
              </Typography>
            </Box>
            <Chip label="Стабильная" size="small" variant="outlined" />
          </Box>

          <Divider />

          {/* Статус обновлений */}
          {error ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => window.updater.check()}
                >
                  Повторить
                </Button>
              }
            >
              Ошибка: {error}
            </Alert>
          ) : !updateInfo ? (
            <Stack spacing={1}>
              <Typography variant="caption">Проверка обновлений...</Typography>
              <LinearProgress />
            </Stack>
          ) : updateInfo.version === version ? (
            <Alert
              icon={<CheckCircleIcon fontSize="inherit" />}
              severity="success"
            >
              У вас установлена последняя версия
            </Alert>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Доступна версия {updateInfo.version}
              </Typography>

              {progress > 0 && !downloaded ? (
                <Stack spacing={1}>
                  <LinearProgress variant="determinate" value={progress} />
                  <Typography variant="caption">
                    Загрузка: {progress}%
                  </Typography>
                </Stack>
              ) : downloaded ? (
                <Button variant="contained" fullWidth onClick={handleInstall}>
                  Установить и перезапустить
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<CloudDownloadIcon />}
                  onClick={() => window.updater.download(updateInfo)}
                >
                  Скачать обновление
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Card>
  );
};
