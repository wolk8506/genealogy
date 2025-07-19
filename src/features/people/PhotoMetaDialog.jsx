// PhotoMetaDialog.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Stack,
  Divider,
} from "@mui/material";

export default function PhotoMetaDialog({ openDialog, meta, onClose }) {
  console.log("openDialog", openDialog);
  if (!meta || meta.error) {
    return (
      <Dialog open={openDialog} onClose={onClose}>
        <DialogTitle>Информация о фото</DialogTitle>
        <DialogContent>
          <Typography color="error">
            Не удалось получить информацию о фото.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={openDialog} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>ℹ️ Информация о фото</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">
            📄 <strong>Название:</strong> {meta.filename}
          </Typography>
          <Typography variant="body2">
            📍 <strong>Путь:</strong> {meta.path}
          </Typography>
          <Typography variant="body2">
            💾 <strong>Размер:</strong> {meta.sizeKiB} ({meta.sizeKB})
          </Typography>
          <Typography variant="body2">
            📐 <strong>Разрешение:</strong> {meta.width} × {meta.height}
          </Typography>
          <Typography variant="body2">
            ⏱️ <strong>Создано:</strong> {meta.created}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
