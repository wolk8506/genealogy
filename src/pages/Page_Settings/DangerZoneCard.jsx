import React, { useState } from "react";
import { useSnackbar } from "notistack";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Card,
  Dialog,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import { DeleteForever as DeleteForeverIcon } from "@mui/icons-material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ConfirmDialog from "../../components/Dialog/ConfirmDialog";
import AppButton from "../../components/AppButton";
import DialogActionButton, {
  DialogActionsBar,
} from "../../components/Dialog/DialogActionButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  groupSx,
  sectionLabelSx,
  RowIcon,
  RowDivider,
  SettingsRow,
} from "./settingsUi";

export const DangerZoneCard = ({ cardStyle }) => {
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [pendingClearType, setPendingClearType] = useState(null);
  const [clearBusy, setClearBusy] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const handleClearData = async (type) => {
    const label = type === "originals" ? "оригиналы" : "кэш (webp/thumbs)";

    setClearBusy(true);
    try {
      // Вызов метода из preload.js / main.js
      const success = await window.appAPI.deleteMedia(type);

      if (success) {
        enqueueSnackbar(`Данные (${label}) успешно удалены`, {
          variant: "success",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Удаление данных",
          message: `Данные (${label}) успешно удалены`,
          type: "success",
          category: "dangerZone",
        });
      } else {
        enqueueSnackbar(`Не удалось удалить ${label}`, {
          variant: "error",
        });
        addNotification({
          timestamp: new Date().toISOString(),
          title: "⚠️ Удаление данных",
          message: `Не удалось удалить ${label}`,
          type: "error",
          category: "dangerZone",
        });
      }
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      enqueueSnackbar("Произошла системная ошибка при удалении", {
        variant: "error",
      });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "⚠️ Удаление данных",
        message: "Произошла системная ошибка при удалении",
        type: "error",
        category: "dangerZone",
      });
    } finally {
      setClearBusy(false);
      setPendingClearType(null);
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
          title: "⚠️ Удаление данных",
          message: `Все данные (база и фото) полностью удалены`,
          type: "success",
          category: "dangerZone",
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
        title: "⚠️ Удаление данных",
        message: "Ошибка при очистке: " + err.message,
        type: "error",
        category: "dangerZone",
      });
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
        <RowIcon bg="red">
          <WarningAmberIcon sx={{ fontSize: 18 }} />
        </RowIcon>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Удаление данных
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Необратимые действия с фото и базой
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={sectionLabelSx}>Медиа</Typography>
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                <SettingsRow
                  icon={
                    <RowIcon bg="red">
                      <DeleteForeverIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Оригинальные фото"
                  subtitle="Исходное качество будет потеряно безвозвратно"
                  trailing={
                    <AppButton
                      preset="dangerOutlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.currentTarget.blur();
                        setPendingClearType("originals");
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      Удалить
                    </AppButton>
                  }
                />
                <SettingsRow
                  icon={
                    <RowIcon bg="orange">
                      <DeleteForeverIcon sx={{ fontSize: 18 }} />
                    </RowIcon>
                  }
                  title="Кэш WebP и Thumbs"
                  subtitle="Пересоберётся автоматически при просмотре"
                  trailing={
                    <AppButton
                      preset="dangerOutlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.currentTarget.blur();
                        setPendingClearType("cache");
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      Удалить
                    </AppButton>
                  }
                />
              </Stack>
            </Box>
          </Box>

          <Box>
            <Typography sx={sectionLabelSx}>База данных</Typography>
            <Box sx={groupSx}>
              <SettingsRow
                danger
                icon={
                  <RowIcon bg="red">
                    <DeleteForeverIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Полный сброс базы данных"
                subtitle="Удалить всех людей и фотографии"
                trailing={
                  <ChevronRightIcon
                    sx={{ fontSize: 20, color: "error.main" }}
                  />
                }
                onClick={(e) => {
                  e.currentTarget.blur();
                  setResetDialogOpen(true);
                }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              px: 0.5,
              color: "error.main",
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16, mt: 0.2 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, lineHeight: 1.4 }}
            >
              Перед удалением убедитесь, что у вас создана резервная копия
              данных на внешнем носителе!
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Диалог подтверждения удаления оригиналов/кэша */}
      <ConfirmDialog
        open={pendingClearType != null}
        title="Удаление данных"
        message={
          pendingClearType
            ? `Вы уверены, что хотите удалить ${
                pendingClearType === "originals"
                  ? "оригиналы"
                  : "кэш (webp/thumbs)"
              }? Это действие необратимо.`
            : ""
        }
        confirmLabel="Удалить"
        confirmColor="error"
        busy={clearBusy}
        onClose={(ok) => {
          if (ok && pendingClearType) handleClearData(pendingClearType);
          else setPendingClearType(null);
        }}
      />

      {/* Диалог подтверждения полного удаления */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        transitionDuration={{ enter: 180, exit: 140 }}
        PaperProps={{
          sx: { borderRadius: "20px", backgroundImage: "none" },
        }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            textAlign="center"
            color="error.main"
            sx={{ mb: 2 }}
          >
            Полная очистка данных
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.5 }}
          >
            Это действие безвозвратно удалит <b>всех людей</b> и{" "}
            <b>все фотографии</b> из папки Genealogy. Приложение станет
            абсолютно чистым.
          </Typography>
          <TextField
            fullWidth
            label="Введите слово УДАЛИТЬ"
            size="small"
            variant="outlined"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            autoFocus
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />
        </Box>
        <DialogActionsBar sx={{ px: 3, pb: 3, pt: 2 }}>
          <DialogActionButton onClick={() => setResetDialogOpen(false)}>
            Отмена
          </DialogActionButton>
          <DialogActionButton
            tone="danger"
            onClick={handleFullReset}
            disabled={resetConfirmText !== "УДАЛИТЬ"}
          >
            Удалить всё навсегда
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>
    </Card>
  );
};
