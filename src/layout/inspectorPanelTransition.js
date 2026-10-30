// Общая анимация правых панелей-инспекторов: выезд панели синхронизирован
// со сдвигом основного контента (margin-right в MainLayout).
export const INSPECTOR_TRANSITION_MS = 300;
export const INSPECTOR_TRANSITION_EASING = "ease";

export const inspectorDrawerTransitionProps = {
  transitionDuration: INSPECTOR_TRANSITION_MS,
  slotProps: { transition: { easing: INSPECTOR_TRANSITION_EASING } },
};
