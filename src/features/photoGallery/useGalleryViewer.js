import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Пути к миниатюрам/оригиналам, состояние полноэкранного просмотра и
 * горячие клавиши — общие для обеих галерей.
 */
export function useGalleryViewer({
  displayList,
  flattenedRows,
  virtuosoRef,
}) {
  const [photoPaths, setPhotoPaths] = useState({ thumbs: {}, full: {} });
  const pendingRef = useRef(new Set());

  const [fullscreen, setFullscreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [hideLabels, setHideLabels] = useState(false);
  const [sliderForcedFullscreen, setSliderForcedFullscreen] = useState(false);

  const setPath = useCallback(
    (id, path, ver) =>
      setPhotoPaths((prev) => ({ ...prev, [ver]: { ...prev[ver], [id]: path } })),
    [],
  );

  const dropPaths = useCallback((photoId) => {
    setPhotoPaths((prev) => {
      const copy = { ...prev };
      if (copy.thumbs) delete copy.thumbs[photoId];
      if (copy.full) delete copy.full[photoId];
      return copy;
    });
  }, []);

  const fetchThumb = useCallback(
    async (photo) => {
      if (photoPaths.thumbs[photo.id] || pendingRef.current.has(photo.id)) return;
      pendingRef.current.add(photo.id);
      try {
        const path = await window.photoAPI.getPath(
          photo.owner,
          photo.filename,
          "thumbs",
        );
        if (path) setPath(photo.id, path, "thumbs");
      } finally {
        pendingRef.current.delete(photo.id);
      }
    },
    [photoPaths.thumbs, setPath],
  );

  useEffect(() => {
    if (!fullscreen || !displayList[index]) return;
    const photo = displayList[index];
    if (photoPaths.full[photo.id] || pendingRef.current.has(`${photo.id}_full`))
      return;
    pendingRef.current.add(`${photo.id}_full`);
    window.photoAPI
      .getPath(photo.owner, photo.filename, "webp")
      .then((path) => {
        if (path) setPath(photo.id, path, "full");
      })
      .finally(() => pendingRef.current.delete(`${photo.id}_full`));
  }, [fullscreen, index, displayList, photoPaths.full, setPath]);

  // Держим сетку прокрученной к просматриваемому фото, чтобы после закрытия
  // полноэкранного просмотра взгляд возвращался туда же, откуда он ушёл.
  useEffect(() => {
    if (!fullscreen || !virtuosoRef.current) return;
    const photoId = displayList[index]?.id;
    if (!photoId) return;
    const rowIndex = flattenedRows.findIndex((row) =>
      row.some((p) => p.id === photoId),
    );
    if (rowIndex !== -1) {
      virtuosoRef.current.scrollToIndex({
        index: rowIndex,
        align: "center",
        behavior: "auto",
      });
    }
  }, [index, fullscreen, displayList, flattenedRows, virtuosoRef]);

  const openAt = useCallback(
    (photo) => {
      const i = displayList.findIndex((x) => x.id === photo.id);
      if (i === -1) return;
      setDirection(0);
      setIndex(i);
      setFullscreen(true);
    },
    [displayList],
  );

  const handleClose = useCallback(async () => {
    setFullscreen(false);
    if (sliderForcedFullscreen && window.windowAPI) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
    setHideLabels(false);
  }, [sliderForcedFullscreen]);

  const handleMaximizeWindow = useCallback(async () => {
    const wantFullscreen = !hideLabels;
    setHideLabels(wantFullscreen);
    if (!window.windowAPI) return;
    const isNow = await window.windowAPI.isFullscreen();
    if (wantFullscreen && !isNow) {
      await window.windowAPI.setFullscreen(true);
      setSliderForcedFullscreen(true);
    } else if (!wantFullscreen && sliderForcedFullscreen) {
      await window.windowAPI.setFullscreen(false);
      setSliderForcedFullscreen(false);
    }
  }, [hideLabels, sliderForcedFullscreen]);

  const handleNext = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1 < displayList.length ? prev + 1 : prev));
  }, [displayList.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") handlePrev();
      if (event.key === "ArrowRight") handleNext();
      if (event.key === "Escape") handleClose();
      if (event.key.toLowerCase() === "f") handleMaximizeWindow();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [fullscreen, handleNext, handlePrev, handleClose, handleMaximizeWindow]);

  return useMemo(
    () => ({
      photoPaths,
      setPhotoPaths,
      dropPaths,
      fetchThumb,
      fullscreen,
      index,
      direction,
      hideLabels,
      openAt,
      close: handleClose,
      next: handleNext,
      prev: handlePrev,
      toggleMaximize: handleMaximizeWindow,
    }),
    [
      photoPaths,
      dropPaths,
      fetchThumb,
      fullscreen,
      index,
      hideLabels,
      openAt,
      handleClose,
      handleNext,
      handlePrev,
      handleMaximizeWindow,
    ],
  );
}
