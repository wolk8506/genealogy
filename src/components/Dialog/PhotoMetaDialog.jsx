import React from "react";
import {
  Dialog,
  Typography,
  Box,
  Chip,
  Stack,
  Paper,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CropOriginalIcon from "@mui/icons-material/CropOriginal";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";

export default function PhotoMetaDialog({ openDialog, meta, onClose }) {
  if (!meta) return null;

  return (
    <Dialog
      open={openDialog}
      onClose={onClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      slotProps={{
        paper: {
          sx: {
            width: 600,
            maxWidth: "94vw",
            maxHeight: "calc(100vh - 64px)",
            borderRadius: "24px",
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }
      }}
    >
      <Box sx={{ p: 3, pb: 2, overflowY: "auto" }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 3 }}
        >
          Состояние медиа-файлов
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            mb: 2,
            display: "block"
          }}>
          Уникальный ID: {meta.id}
        </Typography>

        <Stack spacing={2}>
          {meta.details?.map((file, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: "16px",
                borderColor: file.exists ? "divider" : "error.light",
                bgcolor: file.exists
                  ? "action.hover"
                  : (theme) => alpha(theme.palette.error.main, 0.08),
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
                  <Typography variant="body1" sx={{
                    fontWeight: "600"
                  }}>
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
                    borderLeft: "2px solid",
                    borderColor: "divider",
                    opacity: 0.8,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CropOriginalIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                    <Typography variant="caption" sx={{
                      display: "block"
                    }}>
                      Разрешение: <b>{file.res}</b>
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CalendarTodayIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                    <Typography variant="caption" sx={{
                      display: "block"
                    }}>
                      Создан: {file.date}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mt: 0.5 }}
                  >
                    <FolderOpenOutlinedIcon
                      sx={{ fontSize: 14, opacity: 0.7, mt: "1px", flexShrink: 0 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        wordBreak: "break-all",
                        color: "text.secondary",
                        fontSize: "10px"
                      }}>
                      {file.fullPath}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          ))}
        </Stack>
      </Box>

      <DialogActionsBar>
        <DialogActionButton onClick={onClose}>Закрыть</DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
