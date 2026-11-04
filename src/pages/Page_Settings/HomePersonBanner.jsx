import React, { useState } from "react";
import { Snackbar, Alert, Button, Box } from "@mui/material";
import { useSettingsStore } from "../../store/useSettingsStore";

// Пока домашний человек («Это я») не выбран, напоминаем о нём при каждом
// запуске — тем же уведомлением, что и о доступном обновлении.
export function HomePersonBanner({ onOpenSettings, hasPeople = true }) {
  const settingsLoaded = useSettingsStore((state) => state.settingsLoaded);
  const homePersonId = useSettingsStore(
    (state) => state.appSettings.homePersonId,
  );
  const [dismissed, setDismissed] = useState(false);

  const open =
    settingsLoaded && hasPeople && !homePersonId && !dismissed;

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setDismissed(true);
  };

  const handleOpenSettings = () => {
    setDismissed(true);
    onOpenSettings();
  };

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        severity="info"
        onClose={handleClose}
        action={
          <Box>
            <Button color="inherit" size="small" onClick={handleClose}>
              Позже
            </Button>
            <Button color="inherit" size="small" onClick={handleOpenSettings}>
              Выбрать
            </Button>
          </Box>
        }
        sx={{
          alignItems: "center",
          borderRadius: "15px",
          gap: "10px",
        }}
      >
        Не указано, кто вы в этой библиотеке.
        <br /> Выберите свою карточку, чтобы дерево открывалось от вас.
      </Alert>
    </Snackbar>
  );
}
