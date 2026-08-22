import { useRef, useState, useCallback } from "react";
import {
  normalizeFaces,
  createDefaultFace,
  syncPeopleFromFaces,
} from "../utils/photoFaces";
import { detectFacesFromImageUrl } from "../services/faceDetection";
import { suggestPersonsFromFaceIndex } from "../utils/faceIndex";

export function usePhotoFaceMarkup(addNotification) {
  const previewFrameRef = useRef(null);
  const [faces, setFaces] = useState([]);
  const [imageSize, setImageSize] = useState(null);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const resetFaces = useCallback(() => {
    setFaces([]);
    setImageSize(null);
    setSelectedFaceId(null);
    setDrawMode(false);
    setDetecting(false);
  }, []);

  const handlePreviewLoad = useCallback((e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  }, []);

  const handleFacesChange = useCallback((nextFaces, syncPeopleIds) => {
    const normalized = normalizeFaces(nextFaces);
    setFaces(normalized);
    return syncPeopleIds
      ? syncPeopleFromFaces(normalized, syncPeopleIds)
      : normalized;
  }, []);

  const handleAddFace = useCallback(() => {
    const next = [...faces, createDefaultFace()];
    setFaces(normalizeFaces(next));
    setSelectedFaceId(next[next.length - 1].id);
    setDrawMode(false);
    return next;
  }, [faces]);

  const handleDeleteSelectedFace = useCallback(() => {
    if (!selectedFaceId) return null;
    const next = faces.filter((f) => f.id !== selectedFaceId);
    setFaces(normalizeFaces(next));
    setSelectedFaceId(null);
    return next;
  }, [faces, selectedFaceId]);

  const handleDetectFaces = useCallback(
    async (previewUrl) => {
      if (!previewUrl) return null;
      setDetecting(true);
      setDrawMode(false);

      try {
        const { faces: detected, imageSize: size } =
          await detectFacesFromImageUrl(previewUrl);

        if (detected.length === 0) {
          addNotification?.({
            title: "Лица",
            message: "На фото не найдено лиц",
            type: "info",
            category: "photo",
          });
          return null;
        }

        const suggestedFaces = await suggestPersonsFromFaceIndex(detected);

        setImageSize(size);
        setFaces(normalizeFaces(suggestedFaces));
        setSelectedFaceId(suggestedFaces[0]?.id ?? null);
        addNotification?.({
          title: "Лица",
          message: `Найдено лиц: ${detected.length}`,
          type: "success",
          category: "photo",
        });
        return suggestedFaces;
      } catch (e) {
        console.error(e);
        addNotification?.({
          title: "Лица",
          message: e.message || "Ошибка определения лиц",
          type: "error",
          category: "photo",
        });
        return null;
      } finally {
        setDetecting(false);
      }
    },
    [addNotification],
  );

  const getFaceMeta = useCallback(
    () => ({
      faces: normalizeFaces(faces),
      imageSize,
    }),
    [faces, imageSize],
  );

  return {
    previewFrameRef,
    faces,
    imageSize,
    selectedFaceId,
    setSelectedFaceId,
    drawMode,
    setDrawMode,
    detecting,
    resetFaces,
    handlePreviewLoad,
    handleFacesChange,
    handleAddFace,
    handleDeleteSelectedFace,
    handleDetectFaces,
    getFaceMeta,
    setFaces,
  };
}
