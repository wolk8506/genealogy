import { useCallback, useRef, useState } from "react";

// Ленивая подгрузка миниатюр по требованию (общее для галерей и ленты).
// Использование: const { thumbs, fetchThumb } = usePhotoThumbs();
export default function usePhotoThumbs() {
  const [thumbs, setThumbs] = useState({});
  const pending = useRef(new Set());

  const fetchThumb = useCallback(
    async (photo) => {
      if (!photo?.id || thumbs[photo.id] || pending.current.has(photo.id)) {
        return;
      }
      pending.current.add(photo.id);
      try {
        const path = await window.photoAPI?.getPath(
          photo.owner,
          photo.filename,
          "thumbs",
        );
        if (path) {
          setThumbs((prev) =>
            prev[photo.id] ? prev : { ...prev, [photo.id]: path },
          );
        }
      } catch {
        // нет миниатюры — игнорируем
      } finally {
        pending.current.delete(photo.id);
      }
    },
    [thumbs],
  );

  return { thumbs, fetchThumb };
}
