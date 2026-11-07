import React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Typography,
  alpha,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { glassPaperSx, secondaryButtonSx } from "./glassDialog";

// Простое подтверждение вместо нативного window.confirm:
// не блокирует main-процесс и выглядит как остальной UI.
export default function ConfirmDialog({
  open,
  title,
  message,
  warning,
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
      PaperProps={{
        sx: (t) => ({ ...glassPaperSx(t), width: 300 }),
      }}
    >
      {title && (
        <DialogTitle
          sx={{
            p: "22px 20px 10px",
            fontSize: "0.875rem",
            fontWeight: 600,
            lineHeight: 1.35,
          }}
        >
          {title}
        </DialogTitle>
      )}
      <DialogContent sx={{ px: "20px", pt: "12px", pb: 0 }}>
        {typeof message === "string" ? (
          <DialogContentText
            sx={{
              m: 0,
              fontSize: "0.75rem",
              lineHeight: 1.5,
              color: (t) => alpha(t.palette.text.primary, 0.8),
              whiteSpace: "pre-line",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {message}
          </DialogContentText>
        ) : (
          message
        )}
        {warning && (
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              mt: 1.5,
            }}
          >
            <WarningAmberRoundedIcon
              sx={{
                fontSize: 16,
                color: "warning.main",
                mt: "1px",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                lineHeight: 1.5,
                color: (t) => alpha(t.palette.text.primary, 0.85),
              }}
            >
              {warning}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActionsBar
        sx={{
          px: "16px",
          pt: 2,
          pb: "16px",
          gap: "8px",
          "& > .MuiButton-root": {
            flex: 1,
            minWidth: 0,
            maxWidth: "none",
            height: 32,
            fontSize: "0.8125rem",
          },
        }}
      >
        <DialogActionButton
          onClick={() => onClose(false)}
          disabled={busy}
          sx={secondaryButtonSx}
        >
          {cancelLabel}
        </DialogActionButton>
        <DialogActionButton
          tone={confirmColor === "error" ? "danger" : "primary"}
          onClick={() => onClose(true)}
          disabled={busy}
          autoFocus
        >
          {confirmLabel}
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
