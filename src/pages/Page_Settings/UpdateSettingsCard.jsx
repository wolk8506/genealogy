import React, { useState, useEffect } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  LinearProgress,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AppButton from "../../components/AppButton";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  SettingsRow,
} from "./settingsUi";

export const UpdateSettingsCard = ({ cardStyle }) => {
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
        <RowIcon bg="blue">
          <SystemUpdateAltIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Обновление системы
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Проверка и установка новых версий
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={sectionLabelSx}>Версия</Typography>
            <Box sx={groupSx}>
              <SettingsRow
                icon={
                  <RowIcon bg="blue">
                    <InfoIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title={`Версия ПО: ${version || "загрузка…"}`}
                subtitle={`Платформа: ${platform || "—"}`}
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
                      color="text.secondary"
                    >
                      Стабильная
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>Обновления</Typography>
            <Box sx={groupSx}>
              {error ? (
                <Box sx={{ px: 2, py: 1.6 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <RowIcon bg="red">
                      <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="error.main"
                      >
                        Ошибка обновления
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        noWrap
                      >
                        {error}
                      </Typography>
                    </Box>
                    <AppButton
                      preset="secondary"
                      onClick={() => window.updater.check()}
                    >
                      Повторить
                    </AppButton>
                  </Stack>
                </Box>
              ) : !updateInfo ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    Проверка обновлений…
                  </Typography>
                </Box>
              ) : updateInfo.version === version ? (
                <SettingsRow
                  icon={
                    <RowIcon bg="green">
                      <CheckCircleIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Установлена последняя версия"
                  subtitle={`Версия ${version}`}
                />
              ) : (
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <RowIcon bg="blue">
                      <CloudDownloadIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Доступна версия {updateInfo.version}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Загрузите и перезапустите приложение
                      </Typography>
                    </Box>
                  </Stack>

                  {progress > 0 && !downloaded ? (
                    <Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 1 }}
                      >
                        Загрузка: {progress}%
                      </Typography>
                    </Box>
                  ) : downloaded ? (
                    <AppButton
                      preset="primary"
                      startIcon={<SystemUpdateAltIcon />}
                      onClick={handleInstall}
                      sx={{ width: "100%" }}
                    >
                      Установить и перезапустить
                    </AppButton>
                  ) : (
                    <AppButton
                      preset="primary"
                      startIcon={<CloudDownloadIcon />}
                      onClick={() => window.updater.download(updateInfo)}
                      sx={{ width: "100%" }}
                    >
                      Скачать обновление
                    </AppButton>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
