import React, { useState } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export const EmptyPersonSlot = ({
  label,
  onDrop,
  acceptType,
  activeDragType,
  onDragEnd,
  isDroppable = true,
}) => {
  const theme = useTheme();
  const [isOver, setIsOver] = useState(false);

  // Теперь слот "совместим", только если и ТИП совпал, и ЛОГИКА разрешила
  const dragType =
    typeof activeDragType === "object" ? activeDragType?.type : activeDragType;
  const isCompatible = dragType === acceptType && isDroppable;

  // Определяем, подходит ли перетаскиваемый объект этому слоту
  // const isCompatible = activeDragType === acceptType;

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isCompatible) {
      e.dataTransfer.dropEffect = "link";
      setIsOver(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    const personId = e.dataTransfer.getData("personId");
    const draggedType = e.dataTransfer.getData("personType");

    if (draggedType === acceptType && onDrop) {
      onDrop(personId);
    }

    // МГНОВЕННЫЙ СБРОС: Гасим подсветку сразу после дропа
    if (onDragEnd) onDragEnd();
  };

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      sx={{
        minWidth: "320px",
        width: "100%",
        height: "64px",
        border: "2px dashed",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "auto",

        // Состояния границ
        borderColor: isOver
          ? "primary.main"
          : isCompatible
            ? alpha(theme.palette.primary.main, 0.5)
            : "divider",

        // Фон
        bgcolor: isOver
          ? alpha(theme.palette.primary.main, 0.12)
          : isCompatible
            ? alpha(theme.palette.primary.main, 0.04)
            : "transparent",

        // Текст и иконка
        color: isCompatible ? "primary.main" : "text.disabled",

        // Анимация пульсации только когда тянем нужный тип
        "@keyframes slotPulse": {
          "0%": { transform: "scale(1)" },
          "50%": {
            transform: "scale(1.02)",
            borderColor: theme.palette.primary.main,
          },
          "100%": { transform: "scale(1)" },
        },
        animation:
          isCompatible && !isOver
            ? "slotPulse 2s infinite ease-in-out"
            : "none",
      }}
    >
      <AddIcon
        sx={{
          transition: "transform 0.3s",
          transform: isOver ? "rotate(90deg) scale(1.2)" : "scale(1)",
        }}
      />
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {isCompatible ? `Сюда: ${label}` : `Добавить ${label}`}
      </Typography>
    </Box>
  );
};
