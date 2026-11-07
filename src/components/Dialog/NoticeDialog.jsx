import React from "react";
import { Box, Dialog, Typography } from "@mui/material";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { glassPaperSx, secondaryButtonSx } from "./glassDialog";

// Иконка приложения — общий знак системных сообщений. Скругление держит
// пропорцию ~22% от размера, как у иконки в доке.
export function AppIcon({ size = 72, sx }) {
  return (
    <Box
      component="img"
      src="./app-icon.png"
      alt=""
      sx={[
        {
          width: size,
          height: size,
          borderRadius: `${Math.round(size * 0.22)}px`,
          pointerEvents: "none",
          userSelect: "none",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ].filter(Boolean)}
    />
  );
}

// Короткое сообщение, которое раньше жило тостом: иконка, заголовок,
// пояснение и одна-две кнопки. Материал — тот же, что у подтверждения.
export default function NoticeDialog({
  open,
  onClose,
  icon,
  title,
  message,
  children,
  primaryLabel = "ОК",
  onPrimary,
  secondaryLabel,
  onSecondary,
  width = 400,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      transitionDuration={{ enter: 180, exit: 140 }}
      slotProps={{ paper: { sx: (t) => ({ ...glassPaperSx(t), width }) } }}
    >
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 }, pb: 2, textAlign: "center" }}>
        {icon && (
          <Box sx={{ display: "grid", placeItems: "center", mb: 1.5 }}>
            {icon}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: "1.0625rem",
            fontWeight: 600,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Typography>
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, overflowWrap: "anywhere" }}
          >
            {message}
          </Typography>
        )}
      </Box>

      {children && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 2.5 } }}>{children}</Box>
      )}

      <DialogActionsBar
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 1,
          pb: { xs: 2, sm: 3 },
          gap: "10px",
          // Одна кнопка — пилюля обычной ширины по центру, две — делят ширину.
          "& > .MuiButton-root": {
            flex: 1,
            minWidth: 0,
            maxWidth: secondaryLabel ? "none" : 220,
          },
        }}
      >
        {secondaryLabel && (
          <DialogActionButton onClick={onSecondary} sx={secondaryButtonSx}>
            {secondaryLabel}
          </DialogActionButton>
        )}
        <DialogActionButton
          tone="primary"
          onClick={onPrimary ?? onClose}
          autoFocus
        >
          {primaryLabel}
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
