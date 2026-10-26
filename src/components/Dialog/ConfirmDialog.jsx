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
        sx: (t) => ({
          width: 300,
          maxWidth: "calc(100vw - 32px)",
          borderRadius: "30px",
          backgroundImage: "none",
          overflow: "hidden",
          bgcolor:
            t.palette.mode === "dark"
              ? "rgba(26,26,26,0.92)"
              : "rgba(249,249,249,0.95)",
          backdropFilter: "blur(24px)",
          border: "1px solid",
          borderColor:
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          boxShadow:
            t.palette.mode === "dark"
              ? "0 18px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.8)",
        }),
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
          sx={(t) => ({
            bgcolor:
              t.palette.mode === "dark"
                ? "rgba(12,12,12,0.9)"
                : alpha(t.palette.common.black, 0.06),
            "&:hover": {
              bgcolor:
                t.palette.mode === "dark"
                  ? "rgba(24,24,24,0.95)"
                  : alpha(t.palette.common.black, 0.1),
            },
          })}
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
