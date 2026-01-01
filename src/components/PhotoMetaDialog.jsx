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
  Box,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

export default function PhotoMetaDialog({ openDialog, meta, onClose }) {
  // console.log("openDialog", openDialog);

  const data = !meta
    ? []
    : [
        { name: "Название:", value: meta?.filename },
        { name: "Путь:", value: meta?.path },
        { name: "Размер:", value: meta?.sizeKB },
        { name: "Разрешение:", value: `${meta?.width} x ${meta.height}` },
        { name: "Создано:", value: meta?.created },
      ];

  if (!meta || meta.error) {
    return (
      <Dialog
        open={openDialog}
        onClose={onClose}
        PaperProps={{ sx: { borderRadius: "15px" } }}
      >
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
    <Dialog
      open={openDialog}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", p: "24px" }}>
        <InfoIcon sx={{ mr: 2 }} />
        <Typography>Информация о фото</Typography>
      </Box>
      <DialogContent dividers>
        {/* <Stack spacing={2}>
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
        </Stack> */}
        {data.map((i) => (
          <Box
            key={i.name}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "20% 80%" }, // на мобильных — одна колонка
              gap: 1,
              alignItems: "start",
              width: "100%",
              py: 0.25,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                textAlign: { xs: "left", sm: "right" }, // на десктопе правая выравнивание
                pr: { sm: 1, xs: 0 },
                fontWeight: 500,
                display: "flex",
                justifyContent: { xs: "flex-start", sm: "flex-end" },
                gap: 1,
              }}
            >
              {i.name}
            </Typography>
            <Typography
              variant="body2"
              sx={
                {
                  // overflow: "hidden",
                  // textOverflow: "ellipsis",
                  // whiteSpace: "nowrap",
                }
              }
            >
              {i.value}
            </Typography>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
