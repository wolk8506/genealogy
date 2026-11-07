import { alpha } from "@mui/material";
import { RADIUS } from "../../theme/designTokens";

// Стеклянный материал модального окна — одно определение на все диалоги,
// чтобы подтверждение, окно обновления и уведомление были одним и тем же слоем.
// Ширину каждый вызывающий задаёт сам.
export const glassPaperSx = (t) => {
  const isDark = t.palette.mode === "dark";
  return {
    maxWidth: "calc(100vw - 32px)",
    borderRadius: `${RADIUS.dialog}px`,
    backgroundImage: "none",
    overflow: "hidden",
    bgcolor: isDark ? "rgba(26,26,26,0.92)" : "rgba(249,249,249,0.95)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    boxShadow: isDark
      ? "0 18px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.8)",
  };
};

// Серая пилюля — левая, необязательная кнопка в панели действий.
export const secondaryButtonSx = (t) => {
  const isDark = t.palette.mode === "dark";
  return {
    bgcolor: isDark
      ? "rgba(12,12,12,0.9)"
      : alpha(t.palette.common.black, 0.06),
    "&:hover": {
      bgcolor: isDark
        ? "rgba(24,24,24,0.95)"
        : alpha(t.palette.common.black, 0.1),
    },
  };
};
