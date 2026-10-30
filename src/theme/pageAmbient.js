// theme/pageAmbient.js
// Мягкий ambient-градиент страницы в оттенке цвета её раздела.
// Оттенок намеренно слабый: он задаёт настроение, но не мешает читать контент.

import { alpha } from "@mui/material/styles";

/**
 * @param {object} theme MUI-тема
 * @param {string} accent ключ из theme.palette.accents (blue, green, orange…)
 */
export function pageAmbientSx(theme, accent = "blue") {
  const dark = theme.palette.mode === "dark";
  const tint = theme.palette.accents?.[accent] || theme.palette.primary.main;

  return {
    backgroundColor: dark ? "#0B0B0D" : "#F4F4F7",
    // Градиент закреплён за окном: при прокрутке длинного списка он остаётся
    // на высоте экрана, а не растягивается вместе с контентом.
    backgroundAttachment: "fixed",
    backgroundImage: [
      `radial-gradient(920px 540px at 6% -10%, ${alpha(tint, dark ? 0.2 : 0.12)}, transparent 62%)`,
      `radial-gradient(780px 480px at 98% -6%, ${alpha(tint, dark ? 0.1 : 0.06)}, transparent 60%)`,
      `radial-gradient(900px 560px at 50% 114%, ${alpha(tint, dark ? 0.06 : 0.04)}, transparent 66%)`,
    ].join(", "),
  };
}
