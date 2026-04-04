import React, { useContext, useEffect, useState } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
  Slider,
  Chip,
} from "@mui/material";

import Brightness4Icon from "@mui/icons-material/Brightness4";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";

import { useSettingsStore } from "../../store/useSettingsStore";
import { ThemeContext } from "../../theme/ThemeContext.cjs";

export const GeneralSettingsCard = ({ cardStyle }) => {
  const theme = useTheme();
  const { auto, setAuto, userPref, setUserPref } = useContext(ThemeContext);

  // Берем данные и метод обновления из нашего стора
  const appSettings = useSettingsStore((state) => state.appSettings);
  const updateAppSettings = useSettingsStore(
    (state) => state.updateAppSettings,
  );

  // Локальный стейт для "плавности" слайдеров (чтобы не спамить в базу при каждом движении)
  const [tempSettings, setTempSettings] = useState(appSettings);

  // Синхронизируем локальный стейт, если глобальный изменился (например, при загрузке)
  useEffect(() => {
    setTempSettings(appSettings);
  }, [appSettings]);

  return (
    <Card variant="outlined" sx={{ ...cardStyle }}>
      {/* ШАПКА */}
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
        <DisplaySettingsIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Общие параметры и внешний вид
        </Typography>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Stack spacing={3}>
          {/* СЕКЦИЯ: ТЕМА */}
          <Box>
            <List disablePadding>
              <ListItem sx={{ px: 2 }}>
                <ListItemIcon>
                  <Brightness4Icon />
                </ListItemIcon>
                <ListItemText
                  primary="Системная тема"
                  secondary="Использовать настройки вашей ОС"
                />
                <Switch
                  edge="end"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />
              </ListItem>

              <Stack spacing={1} sx={{ mt: 0, pl: 9 }}>
                <FormControlLabel
                  disabled={auto}
                  control={
                    <Radio
                      checked={userPref === "light"}
                      onChange={() => setUserPref("light")}
                      icon={<LightModeIcon opacity={0.5} />}
                      checkedIcon={
                        <LightModeIcon color={!auto ? "primary" : "divider"} />
                      }
                    />
                  }
                  label="Светлая"
                />
                <FormControlLabel
                  disabled={auto}
                  control={
                    <Radio
                      checked={userPref === "dark"}
                      onChange={() => setUserPref("dark")}
                      icon={<DarkModeIcon opacity={0.5} />}
                      checkedIcon={
                        <DarkModeIcon color={!auto ? "primary" : "divider"} />
                      }
                    />
                  }
                  label="Тёмная"
                />
              </Stack>
            </List>
          </Box>

          {/* СЕКЦИЯ: ПОВЕДЕНИЕ */}
          <Box sx={{ px: 2 }}>
            {/* Настройка: Время отображения лейбла */}
            <Box sx={{ mb: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Лейбл "Новый/Изменен"
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Время отображения метки на карточках
                  </Typography>
                </Box>
                <Chip
                  label={`${tempSettings.newLabelDuration} ч`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: "6px" }}
                />
              </Stack>

              <Box sx={{ px: 1 }}>
                <Slider
                  value={tempSettings.newLabelDuration}
                  min={24}
                  max={72}
                  step={12}
                  marks={[
                    { value: 24, label: "24 ч" },
                    { value: 48, label: "48 ч" },
                    { value: 72, label: "72 ч" },
                  ]}
                  // Обновляем только "картинку"
                  onChange={(_, v) =>
                    setTempSettings((prev) => ({
                      ...prev,
                      newLabelDuration: v,
                    }))
                  }
                  // Сохраняем в стор и БД только когда отпустили ползунок
                  onChangeCommitted={(_, v) =>
                    updateAppSettings({ newLabelDuration: v })
                  }
                  sx={{
                    "& .MuiSlider-markLabel": {
                      fontSize: "0.65rem",
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Настройка: Максимальный размер файла */}
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Лимит размера файла
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ограничение при загрузке медиа
                  </Typography>
                </Box>
                <Chip
                  label={`${tempSettings.maxUploadSize} ГБ`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: "6px" }}
                />
              </Stack>

              <Box sx={{ px: 1 }}>
                <Slider
                  value={tempSettings.maxUploadSize}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks={[
                    { value: 0.1, label: "100 МБ" },
                    { value: 0.5, label: "500 МБ" },
                    { value: 1.0, label: "1 ГБ" },
                  ]}
                  onChange={(_, v) =>
                    setTempSettings((prev) => ({ ...prev, maxUploadSize: v }))
                  }
                  onChangeCommitted={(_, v) =>
                    updateAppSettings({ maxUploadSize: v })
                  }
                  sx={{
                    "& .MuiSlider-markLabel": {
                      fontSize: "0.65rem",
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
