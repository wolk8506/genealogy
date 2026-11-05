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
  sliderSx,
} from "./settingsUi";

const edgeLabelSx = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "text.primary",
  lineHeight: 1.4,
};

function SliderRow({ icon, title, subtitle, valueLabel, startLabel, endLabel, slider }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.4,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ flex: "1 1 220px", minWidth: 0 }}
      >
        {icon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>
            {title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ lineHeight: 1.35 }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flexShrink: 0,
            pr: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {valueLabel}
        </Typography>
      </Stack>
      <Box sx={{ flex: "1 1 240px", minWidth: 200, maxWidth: 380, px: 1.25 }}>
        {slider}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: -0.5 }}>
          <Typography sx={edgeLabelSx}>{startLabel}</Typography>
          <Typography sx={edgeLabelSx}>{endLabel}</Typography>
        </Box>
      </Box>
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
        borderRadius: "16px",
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
                  startLabel="24 ч"
                  endLabel="72 ч"
                  slider={
                    <Slider
                      value={tempSettings.newLabelDuration}
                      min={24}
                      max={72}
                      step={12}
                      marks={[24, 36, 48, 60, 72]
                        .filter((v) => v !== tempSettings.newLabelDuration)
                        .map((value) => ({ value }))}
                      onChange={(_, v) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          newLabelDuration: v,
                        }))
                      }
                      onChangeCommitted={(_, v) =>
                        updateAppSettings({ newLabelDuration: v })
                      }
                      sx={sliderSx}
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
                  valueLabel={
                    tempSettings.maxUploadSize >= 1
                      ? "1 ГБ"
                      : `${Math.round(tempSettings.maxUploadSize * 1000)} МБ`
                  }
                  startLabel="100 МБ"
                  endLabel="1 ГБ"
                  slider={
                    <Slider
                      value={tempSettings.maxUploadSize}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      marks={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
                        .filter(
                          (v) =>
                            Math.abs(v - tempSettings.maxUploadSize) > 0.001,
                        )
                        .map((value) => ({ value }))}
                      onChange={(_, v) =>
                        setTempSettings((prev) => ({
                          ...prev,
                          maxUploadSize: v,
                        }))
                      }
                      onChangeCommitted={(_, v) =>
                        updateAppSettings({ maxUploadSize: v })
                      }
                      sx={sliderSx}
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
