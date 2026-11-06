// Единый хвостик-указатель для поповеров и меню.
//
// Это квадрат, повёрнутый на 45°: сверху виден треугольник, а нижняя
// половина обрезается, чтобы не проступать внутри панели.
export const POPOVER_ARROW_CLIP =
  "polygon(0 0, 100% 0, 100% 8.84%, 8.84% 100%, 0 100%)";

export function popoverArrowSx({
  background = "inherit",
  borderColor = "divider",
  zIndex = 0,
} = {}) {
  return {
    content: '""',
    display: "block",
    position: "absolute",
    top: -9,
    left: "calc(50% - 6px)",
    width: 16,
    height: 16,
    bgcolor: background,
    borderLeft: "1px solid",
    borderTop: "1px solid",
    borderColor,
    borderRadius: "4px 0 0 0",
    transform: "rotate(45deg)",
    clipPath: POPOVER_ARROW_CLIP,
    zIndex,
  };
}
