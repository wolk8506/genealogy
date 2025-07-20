// src/components/UpdateBanner.jsx

import React, { useState, useEffect } from "react";
import { Snackbar, Alert, Button } from "@mui/material";

export function UpdateBanner({ onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => {
    window.updater.onAppUpdate((info) => {
      setVersion(info.version);
      setOpen(true);
    });
    // отписка, если нужно
    return () => {
      window.updater.removeAllListeners?.("app:update-available");
    };
  }, []);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const handleSettings = () => {
    setOpen(false);
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
          <Button color="inherit" size="small" onClick={handleSettings}>
            Настройки
          </Button>
        }
        sx={{ alignItems: "center" }}
      >
        Доступна новая версия <strong>{version}</strong>.
        <br /> Перейдите в настройки для загрузки.
      </Alert>
    </Snackbar>
  );
}

/*
вот что еще нужно сделать или разобраться нужно оно или нет

Windows и Linux
- Добавить nsis и AppImage таргеты в билд.
- Для Windows: выбрать между full installer и delta (NSIS).
- Для Linux: AppImage загрузка через тот же downloadFile с корректным URL.
Обработка ошибок
- Retry на ошибку сети: 3 попытки по экспоненте.
- Timeout: если downloadFile висит более 2 минут — сообщить пользователю.
*/
