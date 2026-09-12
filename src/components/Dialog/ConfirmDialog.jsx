import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AppButton from "../AppButton";

// Простое подтверждение вместо нативного window.confirm:
// не блокирует main-процесс и выглядит как остальной UI.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  confirmColor = "primary",
  busy = false,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose(false);
      }}
      PaperProps={{ sx: { borderRadius: 3 } }}
      maxWidth="xs"
      fullWidth
    >
      {title && (
        <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      )}
      <DialogContent>
        {typeof message === "string" ? (
          <DialogContentText>{message}</DialogContentText>
        ) : (
          message
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <AppButton
          preset="ghost"
          onClick={() => onClose(false)}
          disabled={busy}
        >
          {cancelLabel}
        </AppButton>
        <AppButton
          preset={confirmColor === "error" ? "danger" : "primary"}
          onClick={() => onClose(true)}
          disabled={busy}
          autoFocus
        >
          {confirmLabel}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
