import React, { useState } from "react";

import { Box, Stack, Typography, Button, Card } from "@mui/material";

import SdStorageIcon from "@mui/icons-material/SdStorage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CollectionsIcon from "@mui/icons-material/Collections";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import { useTheme } from "@mui/material/styles";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import { alpha } from "@mui/material/styles";
import PhotoConverterModal from "./PhotoConverterModal";

export const OptimizationMasterCard = ({ cardStyle }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [converterOpen, setConverterOpen] = useState(false);
  return (
    <Card
      sx={{
        ...cardStyle,
        // width: "600px",
        // p: 0,
        // borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        // height: "530px",
        // display: "flex",
        // flexDirection: "column",
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      }}
    >
      {/* ШАПКА */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <AutoFixHighIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Интеллектуальный помощник
        </Typography>
      </Box>

      <Box
        sx={{
          p: 3,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* ЦЕНТРАЛЬНЫЙ БЛОК: Иконка и Описание */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              position: "relative",
              display: "inline-flex",
              mb: 2,
              "&::after": {
                content: '""',
                position: "absolute",
                // width: "100%",
                height: "100%",
                bgcolor: "primary.main",
                filter: "blur(35px)",
                opacity: 0.15,
                zIndex: 0,
              },
            }}
          >
            <AutoFixHighIcon
              sx={{
                fontSize: 80,
                color: "primary.main",
                position: "relative",
                zIndex: 1,
              }}
            />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
            Мастер оптимизации
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              lineHeight: 1.5,
              px: 1,
            }}
          >
            Автоматизированная система подготовки медиа-файлов для быстрой
            работы архива.
          </Typography>
        </Box>

        {/* СПИСОК ФУНКЦИЙ: Заполняет пространство */}
        <Stack spacing={1} sx={{ mb: "auto" }}>
          {[
            {
              title: "Конвертация в WebP",
              desc: "Уменьшение веса фото до 70% без потери четкости",
              icon: <SdStorageIcon sx={{ fontSize: 18 }} color="primary" />,
            },
            {
              title: "Генерация миниатюр",
              desc: "Мгновенная загрузка превью в дереве и списках",
              icon: <CollectionsIcon sx={{ fontSize: 18 }} color="primary" />,
            },
            {
              title: "Умное хранение",
              desc: "Разделение оригиналов и оптимизированных копий",
              icon: <AccountTreeIcon sx={{ fontSize: 18 }} color="primary" />,
            },
          ].map((item, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                gap: 2,
                px: 1.5,
                pt: 1,
                pb: 0.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.action.hover, 0.4),
              }}
            >
              <Box sx={{ mt: 0.5 }}>{item.icon}</Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    display: "block",
                    color: "text.primary",
                    lineHeight: 1,
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.65rem",
                    color: "text.secondary",
                  }}
                >
                  {item.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* НИЖНИЙ БЛОК */}
        <Box sx={{ mt: 3 }}>
          <Button
            fullWidth
            variant="contained"
            // size="large"
            startIcon={<SettingsSuggestIcon />}
            onClick={() => setConverterOpen(true)}
            sx={{
              // py: 2,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: "0.9rem",
              textTransform: "none",
              boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
              "&:hover": {
                bgcolor: "primary.dark",
                transform: "translateY(-2px)",
              },
              transition: "all 0.2s",
            }}
          >
            Настроить и запустить
          </Button>
        </Box>
      </Box>
      <PhotoConverterModal
        open={converterOpen}
        onClose={() => setConverterOpen(false)}
      />
    </Card>
  );
};
