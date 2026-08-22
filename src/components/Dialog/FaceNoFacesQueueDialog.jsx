import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Stack,
  Typography,
  Box,
  Autocomplete,
  TextField,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  Fade,
  Popover,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import FaceIcon from "@mui/icons-material/Face";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PhotoFaceOverlay from "../PhotoFaceOverlay";
import {
  buildNoFacesQueue,
  confirmExternalFaceAssignment,
  normalizeFaces,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  faceNeedsReview,
  getPersonLabel,
  createDefaultFace,
} from "../../utils/photoFaces";
import {
  buildFaceTagOptions,
  faceTagOptionFromFace,
  applyFaceTagOption,
  getExternalEntityLabel,
} from "../../utils/externalEntities";
import { distanceToConfidence } from "../../services/faceRecognition";
import { detectFacesFromImageUrl } from "../../services/faceDetection";
import {
  suggestPersonsFromFaceIndex,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import { useFaceReviewStore } from "../../store/useFaceReviewStore";
import { useNotificationStore } from "../../store/useNotificationStore";

async function persistPhotoFaces(
  currentItem,
  nextFaces,
  allPhotos,
  { dismissFromQueue = false } = {},
) {
  const normalized = normalizeFaces(nextFaces);
  const existing = allPhotos.find(
    (p) => p.id === currentItem.photoId && p.owner === currentItem.owner,
  );

  const updatedEntry = {
    ...existing,
    id: currentItem.photoId,
    filename: currentItem.filename,
    title: currentItem.title,
    owner: currentItem.owner,
    imageSize: currentItem.imageSize,
    faces: normalized,
    people: syncPeopleFromFaces(normalized, existing?.people || []),
    externalPeople: syncExternalPeopleFromFaces(
      normalized,
      existing?.externalPeople || [],
    ),
    faceScanNoFaces: dismissFromQueue
      ? false
      : normalized.length === 0
        ? existing?.faceScanNoFaces
        : false,
  };

  await window.photoAPI.addOrUpdateOwnerJson(currentItem.owner, updatedEntry);
  if (normalized.length > 0) {
    await syncReferencesAfterPhotoSave(
      { owner: currentItem.owner, id: currentItem.photoId },
      normalized,
    );
  }

  return updatedEntry;
}

export default function FaceNoFacesQueueDialog({
  allPeople: allPeopleProp = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const open = useFaceReviewStore((s) => s.noFacesOpen);
  const closeNoFacesReview = useFaceReviewStore((s) => s.closeNoFacesReview);
  const setNoFacesCount = useFaceReviewStore((s) => s.setNoFacesCount);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [allPeople, setAllPeople] = useState(allPeopleProp);
  const [allExternal, setAllExternal] = useState([]);
  const [queue, setQueue] = useState([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [faceIndex, setFaceIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [faceHelpAnchor, setFaceHelpAnchor] = useState(null);
  const previewFrameRef = useRef(null);
  const queueRef = useRef([]);
  const photoIndexRef = useRef(0);
  const persistDebounceRef = useRef(null);

  queueRef.current = queue;
  photoIndexRef.current = photoIndex;

  const currentItem = queue[photoIndex] || null;
  const faces = currentItem?.faces || [];
  const allFaceIds = useMemo(() => faces.map((f) => f.id), [faces]);
  const currentFaceId = allFaceIds[faceIndex] ?? null;

  const faceTagOptions = useMemo(
    () => buildFaceTagOptions(allPeople, allExternal),
    [allPeople, allExternal],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const photos = await window.photoAPI.getAllGlobal();
      const nextQueue = buildNoFacesQueue(photos);
      setQueue(nextQueue);
      setPhotoIndex(0);
      setFaceIndex(0);
      setDrawMode(false);
      setNoFacesCount(nextQueue.length);
    } finally {
      setLoading(false);
    }
  }, [setNoFacesCount]);

  useEffect(() => {
    if (!open) return;
    if (allPeopleProp.length === 0) {
      window.peopleAPI
        ?.getAll?.()
        .then(setAllPeople)
        .catch(() => {});
    } else {
      setAllPeople(allPeopleProp);
    }
    window.externalAPI
      ?.getAll?.()
      .then(setAllExternal)
      .catch(() => {});
    loadQueue();
  }, [open, allPeopleProp, loadQueue]);

  useEffect(() => {
    if (!open || !currentItem) {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    window.photoAPI
      .getPath(currentItem.owner, currentItem.filename, "webp")
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [open, currentItem?.owner, currentItem?.filename]);

  const cancelLayoutPersist = () => {
    if (persistDebounceRef.current) {
      clearTimeout(persistDebounceRef.current);
      persistDebounceRef.current = null;
    }
  };

  const flushLayoutPersist = useCallback(async () => {
    cancelLayoutPersist();
    const item = queueRef.current[photoIndexRef.current];
    if (!item) return;
    try {
      const allPhotos = await window.photoAPI.getAllGlobal();
      await persistPhotoFaces(item, item.faces, allPhotos);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const scheduleLayoutPersist = () => {
    cancelLayoutPersist();
    persistDebounceRef.current = setTimeout(() => {
      persistDebounceRef.current = null;
      flushLayoutPersist();
    }, 600);
  };

  useEffect(() => {
    if (!open) return undefined;
    return () => {
      cancelLayoutPersist();
    };
  }, [open]);

  const removeCurrentFromQueue = (currentQueue = queue) => {
    const nextQueue = currentQueue.filter((_, i) => i !== photoIndex);
    setQueue(nextQueue);
    setNoFacesCount(nextQueue.length);

    if (nextQueue.length === 0) {
      setPhotoIndex(0);
      setFaceIndex(0);
      setDrawMode(false);
      return nextQueue;
    }

    const newIndex = Math.min(photoIndex, nextQueue.length - 1);
    setPhotoIndex(newIndex);
    setFaceIndex(0);
    setDrawMode(false);
    return nextQueue;
  };

  const advanceFromCurrentPhoto = async ({ dismiss = false } = {}) => {
    if (!currentItem) return;

    cancelLayoutPersist();
    setSaving(true);
    try {
      const allPhotos = await window.photoAPI.getAllGlobal();
      await persistPhotoFaces(currentItem, currentItem.faces || [], allPhotos, {
        dismissFromQueue: dismiss,
      });
      removeCurrentFromQueue();
    } catch (e) {
      console.error(e);
      addNotification({
        title: "Фото без лиц",
        message: e.message || "Не удалось сохранить",
        type: "error",
        category: "faceReview",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateQueueFaces = (nextFaces, imageSize) => {
    const normalized = normalizeFaces(nextFaces);
    const nextQueue = [...queue];
    nextQueue[photoIndex] = {
      ...nextQueue[photoIndex],
      faces: normalized,
      imageSize: imageSize || nextQueue[photoIndex].imageSize,
    };
    return nextQueue;
  };

  const goToNextPhoto = async () => {
    await flushLayoutPersist();
    if (photoIndex < queue.length - 1) {
      setPhotoIndex(photoIndex + 1);
      setFaceIndex(0);
    }
    setDrawMode(false);
  };

  const goToPrevPhoto = async () => {
    await flushLayoutPersist();
    if (photoIndex > 0) {
      setPhotoIndex(photoIndex - 1);
      setFaceIndex(0);
    }
    setDrawMode(false);
  };

  const handleSkipPhoto = () => advanceFromCurrentPhoto({ dismiss: true });

  const afterSave = async (nextFaces) => {
    cancelLayoutPersist();
    const allPhotos = await window.photoAPI.getAllGlobal();
    await persistPhotoFaces(currentItem, nextFaces, allPhotos);
    const nextQueue = updateQueueFaces(nextFaces);
    setQueue(nextQueue);

    const normalized = normalizeFaces(nextFaces);
    const currentIdx = normalized.findIndex((f) => f.id === currentFaceId);
    let nextFaceIdx = -1;
    for (let i = currentIdx + 1; i < normalized.length; i += 1) {
      if (faceNeedsReview(normalized[i])) {
        nextFaceIdx = i;
        break;
      }
    }
    if (nextFaceIdx === -1) {
      for (let i = 0; i < currentIdx; i += 1) {
        if (faceNeedsReview(normalized[i])) {
          nextFaceIdx = i;
          break;
        }
      }
    }
    if (nextFaceIdx >= 0) {
      setFaceIndex(nextFaceIdx);
    } else if (currentIdx === -1 && normalized.length > 0) {
      setFaceIndex(normalized.length - 1);
    }
  };

  const handleFacesChange = (nextFaces) => {
    const nextQueue = updateQueueFaces(nextFaces);
    setQueue(nextQueue);
    scheduleLayoutPersist();
  };

  const handlePreviewLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight || !currentItem) return;
    const imageSize = { width: naturalWidth, height: naturalHeight };
    const nextQueue = [...queue];
    nextQueue[photoIndex] = { ...nextQueue[photoIndex], imageSize };
    setQueue(nextQueue);
  };

  const handleDetectFaces = async () => {
    if (!previewUrl || !currentItem) return;
    setDetecting(true);
    setDrawMode(false);
    try {
      const { faces: detected } = await detectFacesFromImageUrl(previewUrl);
      if (detected.length === 0) {
        addNotification({
          title: "Лица",
          message: "На фото не найдено лиц",
          type: "info",
          category: "faceReview",
        });
        return;
      }
      const suggestedDetected = await suggestPersonsFromFaceIndex(detected);
      const nextFaces = normalizeFaces(suggestedDetected);
      await afterSave(nextFaces);
      setFaceIndex(0);
      addNotification({
        title: "Лица",
        message: `Найдено лиц: ${detected.length}`,
        type: "success",
        category: "faceReview",
      });
    } catch (e) {
      addNotification({
        title: "Лица",
        message: e.message || "Ошибка определения лиц",
        type: "error",
        category: "faceReview",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleAcceptSuggestion = async (face) => {
    if (!face?.suggestedPersonId && !face?.suggestedExternalEntityId) return;
    setSaving(true);
    try {
      const nextFaces = currentItem.faces.map((f) =>
        f.id === face.id
          ? face.suggestedExternalEntityId
            ? confirmExternalFaceAssignment(f, face.suggestedExternalEntityId)
            : {
                ...f,
                personId: face.suggestedPersonId,
                externalEntityId: null,
                confirmed: true,
              }
          : f,
      );
      await afterSave(nextFaces);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignFace = async (faceId, option) => {
    if (!faceId || !option) return;
    setSaving(true);
    try {
      const nextFaces = faces.map((f) =>
        f.id === faceId ? applyFaceTagOption(f, option) : f,
      );
      await afterSave(nextFaces);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFace = async (faceId) => {
    setSaving(true);
    try {
      const nextFaces = faces.filter((f) => f.id !== faceId);
      await afterSave(nextFaces);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open || !currentFaceId) return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName;
      const isFormField =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;

      if (isFormField) return undefined;
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        handleDeleteFace(currentFaceId);
      }
      return undefined;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, currentFaceId, handleDeleteFace]);

  const handleAddFace = () => {
    if (!currentItem) return;
    const nextFaces = normalizeFaces([...(currentItem.faces || []), createDefaultFace()]);
    handleFacesChange(nextFaces);
    setFaceIndex(Math.max(0, nextFaces.length - 1));
    setDrawMode(false);
  };

  const handleClose = async () => {
    await flushLayoutPersist();
    closeNoFacesReview();
  };

  const macButtonStyle = {
    height: 24,
    borderRadius: "8px",
    px: 3,
    py: 1,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.9) : "#fff",
          backdropFilter: "blur(15px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[24],
          overflow: "hidden",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : queue.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ py: 6, textAlign: "center", fontSize: "0.95rem" }}
          >
            Нет фото, где сканирование не нашло лиц.
          </Typography>
        ) : (
          <Stack direction="row" sx={{ height: 630 }}>
            {/* Левый блок */}
            <Stack
              width={400}
              sx={{
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: isDark ? alpha("#000", 0.2) : alpha("#000", 0.015),
              }}
            >
              {/* Шапка левого блока */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2.5,
                  py: 2,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
                }}
              >
                <IconButton
                  onClick={handleClose}
                  size="small"
                  sx={{ borderRadius: "10px" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Фото без лиц
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      p: 0.8,
                      borderRadius: "10px",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      display: "flex",
                    }}
                  >
                    <FaceRetouchingNaturalIcon sx={{ fontSize: 20 }} />
                  </Box>
                </Stack>
              </Box>

              {/* Содержимое левой панели */}
              <Stack
                spacing={1.5}
                sx={{ p: 2.5, flexGrow: 1, overflow: "hidden" }}
              >
                {/* Список лиц */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <FaceIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Лица на фото
                      </Typography>
                    </Stack>
                    <Button size="small" onClick={handleAddFace} disabled={saving}>
                      + Лицо
                    </Button>
                  </Stack>

                  {currentItem?.faces?.length > 0 ? (
                    currentItem.faces.map((face, index) => {
                      const isPending = faceNeedsReview(face);
                      const suggestedPerson = allPeople.find(
                        (p) => p.id === face.suggestedPersonId,
                      );
                      const suggestedExternal = allExternal.find(
                        (e) => e.id === face.suggestedExternalEntityId,
                      );
                      const confidence =
                        face.suggestDistance != null
                          ? distanceToConfidence(face.suggestDistance)
                          : null;

                      const isSelected = face.id === currentFaceId;
                      const selectedOption = faceTagOptionFromFace(
                        face,
                        allPeople,
                        allExternal,
                      );

                      const showSuggestion =
                        isPending && Boolean(suggestedPerson || suggestedExternal);
                      const suggestedName = suggestedPerson
                        ? getPersonLabel(suggestedPerson)
                        : getExternalEntityLabel(suggestedExternal);
                      const suggestionLabel = `Предложено${
                        confidence != null ? ` (${confidence}%)` : ""
                      }`;

                      return (
                        <Box
                          key={face.id}
                          onClick={() => setFaceIndex(index)}
                          sx={{
                            p: 1,
                            borderRadius: "16px",
                            borderColor: isSelected
                              ? theme.palette.primary.main
                              : alpha(theme.palette.divider, 0.12),
                            bgcolor: isSelected
                              ? alpha(theme.palette.primary.main, 0.1)
                              : isDark
                                ? alpha("#fff", 0.02)
                                : alpha("#000", 0.01),
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            cursor: "pointer",
                            "&:hover": {
                              borderColor: isSelected
                                ? theme.palette.primary.main
                                : alpha(theme.palette.divider, 0.25),
                              bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.08)
                                : isDark
                                  ? alpha("#fff", 0.04)
                                  : alpha("#000", 0.025),
                            },
                          }}
                        >
                          <Stack spacing={1}>
                            {/* Основная строка: Инпут ручного выбора + Кнопка удаления */}
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Autocomplete
                                size="small"
                                fullWidth
                                options={faceTagOptions}
                                groupBy={(opt) =>
                                  opt.kind === "person"
                                    ? "Родственники"
                                    : "Справочник"
                                }
                                getOptionLabel={(opt) => opt.label}
                                isOptionEqualToValue={(a, b) =>
                                  a?.kind === b?.kind && a?.id === b?.id
                                }
                                value={selectedOption}
                                onChange={(_, option) => {
                                  if (option) handleAssignFace(face.id, option);
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label={`Лицо ${index + 1}`}
                                    placeholder="Выберите человека"
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                      },
                                    }}
                                  />
                                )}
                                slotProps={{
                                  paper: {
                                    sx: { borderRadius: "12px", mt: 0.5 },
                                  },
                                }}
                              />

                              {/* Кнопка Удалить */}
                              <Tooltip title="Удалить рамку">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFace(face.id);
                                  }}
                                  disabled={saving}
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.error.main,
                                      0.1,
                                    ),
                                    borderRadius: "8px",
                                    p: 0.8,
                                    "&:hover": {
                                      bgcolor: alpha(
                                        theme.palette.error.main,
                                        0.2,
                                      ),
                                    },
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>

                            {/* Строка с предложенным лицом + Кнопка подтверждения */}
                            <Collapse
                              in={showSuggestion}
                              timeout={300}
                              unmountOnExit
                              sx={{ width: "100%" }}
                            >
                              <Fade in={showSuggestion} timeout={300}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  {/* Заблокированный инпут с пунктиром и предложенным именем */}
                                  <TextField
                                    size="small"
                                    fullWidth
                                    disabled
                                    label={suggestionLabel}
                                    value={suggestedName}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        bgcolor: alpha(
                                          theme.palette.primary.main,
                                          0.04,
                                        ),
                                        "& fieldset": {
                                          borderStyle: "dashed",
                                          borderColor: alpha(
                                            theme.palette.primary.main,
                                            0.4,
                                          ),
                                        },
                                      },
                                      "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor:
                                          theme.palette.primary.main,
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                      },
                                      "& .MuiInputLabel-root.Mui-disabled": {
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                      },
                                    }}
                                  />

                                  {/* Кнопка Подтвердить */}
                                  <Tooltip title="Подтвердить предложение">
                                    <IconButton
                                      color="success"
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcceptSuggestion(face);
                                      }}
                                      disabled={saving}
                                      sx={{
                                        bgcolor: alpha(
                                          theme.palette.success.main,
                                          0.12,
                                        ),
                                        color: theme.palette.success.main,
                                        borderRadius: "8px",
                                        p: 0.8,
                                        "&:hover": {
                                          bgcolor: alpha(
                                            theme.palette.success.main,
                                            0.25,
                                          ),
                                        },
                                        "&.Mui-disabled": {
                                          bgcolor: alpha(
                                            theme.palette.action.disabled,
                                            0.08,
                                          ),
                                        },
                                      }}
                                    >
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Fade>
                            </Collapse>
                          </Stack>
                        </Box>
                      );
                    })
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.85rem", py: 2, textAlign: "center" }}
                    >
                      На снимке нет рамок. Нажмите «Новая рамка», «Найти лица»
                      или «Пропустить».
                    </Typography>
                  )}
                </Box>

                {/* Нижняя навигация */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    pt: 1.5,
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  }}
                >
                  <Button
                    startIcon={<NavigateBeforeIcon />}
                    onClick={goToPrevPhoto}
                    disabled={photoIndex === 0 || saving}
                    size="small"
                    variant="outlined"
                    sx={{ ...macButtonStyle }}
                  >
                    Пред.
                  </Button>

                  <Button
                    endIcon={<NavigateNextIcon />}
                    onClick={goToNextPhoto}
                    disabled={photoIndex >= queue.length - 1 || saving}
                    size="small"
                    variant="outlined"
                    sx={{ ...macButtonStyle }}
                  >
                    След.
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSkipPhoto}
                    disabled={saving || queue.length === 0}
                    sx={{ ...macButtonStyle, ml: "auto" }}
                  >
                    Пропустить
                  </Button>
                </Stack>
              </Stack>
            </Stack>

            {/* Правая часть — Интерактивное превью */}
            <Stack flex={1} spacing={1.5} sx={{ p: 2 }}>
              <Box
                sx={{
                  position: "relative",
                  flexGrow: 1,
                  width: "100%",
                  bgcolor: isDark ? alpha("#000", 0.4) : alpha("#000", 0.03),
                  borderRadius: "16px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                {previewUrl && (
                  <Box
                    ref={previewFrameRef}
                    sx={{
                      position: "relative",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    <Box
                      component="img"
                      src={previewUrl}
                      alt=""
                      onLoad={handlePreviewLoad}
                      sx={{
                        maxHeight: 570,
                        maxWidth: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                    {currentItem?.imageSize?.width > 0 && (
                      <PhotoFaceOverlay
                        faces={faces}
                        imageSize={currentItem.imageSize}
                        imageFrameRef={previewFrameRef}
                        allPeople={allPeople}
                        allExternal={allExternal}
                        editable
                        selectedFaceId={currentFaceId}
                        onSelectFace={(id) => {
                          const idx = allFaceIds.indexOf(id);
                          if (idx >= 0) setFaceIndex(idx);
                        }}
                        onFacesChange={handleFacesChange}
                        drawMode={drawMode}
                        highlightFaceId={currentFaceId}
                      />
                    )}

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        zIndex: 3,
                      }}
                    >
                      <Button
                        size="small"
                        variant={drawMode ? "contained" : "outlined"}
                        startIcon={<AddIcon />}
                        onClick={() => setDrawMode((v) => !v)}
                        disabled={saving}
                        sx={{
                          bgcolor: drawMode ? "primary.main" : "rgba(0,0,0,0.55)",
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.3)",
                          "&:hover": {
                            bgcolor: drawMode ? "primary.dark" : "rgba(0,0,0,0.7)",
                          },
                        }}
                      >
                        {drawMode ? "Рамка…" : "Рамка"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          detecting ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <FaceRetouchingNaturalIcon />
                          )
                        }
                        disabled={detecting || saving}
                        onClick={handleDetectFaces}
                        sx={{
                          bgcolor: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.3)",
                        }}
                      >
                        Найти
                      </Button>
                      <IconButton
                        size="small"
                        aria-label="Подсказка по разметке лиц"
                        onClick={(e) => setFaceHelpAnchor(e.currentTarget)}
                        sx={{
                          bgcolor: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.3)",
                          width: 34,
                          height: 34,
                          "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                        }}
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Popover
                      open={Boolean(faceHelpAnchor)}
                      anchorEl={faceHelpAnchor}
                      onClose={() => setFaceHelpAnchor(null)}
                      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                      transformOrigin={{ vertical: "top", horizontal: "left" }}
                      slotProps={{
                        paper: {
                          sx: { p: 2, maxWidth: 320 },
                        },
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                        Управление рамками
                      </Typography>
                      <Stack spacing={0.75} component="ul" sx={{ m: 0, pl: 2.2 }}>
                        <Typography component="li" variant="body2">
                          <strong>Рамка</strong> — режим рисования новой рамки (ЛКМ +
                          перетаскивание)
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>Найти</strong> — авто-поиск лиц на фото
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>ЛКМ</strong> по рамке — выбор лица
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>Точка справа внизу</strong> (ЛКМ) — изменение
                          размера рамки
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>ПКМ + перетаскивание</strong> — рисование
                          новой рамки
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>ЛКМ + перетаскивание</strong> — перемещение
                          выбранной рамки
                        </Typography>
                        <Typography component="li" variant="body2">
                          <strong>Backspace</strong> — удалить выделенную рамку
                        </Typography>
                      </Stack>
                    </Popover>
                  </Box>
                )}
              </Box>

              {/* Информационная строка */}
              <Typography
                variant="caption"
                color="text.secondary"
                    sx={{ textAlign: "center", fontWeight: 500, "MuiTypography-root": {marginTop:"8px"} }}
              >
                Фото {photoIndex + 1} из {queue.length}
                {allFaceIds.length > 0 &&
                  ` · лицо ${faceIndex + 1} из ${allFaceIds.length}`}
                {" · "}
                {currentItem?.title || currentItem?.filename}
              </Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
