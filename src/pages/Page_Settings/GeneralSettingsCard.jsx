import React, { useContext, useEffect, useState } from "react";
import { Card, Box, Typography, Stack, Slider, Divider } from "@mui/material";

import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { useSettingsStore } from "../../store/useSettingsStore";
import { ThemeContext } from "../../theme/ThemeContext.cjs";
import CustomSwitch from "../../components/CustomSwitch";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
  SegmentedControl,
} from "./settingsUi";

function SliderRow({ icon, title, subtitle, valueLabel, slider }) {
  return (
    <Box sx={{ px: 2, py: 1.4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {icon}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {valueLabel}
        </Typography>
      </Stack>
      <Box sx={{ px: 2 }}>{slider}</Box>
    </Box>
  );
}

export const GeneralSettingsCard = ({ cardStyle }) => {
  const { auto, setAuto, userPref, setUserPref } = useContext(ThemeContext);

  const appSettings = useSettingsStore((state) => state.appSettings);
  const updateAppSettings = useSettingsStore(
    (state) => state.updateAppSettings,
  );

  const [tempSettings, setTempSettings] = useState(appSettings);

  useEffect(() => {
    setTempSettings(appSettings);
  }, [appSettings]);

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
          <DisplaySettingsIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Общие параметры
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Внешний вид и поведение приложения
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={sectionLabelSx}>Оформление</Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                <SettingsRow
                  icon={
                    <RowIcon bg="indigo">
                      <Brightness4Icon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Системная тема"
                  subtitle="Использовать настройки вашей ОС"
                  trailing={
                    <CustomSwitch
                      checked={auto}
                      onChange={(e) => setAuto(e.target.checked)}
                    />
                  }
                  onClick={() => setAuto(!auto)}
                />
                <Box
                  sx={{
                    px: 2,
                    py: 1.4,
                    opacity: auto ? 0.45 : 1,
                    pointerEvents: auto ? "none" : "auto",
                  }}
                >
                  <SegmentedControl
                    value={userPref}
                    onChange={setUserPref}
                    options={[
                      { value: "light", label: "Светлая" },
                      { value: "dark", label: "Тёмная" },
                    ]}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>Поведение</Typography>
            <Box sx={groupSx}>
              <Stack divider={<Divider sx={{ ml: 2 }} />}>
                <SliderRow
                  icon={
                    <RowIcon bg="orange">
                      <NewReleasesIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Лейбл «Новый / Изменён»"
                  subtitle="Время отображения метки на карточках"
                  valueLabel={`${tempSettings.newLabelDuration} ч`}
                  slider={
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
                      onChange={(_, v) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          newLabelDuration: v,
                        }))
                      }
                      onChangeCommitted={(_, v) =>
                        updateAppSettings({ newLabelDuration: v })
                      }
                      sx={{
                        mt: 1,
                        "& .MuiSlider-markLabel": {
                          fontSize: "0.65rem",
                          fontWeight: 600,
                        },
                      }}
                    />
                  }
                />
                <SliderRow
                  icon={
                    <RowIcon bg="green">
                      <CloudUploadIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Лимит размера файла"
                  subtitle="Ограничение при загрузке медиа"
                  valueLabel={`${tempSettings.maxUploadSize} ГБ`}
                  slider={
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
                        setTempSettings((prev) => ({
                          ...prev,
                          maxUploadSize: v,
                        }))
                      }
                      onChangeCommitted={(_, v) =>
                        updateAppSettings({ maxUploadSize: v })
                      }
                      sx={{
                        mt: 1,
                        "& .MuiSlider-markLabel": {
                          fontSize: "0.65rem",
                          fontWeight: 600,
                        },
                      }}
                    />
                  }
                />
              </Stack>
            </Box>
          </Box>
        </Stack>
      </Box>
    </Card>
  );
};
