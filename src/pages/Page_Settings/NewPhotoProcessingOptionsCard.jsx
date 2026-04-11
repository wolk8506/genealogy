import React, { useEffect, useState } from "react";

import {
  Box,
  Stack,
  Typography,
  FormControlLabel,
  Card,
  Switch,
  Slider,
  Chip,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import { useTheme, alpha } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CustomSwitch from "../../components/CustomSwitch";

export const NewPhotoProcessingOptionsCard = ({ cardStyle }) => {
  const theme = useTheme();

  // 1. Инициализация стейта
  const [importSettings, setImportSettings] = useState({
    keepOriginals: true,
    quality: 80,
  });

  //----------
  // Загрузка при старте
  useEffect(() => {
    // Используем window.settings, как указано в вашем preload
    if (window.settings && window.settings.get) {
      window.settings.get("importSettings").then((saved) => {
        if (saved) setImportSettings(saved);
      });
    }
  }, []);

  // Сохранение изменений
  const handleSettingChange = async (changedValue) => {
    const updated = { ...importSettings, ...changedValue };
    setImportSettings(updated);

    if (window.settings && window.settings.set) {
      await window.settings.set("importSettings", updated);
    }
  };

  return (
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
        <SettingsIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Параметры обработки новых фото
        </Typography>
      </Box>
      <Box
        sx={{
          // display: "flex",
          p: 3,
          height: 470,
          // justifyContent: "space-between",
        }}
      >
        <Stack
          spacing={5}
          sx={{
            height: "100%",
            // display: "flex",
            // p: 3,
            // height: 470,
            justifyContent: "space-between",
          }}
        >
          {/* Секция: Оригиналы */}
          <Box>
            <FormControlLabel
              sx={{
                ml: 0,
                mb: 2,
                width: "100%",
                justifyContent: "space-between",
                flexDirection: "row-reverse",
              }}
              control={
                <CustomSwitch
                  checked={importSettings.keepOriginals}
                  onChange={(e) =>
                    handleSettingChange({
                      keepOriginals: e.target.checked,
                    })
                  }
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Сохранять исходные файлы
                </Typography>
              }
            />
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
              }}
            >
              <InfoOutlinedIcon
                sx={{ fontSize: 18, color: "info.main", mt: 0.3 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ lineHeight: 1.4 }}
              >
                При включении система создаст копию в папке <b>"originals"</b>.
                Это гарантирует, что вы всегда сможете вернуться к исходному
                качеству, но требует в 2-3 раза больше дискового пространства.
              </Typography>
            </Box>
          </Box>

          {/* Секция: Качество WebP */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Степень сжатия WebP
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Баланс между размером файла и четкостью
                </Typography>
              </Box>
              <Chip
                label={`${importSettings.quality}%`}
                size="small"
                color="primary"
                sx={{ fontWeight: 800, borderRadius: "6px" }}
              />
            </Stack>

            <Box sx={{ px: 1, mb: 3 }}>
              <Slider
                value={importSettings.quality}
                min={10}
                max={100}
                step={5}
                marks={[
                  { value: 10, label: "Min" },
                  { value: 80, label: "Рекомендуется" },
                  { value: 100, label: "Max" },
                ]}
                onChange={(_, v) =>
                  setImportSettings((p) => ({ ...p, quality: v }))
                }
                onChangeCommitted={(_, v) =>
                  handleSettingChange({ quality: v })
                }
                sx={{
                  "& .MuiSlider-markLabel": {
                    fontSize: "0.65rem",
                    fontWeight: 600,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.4 }}
              >
                <b>80%</b> — золотая середина. Фото визуально неотличимы от
                оригинала, но весят на 60% меньше. При <b>100%</b> сжатие почти
                отсутствует, что увеличит нагрузку на сеть.
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
