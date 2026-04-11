import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function PhotoMetaDialog({ openDialog, meta, onClose }) {
  if (!meta) return null;

  return (
    <Dialog
      open={openDialog}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", p: 3, pb: 1 }}>
        <InfoIcon sx={{ mr: 1.5, color: "primary.main", fontSize: 28 }} />
        <Typography variant="h6" fontWeight="bold">
          Состояние медиа-файлов
        </Typography>
      </Box>

      <DialogContent>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 2, display: "block" }}
        >
          Уникальный ID: {meta.id}
        </Typography>

        <Stack spacing={2}>
          {meta.details?.map((file, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "12px",
                borderColor: file.exists ? "divider" : "error.light",
                bgcolor: file.exists ? "inherit" : "error.lightest", // если есть прозрачность в теме
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {file.exists ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <CancelIcon color="error" fontSize="small" />
                  )}
                  <Typography variant="body1" fontWeight="600">
                    {file.type}
                  </Typography>
                </Box>
                <Chip
                  label={file.exists ? file.size : "Отсутствует"}
                  size="small"
                  color={file.exists ? "primary" : "error"}
                  variant={file.exists ? "filled" : "outlined"}
                />
              </Box>
              {file.exists && (
                <Box
                  sx={{
                    mt: 1,
                    pl: 1,
                    borderLeft: "2px solid #ccc",
                    opacity: 0.8,
                  }}
                >
                  <Typography variant="caption" display="block">
                    📏 Разрешение: <b>{file.res}</b>
                  </Typography>
                  <Typography variant="caption" display="block">
                    📅 Создан: {file.date}
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{
                      wordBreak: "break-all",
                      color: "text.secondary",
                      mt: 0.5,
                      fontSize: "10px",
                    }}
                  >
                    📂 {file.fullPath}
                  </Typography>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="text"
          sx={{
            height: 24,
            borderRadius: "6px",
            py: 1.2,
            px: 3.6,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "text.primary",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
            },
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
