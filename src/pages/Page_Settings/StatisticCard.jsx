// pages/Page_Settings/StatisticCard.jsx
// Статистика хранилища: занятое место, медиафайлы и размеры базы.
// Импорт и экспорт живут в разделе «Места хранения данных».

import React, { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  List,
  ListItem,
  Tooltip,
  Grid,
  Card,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PieChartIcon from "@mui/icons-material/PieChart";
import PhotoSizeSelectLargeIcon from "@mui/icons-material/PhotoSizeSelectLarge";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DescriptionIcon from "@mui/icons-material/Description";
import StorageIcon from "@mui/icons-material/Storage";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
  chevron,
} from "./settingsUi";

export const StatisticCard = ({ cardStyle }) => {
  const [storageStats, setStorageStats] = useState(null);

  // --- Состояния диска ---
  const [totalSize, setTotalSize] = useState(null);
  const [diskInfo, setDiskInfo] = useState({ total: 0, free: 0 });

  // Основные переменные для расчетов
  const total = diskInfo.total || 1;
  const free = diskInfo.free;
  const library = parseFloat(totalSize) || 0;
  const other = Math.max(0, total - free - library);

  const libPct = (library / total) * 100;
  const otherPct = (other / total) * 100;

  const formatSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " МБ";
  };

  const formatStorage = (mb) => {
    const val = parseFloat(mb);
    if (!val || isNaN(val)) return "0 GB";
    if (val < 1024) return `${val.toFixed(1)} MB`;
    return `${(val / 1024).toFixed(1)} GB`;
  };

  // --- Эффекты ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const diskData = await window.electronAPI.getDiskUsage();
        if (diskData) setDiskInfo(diskData);

        const detailedData = await window.appAPI.getDetailedStorageStats();
        if (detailedData) setStorageStats(detailedData);
      } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
      }
    };

    loadAllData();
    const interval = setInterval(loadAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTotalSize();
    window.appAPI.onFolderSizeUpdated?.(() => fetchTotalSize());
  }, []);

  function fetchTotalSize() {
    window.appAPI.getFolderSize().then(setTotalSize);
  }

  function StatRow({
    icon,
    color = "gray",
    label,
    value,
    detailList,
    hoverLabel,
  }) {
    const content = (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.4,
          width: "100%",
        }}
      >
        <RowIcon bg={color}>{icon}</RowIcon>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            variant="body2"
            fontWeight={400}
            noWrap
            sx={{ fontSize: "0.8125rem" }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: "0.8125rem",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {value}
        </Typography>
      </Box>
    );

    if (!detailList || !detailList.length) return content;

    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5, minWidth: 220 }}>
            <Typography
              variant="caption"
              sx={{ opacity: 0.8, display: "block", mb: 1 }}
            >
              {hoverLabel || label}
            </Typography>
            <List dense disablePadding sx={{ m: 0 }}>
              {detailList.map((item) => (
                <ListItem
                  key={item.label}
                  disableGutters
                  sx={{ py: 0.25, px: 0 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {item.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        }
        arrow
        placement="top"
        sx={{
          "& .MuiTooltip-tooltip": {
            bgcolor: "rgba(17, 24, 39, 0.96)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 2,
            color: "#fff",
          },
        }}
      >
        <Box>{content}</Box>
      </Tooltip>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
        <RowIcon bg="indigo">
          <PieChartIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Статистика хранилища
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Размеры файлов и обслуживание
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          pb: 2,
          flexGrow: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
          <Stack spacing={2.5} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Box>
              <Typography sx={sectionLabelSx}>Системный том</Typography>
              <Box sx={groupSx}>
                <Box sx={{ px: 2, py: 2 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="baseline"
                    sx={{ mb: 1.25 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Занято{" "}
                        {(((total - free) / total) * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatStorage(total - free)} из {formatStorage(total)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatStorage(free)} свободно
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      height: 10,
                      width: "100%",
                      bgcolor: "action.hover",
                      borderRadius: "5px",
                      overflow: "hidden",
                      display: "flex",
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${libPct}%`,
                        bgcolor: "primary.main",
                        transition: "width 1s",
                      }}
                    />
                    <Box
                      sx={{
                        width: `${otherPct}%`,
                        bgcolor: "text.disabled",
                        opacity: 0.55,
                      }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Stack direction="row" spacing={1}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "3px",
                            bgcolor: "primary.main",
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Файлы библиотеки
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {formatStorage(library)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Stack direction="row" spacing={1}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "3px",
                            bgcolor: "text.disabled",
                            opacity: 0.55,
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Система и кэш
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {formatStorage(total - free - library)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Stack direction="row" spacing={1}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "3px",
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider",
                            mt: 0.5,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ fontSize: "0.65rem", lineHeight: 1.1 }}
                          >
                            Доступно (прибл.)
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={free < 10240 ? "error.main" : "inherit"}
                          >
                            {formatStorage(free)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Медиа файлы</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <StatRow
                    color="blue"
                    icon={<CameraAltIcon sx={{ fontSize: 18 }} />}
                    label="Оригиналы"
                    value={formatSize(storageStats?.original || 0)}
                  />
                  <StatRow
                    color="green"
                    icon={<PhotoSizeSelectLargeIcon sx={{ fontSize: 18 }} />}
                    label="Сжатые (WebP)"
                    value={formatSize(storageStats?.webp || 0)}
                  />
                  <StatRow
                    color="gray"
                    icon={<PhotoLibraryIcon sx={{ fontSize: 18 }} />}
                    label="Превью (Thumbs)"
                    value={formatSize(storageStats?.thumbs || 0)}
                  />
                </Stack>
              </Box>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Инфо и БД</Typography>
              <Box sx={groupSx}>
                <Stack divider={<RowDivider />}>
                  <StatRow
                    color="indigo"
                    icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                    label="Биографии (BIO)"
                    value={formatSize(storageStats?.bio || 0)}
                  />
                  <StatRow
                    color="green"
                    icon={<StorageIcon sx={{ fontSize: 18 }} />}
                    label="База данных"
                    value={formatSize(
                      Math.max(
                        0,
                        (storageStats?.db || 0) +
                          (storageStats?.sqlite || 0) -
                          (storageStats?.externalJson || 0),
                      ),
                    )}
                    hoverLabel="База данных"
                    detailList={[
                      {
                        label: "База данных",
                        value: formatSize(storageStats?.db || 0),
                      },
                      {
                        label: "external-entities.json",
                        value: formatSize(storageStats?.externalJson || 0),
                      },
                      {
                        label: "SQLite (genealogy.sqlite)",
                        value: formatSize(storageStats?.sqlite || 0),
                      },
                    ]}
                  />
                  <StatRow
                    color="orange"
                    icon={<FolderOpenIcon sx={{ fontSize: 18 }} />}
                    label="Папка external"
                    value={formatSize(storageStats?.externalFolder || 0)}
                  />
                  <SettingsRow
                    icon={
                      <RowIcon bg="gray">
                        <FolderOpenIcon sx={{ fontSize: 18 }} />
                      </RowIcon>
                    }
                    title="Открыть директорию"
                    onClick={() => window.appAPI.openDataFolder()}
                    trailing={chevron}
                  />
                </Stack>
              </Box>
            </Box>
        </Stack>
      </Box>
    </Card>
  );
};
