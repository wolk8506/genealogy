import React, { useEffect, useState } from "react";
import NoticeDialog, {
  AppIcon,
} from "../../components/Dialog/NoticeDialog";
import { useUpdateStore } from "../../store/useUpdateStore";

// Исход проверки обновлений из меню: раньше это был тост, теперь — окно
// из того же стекла, что и «Доступно обновление».
export function UpdateResultDialog() {
  const result = useUpdateStore((s) => s.checkResult);
  const currentVersion = useUpdateStore((s) => s.currentVersion);

  // Текст держим в локальной копии: стор очищается сразу, а окно уходит
  // за 140 мс и не должно показывать пустой стеклянный прямоугольник.
  const [remembered, setRemembered] = useState(null);
  useEffect(() => {
    if (result) setRemembered(result);
  }, [result]);

  const view = result ?? remembered;
  if (!view) return null;

  const upToDate = view.status === "up-to-date";
  const version = view.version || currentVersion;
  const close = () => useUpdateStore.getState().clearCheckResult();
  const retry = () => {
    close();
    useUpdateStore.getState().checkManual();
  };

  return (
    <NoticeDialog
      open={Boolean(result)}
      onClose={close}
      icon={<AppIcon />}
      width={440}
      title={
        upToDate
          ? "Установлена актуальная версия"
          : "Не удалось проверить обновления"
      }
      message={
        upToDate
          ? `Genealogy ${version} · Обновлений не найдено`
          : view.message
      }
      primaryLabel={upToDate ? "ОК" : "Повторить"}
      onPrimary={upToDate ? close : retry}
      secondaryLabel={upToDate ? undefined : "Закрыть"}
      onSecondary={close}
    />
  );
}
