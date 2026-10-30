// pages/Page_Families/familyTheme.js
// Визуальные токены страницы «Семьи».
// Стекло — только на шапке, панели и контейнере детей;
// карточки людей — на спокойных поверхностях, иначе интерфейс «мутнеет».

import { alpha } from "@mui/material/styles";

export const FAMILY_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

export const RADII = {
  shell: 24,
  section: 18,
  card: 14,
  control: 10,
  pill: 999,
};

/** Общая ширина схемы: союз и блок детей всегда центрируются по ней. */
export const SCHEMA_MAX_WIDTH = 1400;

/** Длина вертикальной связи от союза до блока детей. */
export const CHILD_STEM_HEIGHT = 76;

export const titleSx = {
  fontSize: 27,
  fontWeight: 700,
  lineHeight: 1.12,
  letterSpacing: "-0.024em",
};

export const sectionLabelSx = {
  fontSize: 10.5,
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
};

function accentsOf(theme) {
  const accents = theme.palette.accents || {};
  return {
    blue: accents.blue || theme.palette.primary.main,
    indigo: accents.indigo || theme.palette.secondary.main,
    mint: accents.mint || theme.palette.success.main,
    pink: accents.pink || theme.palette.error.main,
  };
}

/** Страница «Семьи». Ambient-градиент рисует PageBackground в MainLayout. */
export const familyPageSx = () => {
  return {
    fontFamily: FAMILY_FONT,
    "& .MuiTypography-root": { fontFamily: "inherit" },
    "& .MuiButton-root": { fontFamily: "inherit" },
    minHeight: "100%",
  };
};

/** Стеклянная поверхность (шапка, панель, контейнер детей). */
export const familyGlassSx = (theme, { strong = false } = {}) => {
  const dark = theme.palette.mode === "dark";
  return {
    backgroundColor: strong
      ? theme.palette.glass.strong
      : theme.palette.glass.surface,
    backdropFilter: "blur(22px) saturate(180%)",
    WebkitBackdropFilter: "blur(22px) saturate(180%)",
    border: `1px solid ${theme.palette.glass.border}`,
    boxShadow: dark
      ? "0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 12px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.7)",
  };
};

/** Карточка человека / семьи. */
export const familyCardSx = (theme, { selected = false } = {}) => {
  const dark = theme.palette.mode === "dark";
  const base = familyGlassSx(theme, { strong: selected });

  return {
    ...base,
    borderRadius: `${RADII.card}px`,
    transition:
      "transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, border-color .18s ease, background-color .18s ease",
    ...(selected
      ? {
          borderColor: alpha(theme.palette.primary.main, 0.8),
          boxShadow: `0 0 0 3px ${alpha(
            theme.palette.primary.main,
            dark ? 0.28 : 0.16,
          )}, 0 12px 26px rgba(0,0,0,${dark ? 0.5 : 0.1})`,
        }
      : {}),
  };
};

/** Цвет «пола» для точки-индикатора и акцентов. */
export function genderColor(theme, gender) {
  const accents = accentsOf(theme);
  if (gender === "male") return accents.blue;
  if (gender === "female") return accents.pink;
  return theme.palette.text.disabled;
}

export function toneColor(theme, tone) {
  const accents = theme.palette.accents || {};
  return accents[tone] || theme.palette.primary.main;
}
