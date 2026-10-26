import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  Button,
  TextField,
  Stack,
  Autocomplete,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  Popover,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckIcon from "@mui/icons-material/Check";
import PhotoFaceOverlay from "../PhotoFaceOverlay";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { useNotificationStore } from "../../store/useNotificationStore";
import { distanceToConfidence } from "../../services/faceRecognition";
import { detectFacesFromImageUrl } from "../../services/faceDetection";
import {
  enrichFacesWithDescriptors,
  suggestPersonsFromFaceIndex,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import {
  normalizeFaces,
  createDefaultFace,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  getPersonLabel,
  confirmFaceAssignment,
  confirmExternalFaceAssignment,
} from "../../utils/photoFaces";
import {
  buildFaceTagOptions,
  faceTagOptionFromFace,
  applyFaceTagOption,
  getExternalEntityLabel,
} from "../../utils/externalEntities";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

// Редактор разметки лиц фото в стиле iOS (как PhotoPreviewDialog).
export default function PhotoFacesDialog({
  open,
  meta,
  onClose,
  allPeople = [],
  photoPaths,
  setPhotos,
  onSaved,
}) {
  const theme = useTheme();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [allExternal, setAllExternal] = useState([]);
  const [faces, setFaces] = useState([]);
  const [imageSize, setImageSize] = useState(null);
  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faceHelpAnchor, setFaceHelpAnchor] = useState(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewFrameRef = useRef(null);

  useEffect(() => {
    if (open) {
      window.externalAPI?.getAll?.().then((data) => setAllExternal(data || []));
    }
  }, [open]);

  useEffect(() => {
    if (meta && open) {
      setFaces(normalizeFaces(meta.faces));
      setImageSize(meta.imageSize ?? null);
      setSelectedFaceId(null);
      setDrawMode(false);
    }
  }, [meta, open]);

  useEffect(() => {
    let mounted = true;
    async function loadPreview() {
      if (!meta?.filename || !open) return;
      setPreviewLoading(true);
      const cachedFull =
        photoPaths?.full?.[meta.id] || photoPaths?.[meta.id] || null;
      if (cachedFull) {
        if (mounted) {
          setPreviewUrl(cachedFull);
          setPreviewLoading(false);
        }
        return;
      }
      try {
        const p = await window.photoAPI.getPath(meta.owner, meta.filename, "webp");
        if (mounted) setPreviewUrl(p);
      } catch (e) {
        console.warn("Preview load failed", e);
      } finally {
        if (mounted) setPreviewLoading(false);
      }
    }
    loadPreview();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, photoPaths, open]);

  const faceTagOptions = buildFaceTagOptions(allPeople, allExternal);
  const selectedFace = faces.find((f) => f.id === selectedFaceId);

  const handleFacesChange = (nextFaces) => {
    setFaces(normalizeFaces(nextFaces));
  };

  const handleAddFace = () => {
    const next = [...faces, createDefaultFace()];
    handleFacesChange(next);
    setSelectedFaceId(next[next.length - 1].id);
    setDrawMode(false);
  };

  const handleAcceptSuggestion = (face) => {
    if (!face?.suggestedPersonId && !face?.suggestedExternalEntityId) return;
    const next = faces.map((f) =>
      f.id !== face.id
        ? f
        : face.suggestedExternalEntityId
          ? confirmExternalFaceAssignment(f, face.suggestedExternalEntityId)
          : confirmFaceAssignment(f, face.suggestedPersonId),
    );
    handleFacesChange(next);
    setSelectedFaceId(face.id);
  };

  const handleDetectFaces = async () => {
    if (!meta?.owner || !meta?.filename) return;
    setDetecting(true);
    setDrawMode(false);
    try {
      const detectUrl =
        previewUrl ||
        (await window.photoAPI.getPath(meta.owner, meta.filename, "webp"));
      if (!detectUrl) throw new Error("Не удалось загрузить изображение");

      const { faces: detected, imageSize: size } = await detectFacesFromImageUrl(
        detectUrl,
        { withDescriptors: true, applyNmsFilter: true },
      );

      if (detected.length === 0) {
        addNotification({
          title: "Лица",
          message: "На фото не найдено лиц",
          type: "info",
          category: "photo",
        });
        return;
      }

      const suggested = await suggestPersonsFromFaceIndex(detected);
      setImageSize(size);
      handleFacesChange(suggested);
      setSelectedFaceId(suggested[0]?.id ?? null);
      addNotification({
        title: "Лица",
        message: `Найдено лиц: ${detected.length}`,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error(e);
      addNotification({
        title: "Лица",
        message: e.message || "Ошибка определения лиц",
        type: "error",
        category: "photo",
      });
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    if (!open || !selectedFaceId) return undefined;
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
        const next = faces.filter((f) => f.id !== selectedFaceId);
        handleFacesChange(next);
        setSelectedFaceId(null);
      }
      return undefined;
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedFaceId, faces]);

  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      let facesToSave = normalizeFaces(faces);
      if (previewUrl) {
        facesToSave = await enrichFacesWithDescriptors(
          previewUrl,
          facesToSave,
          imageSize,
        );
      }

      const updatedEntry = {
        ...meta,
        faces: facesToSave,
        imageSize,
        people: syncPeopleFromFaces(facesToSave, meta.people),
        externalPeople: syncExternalPeopleFromFaces(
          facesToSave,
          meta.externalPeople,
        ),
      };

      await window.photoAPI.addOrUpdateOwnerJson(meta.owner, updatedEntry);
      await syncReferencesAfterPhotoSave(
        { owner: meta.owner, id: meta.id },
        facesToSave,
      );

      setPhotos?.((prev) =>
        prev.map((p) => (p.id === meta.id ? updatedEntry : p)),
      );
      onSaved?.(updatedEntry);
      onClose?.();
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлена разметка лиц, ID: ${meta.id ?? null}. Лиц: ${facesToSave.length}`,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error("Save faces failed", e);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: "Ошибка: " + (e.message || e),
        type: "error",
        category: "photo",
      });
    } finally {
      setSaving(false);
    }
  };

  useDialogSaveHotkey({ open, onSave: handleSave, disabled: saving });

  // Стеклянные контролы как на карте.
  const glassBg = theme.palette.glass.surface;
  const glassHover = theme.palette.glass.hover;
  const glassSx = {
    bgcolor: glassBg,
    color: theme.palette.text.primary,
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    "&:hover": {
      backgroundColor: `${glassBg} !important`,
      backgroundImage: `linear-gradient(${glassHover}, ${glassHover})`,
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          width: 920,
          maxWidth: "94vw",
          maxHeight: "94vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box sx={{ p: 3, overflowY: "auto" }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
        >
          Лица
        </Typography>

        <Stack direction="row" spacing={2} alignItems="stretch">
          {/* ФОТО */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              height: "min(640px, 72vh)",
              borderRadius: "18px",
              overflow: "hidden",
              position: "relative",
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {previewLoading && (
              <CircularProgress sx={{ position: "absolute", zIndex: 1 }} />
            )}
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
                  alt="Превью"
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    if (naturalWidth && naturalHeight) {
                      setImageSize({
                        width: naturalWidth,
                        height: naturalHeight,
                      });
                    }
                  }}
                  sx={{
                    maxHeight: "min(640px, 72vh)",
                    maxWidth: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                {imageSize?.width > 0 && (
                  <PhotoFaceOverlay
                    faces={faces}
                    imageSize={imageSize}
                    imageFrameRef={previewFrameRef}
                    allPeople={allPeople}
                    allExternal={allExternal}
                    editable
                    selectedFaceId={selectedFaceId}
                    onSelectFace={setSelectedFaceId}
                    onFacesChange={handleFacesChange}
                    drawMode={drawMode}
                    highlightFaceId={selectedFaceId}
                  />
                )}
              </Box>
            )}

            <Stack
              direction="row"
              spacing={1}
              sx={{ position: "absolute", top: 12, left: 12, zIndex: 3 }}
            >
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
                disabled={detecting || !previewUrl}
                onClick={handleDetectFaces}
                sx={{
                  ...glassSx,
                  height: 36,
                  minHeight: 36,
                  borderRadius: "999px",
                  px: 2,
                  fontSize: "0.8125rem",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  "& .MuiButton-startIcon": {
                    mr: 0.5,
                    ml: 0,
                    "& > *:nth-of-type(1)": { fontSize: 16 },
                  },
                }}
              >
                Найти
              </Button>
              <IconButton
                size="small"
                aria-label="Подсказка по разметке лиц"
                onClick={(e) => setFaceHelpAnchor(e.currentTarget)}
                sx={{
                  ...glassSx,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
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
              slotProps={{ paper: { sx: { p: 2, maxWidth: 320 } } }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Управление рамками
              </Typography>
              <Stack spacing={0.75} component="ul" sx={{ m: 0, pl: 2.2 }}>
                <Typography component="li" variant="body2">
                  <strong>Найти</strong> — авто-поиск всех лиц на фото
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>ЛКМ</strong> по рамке — выбор лица
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Точка справа внизу</strong> (ЛКМ) — изменение размера
                  рамки
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>ПКМ + перетаскивание</strong> — рисование новой рамки
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>ЛКМ + перетаскивание</strong> — перемещение выбранной
                  рамки
                </Typography>
                <Typography component="li" variant="body2">
                  <strong>Backspace</strong> — удалить выделенную рамку
                </Typography>
              </Stack>
            </Popover>
          </Box>

          {/* СПИСОК ЛИЦ */}
          <Box
            sx={{
              width: 340,
              flexShrink: 0,
              height: "min(640px, 72vh)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography
                variant="overline"
                sx={{ fontWeight: 700, color: "text.secondary" }}
              >
                Лица на фото {faces.length > 0 ? `· ${faces.length}` : ""}
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddFace}
                sx={{ textTransform: "none" }}
              >
                Лицо
              </Button>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5 }}>
              {faces.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Нет размеченных лиц. Нажмите «Найти» или нарисуйте рамку.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {faces.map((face, index) => {
                    const isSelected = selectedFaceId === face.id;
                    const suggestedPerson =
                      face.suggestedPersonId != null
                        ? allPeople.find(
                            (p) => p.id === face.suggestedPersonId,
                          )
                        : null;
                    const suggestedExternal =
                      face.suggestedExternalEntityId != null
                        ? allExternal.find(
                            (e) => e.id === face.suggestedExternalEntityId,
                          )
                        : null;
                    const hasSuggestion = Boolean(
                      suggestedPerson || suggestedExternal,
                    );

                    return (
                      <Box
                        key={face.id}
                        onClick={() => setSelectedFaceId(face.id)}
                        sx={{
                          p: 1.5,
                          borderRadius: "18px",
                          bgcolor: isSelected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : "action.hover",
                          border: `1px solid ${
                            isSelected
                              ? theme.palette.primary.main
                              : alpha(theme.palette.divider, 0.4)
                          }`,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Autocomplete
                            fullWidth
                            size="small"
                            options={faceTagOptions}
                            slotProps={{ paper: { sx: { fontSize: "0.8rem" } } }}
                            groupBy={(opt) =>
                              opt.kind === "person"
                                ? "Родственники"
                                : "Справочник"
                            }
                            getOptionLabel={(opt) => opt.label}
                            isOptionEqualToValue={(a, b) =>
                              a?.kind === b?.kind && a?.id === b?.id
                            }
                            value={faceTagOptionFromFace(
                              face,
                              allPeople,
                              allExternal,
                            )}
                            onChange={(_, option) => {
                              const next = faces.map((f) =>
                                f.id === face.id
                                  ? applyFaceTagOption(f, option)
                                  : f,
                              );
                              handleFacesChange(next);
                              setSelectedFaceId(face.id);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={`Лицо ${index + 1}`}
                                onFocus={() => setSelectedFaceId(face.id)}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                  },
                                  "& .MuiInputBase-input": {
                                    fontSize: "0.8rem",
                                  },
                                  "& .MuiInputLabel-root": {
                                    fontSize: "0.75rem",
                                  },
                                }}
                              />
                            )}
                          />

                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = faces.filter(
                                (f) => f.id !== face.id,
                              );
                              handleFacesChange(next);
                              if (selectedFaceId === face.id)
                                setSelectedFaceId(null);
                            }}
                            sx={{
                              borderRadius: "10px",
                              flexShrink: 0,
                              bgcolor: alpha(theme.palette.error.main, 0.12),
                              "&:hover": {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                              },
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        {hasSuggestion &&
                          !face.personId &&
                          !face.externalEntityId && (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              onClick={() => setSelectedFaceId(face.id)}
                              sx={{ mt: 1, cursor: "pointer" }}
                            >
                              <TextField
                                size="small"
                                fullWidth
                                disabled
                                label={`Предложено${
                                  face.suggestDistance != null
                                    ? ` (${distanceToConfidence(face.suggestDistance)}%)`
                                    : ""
                                }`}
                                value={
                                  suggestedPerson
                                    ? getPersonLabel(suggestedPerson)
                                    : getExternalEntityLabel(suggestedExternal)
                                }
                                sx={{
                                  pointerEvents: "none",
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                    bgcolor: "transparent",
                                    "& fieldset": {
                                      borderStyle: "dashed",
                                      borderColor: alpha(
                                        theme.palette.primary.main,
                                        isSelected ? 0.8 : 0.4,
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
                              <Tooltip title="Подтвердить предложение">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptSuggestion(face);
                                  }}
                                  sx={{
                                    flexShrink: 0,
                                    borderRadius: "10px",
                                    bgcolor: alpha(
                                      theme.palette.success.main,
                                      0.12,
                                    ),
                                    color: theme.palette.success.main,
                                    "&:hover": {
                                      bgcolor: alpha(
                                        theme.palette.success.main,
                                        0.25,
                                      ),
                                    },
                                  }}
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <DialogActionsBar sx={{ px: 0, pb: 0 }}>
              <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
              <DialogActionButton
                tone="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </DialogActionButton>
            </DialogActionsBar>
          </Box>
        </Stack>
      </Box>
    </Dialog>
  );
}
