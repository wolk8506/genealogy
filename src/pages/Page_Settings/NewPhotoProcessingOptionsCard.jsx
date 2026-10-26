import React, { useEffect, useState } from "react";

import { Box, Stack, Typography, Card, Slider } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import CustomSwitch from "../../components/CustomSwitch";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  SettingsRow,
} from "./settingsUi";

export const NewPhotoProcessingOptionsCard = ({ cardStyle }) => {
  const [importSettings, setImportSettings] = useState({
    keepOriginals: true,
    quality: 80,
  });

  useEffect(() => {
    if (window.settings && window.settings.get) {
      window.settings.get("importSettings").then((saved) => {
        if (saved) setImportSettings(saved);
      });
    }
  }, []);

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
          <SettingsIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Обработка новых фото
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Импорт, сжатие и хранение оригиналов
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={sectionLabelSx}>Импорт</Typography>
            <Box sx={groupSx}>
              <SettingsRow
                icon={
                  <RowIcon bg="green">
                    <SaveIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Сохранять исходные файлы"
                subtitle="Копия в папке originals"
                trailing={
                  <CustomSwitch
                    checked={importSettings.keepOriginals}
                    onChange={(e) =>
                      handleSettingChange({
                        keepOriginals: e.target.checked,
                      })
                    }
                  />
                }
                onClick={() =>
                  handleSettingChange({
                    keepOriginals: !importSettings.keepOriginals,
                  })
                }
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1, ml: 0.5, lineHeight: 1.4 }}
            >
              Копия в папке <b>originals</b> позволяет вернуться к исходному
              качеству, но требует в 2–3 раза больше места на диске.
            </Typography>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>Качество WebP</Typography>
            <Box sx={groupSx}>
              <Box sx={{ px: 2, py: 1.4 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={400}
                      sx={{ fontSize: "0.8125rem" }}
                    >
                      Степень сжатия
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Баланс между размером файла и чёткостью
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {importSettings.quality}%
                  </Typography>
                </Stack>
                <Box sx={{ px: 2 }}>
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
                      mt: 1,
                      "& .MuiSlider-markLabel": {
                        fontSize: "0.65rem",
                        fontWeight: 600,
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1, ml: 0.5, lineHeight: 1.4 }}
            >
              <b>80%</b> — золотая середина: фото визуально неотличимы от
              оригинала, но весят на 60% меньше. При <b>100%</b> сжатие почти
              отсутствует, что увеличит нагрузку на сеть.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
