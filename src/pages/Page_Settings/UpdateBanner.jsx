// src/components/UpdateBanner.jsx

import React, { useState, useEffect } from "react";
import { Snackbar, Alert, Button, Box } from "@mui/material";

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
          <Box>
            <Button color="inherit" size="small" onClick={handleClose}>
              Закрыть
            </Button>
            <Button color="inherit" size="small" onClick={handleSettings}>
              Настройки
            </Button>
          </Box>
        }
        sx={{
          alignItems: "center",
          borderRadius: "16px",
          gap: "10px",
        }}
      >
        Доступна новая версия <strong>{version}</strong>.
        <br /> Перейдите в настройки для загрузки.
      </Alert>
    </Snackbar>
  );
}
