// Общие настройки правых панелей-инспекторов.
// Выезд панели синхронизирован со сдвигом основного контента
// (margin-right в MainLayout).
export const INSPECTOR_TRANSITION_MS = 300;
export const INSPECTOR_TRANSITION_EASING = "ease";

export const inspectorDrawerTransitionProps = {
  transitionDuration: INSPECTOR_TRANSITION_MS,
  slotProps: { transition: { easing: INSPECTOR_TRANSITION_EASING } },
};

// «Матовое стекло»: сквозь панель виден размытый фон страницы,
// лёгкое затемнение отделяет её от контента.
export const inspectorPaperSx = {
  bgcolor: "rgba(0, 0, 0, 0.05)",
  backgroundImage: "none",
  backdropFilter: "blur(40px) saturate(180%)",
  WebkitBackdropFilter: "blur(40px) saturate(180%)",
};
