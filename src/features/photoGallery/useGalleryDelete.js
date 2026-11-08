import { useCallback, useMemo, useState } from "react";
import { useNotificationStore } from "../../store/useNotificationStore";

/**
 * Подтверждение и само удаление файла — одни и те же в обеих галереях.
 * Удалять можно только собственные снимки, поэтому галерея передаёт, кто
 * сейчас «владелец» интерфейса: на странице человека это сам человек, в
 * глобальной галерее — домашний человек из настроек.
 */
export function useGalleryDelete({ viewerId, setPhotos, dropPaths }) {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const canDelete = useCallback(
    (photo) =>
      viewerId != null && String(photo.owner) === String(viewerId),
    [viewerId],
  );

  const requestDelete = useCallback((photo) => setPendingPhoto(photo), []);

  const onConfirm = useCallback(
    async (accepted) => {
      const photo = pendingPhoto;
      if (!accepted || !photo) {
        setPendingPhoto(null);
        return;
      }
      // Окно держим открытым, пока идёт удаление: busy глушит кнопки и
      // закрытие по фону, поэтому двойное нажатие не удалит файл дважды.
      setBusy(true);
      try {
        const success = await window.photoAPI.delete(photo.owner, photo.id);
        if (success) {
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          dropPaths(photo.id);
        }
        addNotification({
          title: success ? "Фото удалено" : "Не удалось удалить фото",
          message: `Файл «${photo.filename}» ${
            success ? "удалён" : "остался на месте"
          }`,
          type: success ? "warning" : "error",
          category: "photo",
        });
      } catch (e) {
        addNotification({
          title: "Ошибка удаления",
          message: String(e || "Не удалось удалить фото"),
          type: "error",
          category: "photo",
        });
      } finally {
        setBusy(false);
        setPendingPhoto(null);
      }
    },
    [pendingPhoto, setPhotos, dropPaths, addNotification],
  );

  return useMemo(
    () => ({
      canDelete,
      requestDelete,
      confirmProps: {
        open: Boolean(pendingPhoto),
        title: "Удалить это фото?",
        message: pendingPhoto
          ? `Файл «${pendingPhoto.filename}» будет удалён без возможности восстановления.`
          : "",
        confirmLabel: "Удалить",
        confirmColor: "error",
        busy,
        onClose: onConfirm,
      },
    }),
    [canDelete, requestDelete, pendingPhoto, busy, onConfirm],
  );
}
