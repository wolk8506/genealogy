import React, { useState } from "react";
import { useSnackbar } from "notistack";
import {
  Box,
  Stack,
  Typography,
  Button,
  TextField,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import { DeleteForever as DeleteForeverIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { alpha } from "@mui/material/styles";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const DangerZoneCard = ({ cardStyle }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const { enqueueSnackbar } = useSnackbar();
  const handleClearData = async (type) => {
    const label = type === "originals" ? "оригиналы" : "кэш (webp/thumbs)";

    // Подтверждение действия
    if (
      !window.confirm(
        `Вы уверены, что хотите удалить ${label}? Это действие необратимо.`,
      )
    ) {
      return;
    }

    try {
      // Вызов метода из preload.js / main.js
      const success = await window.appAPI.deleteMedia(type);

      if (success) {
        enqueueSnackbar(`Данные (${label}) успешно удалены`, {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Данные (${label}) успешно удалены`,
          type: "success",
        });
      } else {
        enqueueSnackbar(`Не удалось удалить ${label}`, {
          variant: "error",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Не удалось удалить ${label}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      enqueueSnackbar("Произошла системная ошибка при удалении", {
        variant: "error",
      });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "⚠️ Опасная зона",
        message: "Произошла системная ошибка при удалении",
        type: "error",
      });
    }
  };

  const handleFullReset = async () => {
    if (resetConfirmText !== "УДАЛИТЬ") {
      enqueueSnackbar("Введите 'УДАЛИТЬ' для подтверждения", {
        variant: "error",
      });
      return;
    }

    try {
      const success = await window.appAPI.fullReset();
      if (success) {
        setResetDialogOpen(false);
        setResetConfirmText("");
        enqueueSnackbar("Все данные (база и фото) полностью удалены", {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Опасная зона",
          message: `Все данные (база и фото) полностью удалены`,
          type: "success",
        });
        // loadAll(); // Обновляем список (станет пустым)
        // fetchTotalSize(); // Обновляем размер папки
      }
    } catch (err) {
      enqueueSnackbar("Ошибка при очистке: " + err.message, {
        variant: "error",
      });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "⚠️ Опасная зона",
        message: "Ошибка при очистке: " + err.message,
        type: "error",
      });
    }
  };
  return (
    <Card
      variant="outlined"
      sx={{
        // width: "100%",
        ...cardStyle,
        // width: "600px",
        // p: 2.5,
        // borderRadius: 3,
        border: "1px dashed",
        borderColor: "error.main",
        bgcolor: alpha(theme.palette.error.main, 0.02),
        // flexGrow: 1,
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
        <WarningAmberIcon color="primary" sx={{ fontSize: 20 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: 1,
          }}
        >
          Опасная зона
        </Typography>
      </Box>

      <Stack sx={{ p: 2.5 }} spacing={2.5}>
        {/* Блок Оригиналы */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: isDark ? alpha("#000", 0.2) : "#fff",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              display: "block",
              mb: 0.5,
            }}
          >
            ОРИГИНАЛЬНЫЕ ФОТО
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mb: 1.5,
              lineHeight: 1.3,
            }}
          >
            Занимают много места, но хранят исходное качество.
            <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
              {" "}
              Удаление необратимо
            </Box>{" "}
            — вернуть качество после будет невозможно.
          </Typography>
          <Button
            fullWidth
            size="small"
            color="error"
            variant="outlined"
            onClick={() => handleClearData("originals")}
            sx={{
              borderRadius: "8px",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Удалить оригиналы
          </Button>
        </Box>

        {/* Блок Кэш */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: isDark ? alpha("#000", 0.2) : "#fff",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              display: "block",
              mb: 0.5,
            }}
          >
            ВРЕМЕННЫЙ КЭШ (WEB-ВЕРСИИ)
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              mb: 1.5,
              lineHeight: 1.3,
            }}
          >
            Используется для быстрой загрузки превью в браузере. Можно безопасно
            удалить для очистки места, кэш пересоберется автоматически при
            просмотре.
          </Typography>
          <Button
            fullWidth
            size="small"
            color="error"
            variant="outlined"
            onClick={() => handleClearData("cache")}
            sx={{
              borderRadius: "8px",
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Удалить кэш
          </Button>
        </Box>

        {/* Финальное предупреждение и Сброс */}
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              px: 1,
              color: "error.main",
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16, mt: 0.2 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontStyle: "italic",
                lineHeight: 1.2,
              }}
            >
              Перед удалением убедитесь, что у вас создана резервная копия
              данных на внешнем носителе!
            </Typography>
          </Box>

          <Button
            fullWidth
            color="error"
            variant="contained"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setResetDialogOpen(true)}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 800,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "error.dark",
                boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              },
            }}
          >
            Полный сброс базы данных
          </Button>
        </Stack>
      </Stack>
      {/* Диалог подтверждения полного удаления */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
          ⚠️ Полная очистка данных
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Это действие безвозвратно удалит <strong>всех людей</strong> и{" "}
            <strong>все фотографии</strong> из папки Genealogy. Приложение
            станет абсолютно чистым.
          </DialogContentText>
          <TextField
            fullWidth
            label="Введите слово УДАЛИТЬ"
            variant="outlined"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResetDialogOpen(false)} color="inherit">
            Отмена
          </Button>
          <Button
            onClick={handleFullReset}
            color="error"
            variant="contained"
            disabled={resetConfirmText !== "УДАЛИТЬ"}
          >
            Удалить всё навсегда
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
