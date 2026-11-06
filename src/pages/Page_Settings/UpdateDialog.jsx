import React, { useEffect, useMemo, useState } from "react";
import { Box, Dialog, LinearProgress, Typography } from "@mui/material";
import DialogActionButton, {
  DialogActionsBar,
} from "../../components/Dialog/DialogActionButton";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useUpdateStore } from "../../store/useUpdateStore";
import { sectionLabelSx } from "./settingsUi";
import { parseReleaseNotes } from "./releaseNotes";
import { ReleaseNotesList } from "./ReleaseNotesList";

// Через сколько снова напомнить о той же версии после «Напомнить позже».
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export function UpdateDialog() {
  const notice = useUpdateStore((s) => s.notice);
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const progress = useUpdateStore((s) => s.progress);
  const downloading = useUpdateStore((s) => s.downloading);
  const downloaded = useUpdateStore((s) => s.downloaded);
  const installing = useUpdateStore((s) => s.installing);
  const error = useUpdateStore((s) => s.error);

  const settingsLoaded = useSettingsStore((s) => s.settingsLoaded);
  const snooze = useSettingsStore(
    (s) => s.appSettings.updateSnooze,
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const store = useUpdateStore.getState();
    store.bind();
    store.loadMeta();
  }, []);

  const notes = useMemo(
    () => parseReleaseNotes(notice?.releaseNotes),
    [notice],
  );

  // Стартовая проверка сообщает о новой версии один раз за запуск;
  // если этой версии ещё не «спрятали» на 3 дня — показываем окно.
  // Явная проверка из меню («manual») показываем всегда.
  useEffect(() => {
    if (!settingsLoaded || !notice) {
      setOpen(false);
      return;
    }
    if (
      !notice.manual &&
      snooze?.version === notice.version &&
      Date.now() < snooze.until
    ) {
      useUpdateStore.getState().dismissNotice();
      return;
    }
    setOpen(true);
  }, [settingsLoaded, notice, snooze]);

  const remindLater = () => {
    if (notice) {
      useSettingsStore
        .getState()
        .updateAppSettings({
          updateSnooze: { version: notice.version, until: Date.now() + SNOOZE_MS },
        });
    }
    useUpdateStore.getState().dismissNotice();
    setOpen(false);
  };

  const primaryLabel = error
    ? "Повторить"
    : installing
      ? "Запуск установщика…"
      : downloaded
        ? "Установить и перезапустить"
        : downloading
          ? "Загрузка…"
          : "Обновить сейчас";

  const handlePrimary = () => {
    const store = useUpdateStore.getState();
    if (error) return store.check();
    if (installing) return;
    if (downloaded) return store.install();
    return store.download();
  };

  return (
    <Dialog
      open={open}
      onClose={remindLater}
      transitionDuration={{ enter: 180, exit: 140 }}
      slotProps={{
        paper: {
          sx: (t) => ({
            width: 440,
            maxWidth: "calc(100vw - 32px)",
            bgcolor:
              t.palette.mode === "dark"
                ? "rgba(26,26,26,0.92)"
                : "rgba(249,249,249,0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid",
            borderColor:
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            boxShadow:
              t.palette.mode === "dark"
                ? "0 18px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
                : "0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.8)",
            overflow: "hidden",
          }),
        },
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: "center" }}>
        <Box
          component="img"
          src="./app-icon.png"
          alt=""
          sx={{
            width: 72,
            height: 72,
            borderRadius: "16px",
            mb: 1.5,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
        <Typography
          sx={{
            fontSize: "1.25rem",
            fontWeight: 600,
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          Genealogy {notice?.version}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Доступно обновление
          {currentVersion ? ` · установлена версия ${currentVersion}` : ""}
        </Typography>
      </Box>

      {notes.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 } }}>
          <Typography sx={sectionLabelSx}>Что нового</Typography>
          <ReleaseNotesList
            groups={notes}
            sx={{ maxHeight: 200, overflowY: "auto" }}
          />
        </Box>
      )}

      {error ? (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 } }}>
          <Typography variant="caption" color="error.main" sx={{ wordBreak: "break-word" }}>
            Не удалось загрузить обновление: {error}
          </Typography>
        </Box>
      ) : downloading ? (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 } }}>
          <LinearProgress
            variant={progress > 0 ? "determinate" : "indeterminate"}
            value={progress}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            {progress > 0 ? `Загрузка: ${progress}%` : "Подготовка загрузки…"}
          </Typography>
        </Box>
      ) : downloaded ? (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 } }}>
          <Typography variant="caption" color="text.secondary">
            Установка готова — приложение закроется само
          </Typography>
        </Box>
      ) : null}

      <DialogActionsBar
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 1,
          pb: { xs: 2, sm: 3 },
          gap: "10px",
          "& > .MuiButton-root": { flex: 1, minWidth: 0, maxWidth: "none" },
        }}
      >
        <DialogActionButton
          onClick={remindLater}
          disabled={installing}
          sx={(t) => ({
            bgcolor:
              t.palette.mode === "dark"
                ? "rgba(12,12,12,0.9)"
                : "rgba(0,0,0,0.06)",
            "&:hover": {
              bgcolor:
                t.palette.mode === "dark"
                  ? "rgba(24,24,24,0.95)"
                  : "rgba(0,0,0,0.1)",
            },
          })}
        >
          Напомнить позже
        </DialogActionButton>
        <DialogActionButton
          tone="primary"
          onClick={handlePrimary}
          disabled={installing}
          autoFocus
        >
          {primaryLabel}
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
