// Единая шкала оформления: радиусы, движение, слои.
// Значения из шкалы — единственный источник для новых стилей.

export const RADIUS = {
  xs: 6, // теги, мелкие метки
  sm: 8, // компактные контролы, иконки-плитки
  control: 12, // кнопки, поля, строки списков
  card: 16, // карточки, панели, поповеры
  dialog: 24, // модальные окна
  appIcon: 20, // иконка приложения (пропорция скругления ~22%)
  pill: 999, // пилюли, бейджи, круглые кнопки
};

export const MOTION = {
  fast: "160ms",
  base: "200ms",
  slow: "300ms",
  easeOut: "cubic-bezier(0.23, 1, 0.32, 1)",
  easeInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
};

export const Z = {
  base: 1,
  raised: 2,
  overlay: 10,
  dropdown: 100,
  sticky: 200,
  drawer: 1000,
  modal: 1300,
  toast: 1400,
  tooltip: 1500,
};
