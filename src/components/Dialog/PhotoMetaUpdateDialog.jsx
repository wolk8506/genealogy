import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Autocomplete,
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CustomDatePickerDialog from "../CustomDatePickerDialog";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HashtagInput from "../HashtagInput";
import PhotoFaceOverlay from "../PhotoFaceOverlay";
import { useNotificationStore } from "../../store/useNotificationStore";
import DraggableDialog from "./DraggableDialog";
import FaceIcon from "@mui/icons-material/Face";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckIcon from "@mui/icons-material/Check";
import Popover from "@mui/material/Popover";
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

export default function PhotoMetaUpdateDialog({
  open,
  meta,
  onClose,
  allPeople = [],
  photoPaths,
  setPhotos,
  setPhotoPaths,
  mode = "global",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const [local, setLocal] = useState({
    id: null,
    title: "",
    description: "",
    datePhoto: "",
    owner: null,
    people: [],
    externalPeople: [],
    faces: [],
    imageSize: null,
    filename: "",
    aspectRatio: "4/3",
    locationName: null,
  });

  const [allExternal, setAllExternal] = useState([]);

  const [selectedFaceId, setSelectedFaceId] = useState(null);
  const [drawMode, setDrawMode] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceHelpAnchor, setFaceHelpAnchor] = useState(null);

  const [rename, setRename] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewFrameRef = useRef(null);

  const initialRef = useRef(null);

  useEffect(() => {
    if (meta && open) {
      const data = {
        id: meta.id ?? null,
        title: meta.title ?? "",
        description: meta.description ?? "",
        datePhoto: meta.datePhoto ?? "",
        owner: meta.owner ?? null,
        people: meta.people ? [...meta.people] : [],
        externalPeople: meta.externalPeople ? [...meta.externalPeople] : [],
        faces: normalizeFaces(meta.faces),
        imageSize: meta.imageSize ?? null,
        filename: meta.filename ?? "",
        aspectRatio: meta.aspectRatio ?? "4/3",
        locationName: meta.locationName || "",
      };
      setLocal(data);
      setNewFilename(meta.filename ?? "");
      initialRef.current = { ...data, faces: normalizeFaces(data.faces) };
      setRename(false);
      setSelectedFaceId(null);
      setDrawMode(false);
    }
  }, [meta, open]);

  useEffect(() => {
    if (open) {
      window.externalAPI.getAll().then(setAllExternal);
    }
  }, [open]);

  const faceTagOptions = buildFaceTagOptions(allPeople, allExternal);

  const handlePreviewLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setLocal((s) => ({
      ...s,
      imageSize: { width: naturalWidth, height: naturalHeight },
    }));
  };

  useEffect(() => {
    let mounted = true;

    async function loadPreview() {
      if (!meta || !meta.filename || !open) return;

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
        const p = await window.photoAPI.getPath(
          meta.owner,
          meta.filename,
          "webp",
        );
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
  }, [meta, photoPaths, open]);

  const handleSave = async () => {
    if (!initialRef.current) return;
    setSaving(true);

    try {
      const oldData = initialRef.current;
      const extractedHashtags = local.description
        ? (local.description.match(/#[\p{L}\d_]+/gu) || []).map((t) =>
          t.toLowerCase(),
        )
        : [];
      const finalFilename = rename
        ? newFilename || oldData.filename
        : oldData.filename;

      const ownerChanged = String(local.owner) !== String(oldData.owner);
      const filenameChanged =
        String(finalFilename) !== String(oldData.filename);

      if (ownerChanged) {
        await window.fileAPI.moveFile(
          oldData.owner,
          local.owner,
          oldData.filename,
          finalFilename,
        );
      } else if (filenameChanged) {
        await window.fileAPI.renameFile?.(
          oldData.owner,
          oldData.filename,
          finalFilename,
        );
      }

      const finalLocation = local.locationName?.trim() || null;
      const syncedPeople = syncPeopleFromFaces(local.faces, local.people);
      const syncedExternal = syncExternalPeopleFromFaces(
        local.faces,
        local.externalPeople,
      );

      let facesToSave = normalizeFaces(local.faces);
      if (previewUrl) {
        facesToSave = await enrichFacesWithDescriptors(
          previewUrl,
          facesToSave,
          local.imageSize,
        );
      }

      const updatedEntry = {
        ...meta,
        ...local,
        people: syncedPeople,
        externalPeople: syncedExternal,
        faces: facesToSave,
        imageSize: local.imageSize,
        locationName: finalLocation,
        filename: finalFilename,
        hashtags: extractedHashtags,
      };

      if (ownerChanged || filenameChanged) {
        await window.photoAPI.removeFromOwnerJson(oldData.owner, {
          filename: oldData.filename,
          id: oldData.id,
        });
      }
      await window.photoAPI.addOrUpdateOwnerJson(local.owner, updatedEntry);

      await syncReferencesAfterPhotoSave(
        { owner: local.owner, id: updatedEntry.id },
        facesToSave,
      );

      if (setPhotos) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === oldData.id ? updatedEntry : p)),
        );
      }

      if (setPhotoPaths && (ownerChanged || filenameChanged)) {
        setPhotoPaths((prev) => {
          const copy = { ...prev };
          if (copy.thumbs) delete copy.thumbs[oldData.id];
          if (copy.full) delete copy.full[oldData.id];
          delete copy[oldData.id];
          return { ...copy };
        });
      }

      onClose();
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлено фото ID: ${updatedEntry.id ?? null}. \nВладелец ID: ${updatedEntry.owner ?? ""}. \nИмя файла: ${updatedEntry?.filename ?? ""} `,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error("Save failed", e);
      alert("Ошибка: " + (e.message || e));
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

  const [uniqueTags, setUniqueTags] = useState([]);
  useEffect(() => {
    window.photoAPI.getGlobalHashtags().then((tags) => {
      setUniqueTags(tags);
    });
  }, [open]);

  const handleFacesChange = (nextFaces) => {
    const normalized = normalizeFaces(nextFaces);
    setLocal((s) => ({
      ...s,
      faces: normalized,
      people: syncPeopleFromFaces(normalized, s.people),
      externalPeople: syncExternalPeopleFromFaces(normalized, s.externalPeople),
    }));
  };

  const handleAcceptSuggestion = async (face) => {
    if (!face?.suggestedPersonId && !face?.suggestedExternalEntityId) return;

    const next = local.faces.map((f) =>
      f.id !== face.id
        ? f
        : face.suggestedExternalEntityId
          ? confirmExternalFaceAssignment(f, face.suggestedExternalEntityId)
          : confirmFaceAssignment(f, face.suggestedPersonId),
    );

    handleFacesChange(next);

    if (local.owner && local.id) {
      const facesToSave = normalizeFaces(next);
      if (previewUrl) {
        try {
          const enriched = await enrichFacesWithDescriptors(
            previewUrl,
            facesToSave,
            local.imageSize,
          );
          await syncReferencesAfterPhotoSave(
            { owner: local.owner, id: local.id },
            enriched,
          );
        } catch (e) {
          console.warn("Не удалось сразу сохранить face reference", e);
        }
      }

      await syncReferencesAfterPhotoSave(
        { owner: local.owner, id: local.id },
        facesToSave,
      );
    }

    setSelectedFaceId(face.id);
  };

  const handleAddFace = () => {
    const next = [...local.faces, createDefaultFace()];
    handleFacesChange(next);
    setSelectedFaceId(next[next.length - 1].id);
    setDrawMode(false);
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
        const next = local.faces.filter((f) => f.id !== selectedFaceId);
        handleFacesChange(next);
        setSelectedFaceId(null);
      }
      return undefined;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedFaceId, local.faces, handleFacesChange]);

  const handleDetectFaces = async () => {
    if (!meta?.owner || !meta?.filename) return;
    setDetecting(true);
    setDrawMode(false);

    try {
      const detectUrl =
        previewUrl ||
        (await window.photoAPI.getPath(meta.owner, meta.filename, "webp"));

      if (!detectUrl) throw new Error("Не удалось загрузить изображение");

      const { faces: detected, imageSize } = await detectFacesFromImageUrl(
        detectUrl,
        {
          withDescriptors: true,
          applyNmsFilter: true,
        },
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

      const suggestedFaces = await suggestPersonsFromFaceIndex(detected);

      setLocal((s) => ({ ...s, imageSize }));
      handleFacesChange(suggestedFaces);
      setSelectedFaceId(suggestedFaces[0]?.id ?? null);
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

  const selectedFace = local.faces.find((f) => f.id === selectedFaceId);

  // Стиль для кнопок из FaceReviewQueueDialog
  const macButtonStyle = {
    height: 24,
    borderRadius: "8px",
    px: 3,
    py: 1,
    textTransform: "none",
    fontWeight: 600,
    boxShadow: "none",
  };

  useDialogSaveHotkey({
    open,
    onSave: handleSave,
    disabled: saving,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperComponent={DraggableDialog}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.9) : "#fff",
          backdropFilter: "blur(15px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[24],
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack direction="row" sx={{ height: 630 }}>
          {/* ЛЕВАЯ КОЛОНКА: Форма редактирования */}
          <Box
            sx={{
              width: 400,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: isDark ? alpha("#000", 0.2) : alpha("#000", 0.015),
            }}
          >
            {/* Шапка левого блока (Заголовок с закрытием в стиле FaceReviewQueueDialog) */}
            <Box
              id="draggable-header"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
                cursor: "move",
              }}
            >
              <IconButton
                onClick={onClose}
                size="small"
                sx={{ borderRadius: "10px" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Редактирование фото
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
                  <EditIcon sx={{ fontSize: 20 }} />
                </Box>
              </Stack>
            </Box>

            {/* Содержимое формы с прокруткой */}
            <Box
              sx={{
                p: 2.5,
                flexGrow: 1,
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 4 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "divider",
                  borderRadius: 2,
                },
              }}
            >
              <Stack spacing={3}>
                {/* Секция: Метаданные */}
                <Stack spacing={2.5}>
                  <TextField
                    label="Заголовок"
                    fullWidth
                    variant="outlined"
                    value={local.title}
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, title: e.target.value }))
                    }
                    InputProps={{ sx: { borderRadius: "12px" } }}
                  />

                  <HashtagInput
                    value={local.description}
                    onChange={(val) =>
                      setLocal((s) => ({ ...s, description: val }))
                    }
                    suggestions={uniqueTags}
                    placeholder="Описание и #теги..."
                  />
                </Stack>

                <Divider sx={{ opacity: 0.5 }} />

                {/* Секция: Разметка лиц */}
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <FaceIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Лица на фото
                      </Typography>
                    </Stack>
                    <Button size="small" onClick={handleAddFace}>
                      + Лицо
                    </Button>
                  </Stack>

                  {local.faces.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Нет размеченных лиц. Нажмите «Найти» или ПКМ + drag для
                      новой рамки.
                    </Typography>
                  ) : (
                    local.faces.map((face, index) => {
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
                        <Stack key={face.id} spacing={0.8}>
                          <Stack
                            // direction="row"
                            flexDirection="column"
                            spacing={1.25}
                            alignItems="center"
                            onClick={() => setSelectedFaceId(face.id)}
                            sx={{
                              p: 0.5,
                              borderRadius: "14px",
                              transition: "all 0.2s ease",
                              bgcolor: isSelected
                                ? alpha(theme.palette.primary.main, 0.08)
                                : "transparent",
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              width={1}
                              alignItems="center"
                            >
                              <Autocomplete
                                fullWidth
                                size="small"
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
                                value={faceTagOptionFromFace(
                                  face,
                                  allPeople,
                                  allExternal,
                                )}
                                onChange={(_, option) => {
                                  const next = local.faces.map((f) =>
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
                                        transition: "all 0.2s ease",
                                        borderColor: isSelected
                                          ? theme.palette.primary.main
                                          : undefined,
                                        "& fieldset": {
                                          borderColor: isSelected
                                            ? `${theme.palette.primary.main} !important`
                                            : undefined,
                                          borderWidth: isSelected
                                            ? "2px !important"
                                            : "1px",
                                        },
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
                                  const next = local.faces.filter(
                                    (f) => f.id !== face.id,
                                  );
                                  handleFacesChange(next);
                                  if (selectedFaceId === face.id) {
                                    setSelectedFaceId(null);
                                  }
                                }}
                                sx={{
                                  borderRadius: "8px",
                                  bgcolor: alpha(
                                    theme.palette.error.main,
                                    0.12,
                                  ),
                                  p: 1,
                                  "&:hover": {
                                    bgcolor: alpha(
                                      theme.palette.error.main,
                                      0.1,
                                    ),
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
                                  width={1}
                                  alignItems="center"
                                  onClick={() => setSelectedFaceId(face.id)}
                                  sx={{
                                    cursor: "pointer",
                                    p: 0.5,
                                    borderRadius: "10px",
                                    transition: "all 0.2s ease",

                                  }}
                                >
                                  <TextField
                                    size="small"
                                    fullWidth
                                    disabled
                                    label={`Предложено${face.suggestDistance != null
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
                                        borderRadius: "10px",
                                        bgcolor: "transparent", // <--- Прозрачный фон инпута
                                        "& fieldset": {
                                          borderStyle: "dashed",
                                          borderColor: alpha(
                                            theme.palette.primary.main,
                                            isSelected ? 0.8 : 0.4,
                                          ),
                                          borderWidth: isSelected ? "2px" : "1px",
                                        },
                                      },
                                      "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: theme.palette.primary.main,
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
                                        width: 36,
                                        height: 36,
                                        flexShrink: 0,
                                        bgcolor: alpha(theme.palette.success.main, 0.12),
                                        color: theme.palette.success.main,
                                        borderRadius: "8px",
                                        p: 0.8,
                                        "&:hover": {
                                          bgcolor: alpha(theme.palette.success.main, 0.25),
                                        },
                                      }}
                                    >
                                      <CheckIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              )}
                          </Stack>
                        </Stack>
                      );
                    })
                  )}

                  {selectedFace && (
                    <Typography variant="caption" color="text.secondary">
                      Выбрано лицо {local.faces.indexOf(selectedFace) + 1}.
                      Размер — точка справа внизу (ЛКМ), перемещение — ЛКМ +
                      drag, новая рамка — ПКМ + drag, Backspace — удалить.
                    </Typography>
                  )}
                </Stack>

                <Divider sx={{ opacity: 0.5 }} />

                {/* Секция: Люди и папки */}
                <Stack spacing={2.5}>
                  {mode === "global" && (
                    <Autocomplete
                      options={allPeople}
                      getOptionLabel={(p) =>
                        `${p.id} :: ${[p.firstName, p.lastName || p.maidenName]
                            .filter(Boolean)
                            .join(" ") || "Без имени"
                          } `.trim()
                      }
                      value={
                        allPeople.find((p) => p.id === local.owner) || null
                      }
                      onChange={(_, v) =>
                        setLocal((s) => ({ ...s, owner: v ? v.id : null }))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          label="Владелец (папка)"
                        />
                      )}
                    />
                  )}

                  <Autocomplete
                    multiple
                    options={allPeople}
                    getOptionLabel={(p) =>
                      `${p.id} :: ${[p.firstName, p.lastName || p.maidenName]
                          .filter(Boolean)
                          .join(" ") || "Без имени"
                        } `.trim()
                    }
                    value={allPeople.filter((p) => local.people.includes(p.id))}
                    onChange={(_, v) =>
                      setLocal((s) => ({ ...s, people: v.map((x) => x.id) }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Кто на фото"
                      />
                    )}
                    ChipProps={{ sx: { borderRadius: "8px", fontWeight: 500 } }}
                  // sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                  />

                  <Autocomplete
                    multiple
                    options={allExternal}
                    getOptionLabel={(e) =>
                      `${e.id} :: ${getExternalEntityLabel(e)}`
                    }
                    value={allExternal.filter((e) =>
                      local.externalPeople.includes(e.id),
                    )}
                    onChange={(_, v) =>
                      setLocal((s) => ({
                        ...s,
                        externalPeople: v.map((x) => x.id),
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Из справочника (внешние)"
                      />
                    )}
                    ChipProps={{
                      sx: { borderRadius: "8px", fontWeight: 500 },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  />
                </Stack>

                {/* Секция: Дата и Геометка */}
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Дата снимка"
                    value={local.datePhoto}
                    onClick={() => setDatePickerOpen(true)}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      sx: { borderRadius: "12px" },
                      startAdornment: (
                        <CalendarMonthIcon
                          sx={{ mr: 1, color: "action.active", fontSize: 20 }}
                        />
                      ),
                    }}
                  />
                </Stack>

                <TextField
                  label="Геометка"
                  fullWidth
                  variant="outlined"
                  value={local.locationName || ""}
                  onChange={(e) =>
                    setLocal((s) => ({ ...s, locationName: e.target.value }))
                  }
                  InputProps={{ sx: { borderRadius: "12px" } }}
                />

                {/* Секция: Системное (Имя файла) */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "16px",
                    bgcolor: isDark
                      ? alpha("#000", 0.15)
                      : alpha(theme.palette.action.hover, 0.05),
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: "0.3s",
                    borderStyle: rename ? "solid" : "dashed",
                    borderColor: rename
                      ? theme.palette.primary.main
                      : "divider",
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="Имя файла на диске"
                      value={rename ? newFilename : local.filename}
                      onChange={(e) => setNewFilename(e.target.value)}
                      size="small"
                      fullWidth
                      variant="standard"
                      InputProps={{
                        readOnly: !rename,
                        disableUnderline: !rename,
                        sx: {
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          fontFamily: "monospace",
                        },
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => setRename(!rename)}
                      sx={{
                        bgcolor: rename
                          ? alpha(theme.palette.primary.main, 0.1)
                          : "transparent",
                        color: rename
                          ? theme.palette.primary.main
                          : "action.active",
                      }}
                    >
                      {rename ? <EditOffIcon /> : <EditIcon />}
                    </IconButton>
                  </Stack>
                </Box>
              </Stack>
            </Box>
            {/* Футер модального окна (DialogActions в точности как в FaceReviewQueueDialog) */}
            <DialogActions
              sx={{
                px: 3,
                py: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: isDark ? alpha("#000", 0.2) : alpha("#000", 0.01),
                justifyContent: "space-around",
                // gap: 1.5,
              }}
            >
              <Button
                onClick={onClose}
                size="small"
                variant="outlined"
                sx={{ ...macButtonStyle }}
              >
                Отменить
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                size="small"
                sx={{ ...macButtonStyle }}
              >
                {saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  "Сохранить"
                )}
              </Button>
            </DialogActions>
          </Box>

          {/* ПРАВАЯ КОЛОНКА: Превью фотографии */}
          <Stack flex={1} spacing={1.5} sx={{ p: 2, height: "100%" }}>
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
                    onLoad={handlePreviewLoad}
                    sx={{
                      maxHeight: 540,
                      maxWidth: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                  {local.imageSize?.width > 0 && (
                    <PhotoFaceOverlay
                      faces={local.faces}
                      imageSize={local.imageSize}
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

              {/* Кнопки управления разметкой */}
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
                  onClick={() => {
                    setDrawMode((v) => !v);
                    if (!drawMode) setSelectedFaceId(null);
                  }}
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
                  disabled={detecting || !previewUrl}
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
                    <strong>Найти</strong> — авто-поиск всех лиц на фото
                    (заменяет существующие рамки)
                  </Typography>
                  <Typography component="li" variant="body2">
                    <strong>ЛКМ</strong> по рамке — выбор лица
                  </Typography>
                  <Typography component="li" variant="body2">
                    <strong>Точка справа внизу</strong> (ЛКМ) — изменение
                    размера рамки
                  </Typography>
                  <Typography component="li" variant="body2">
                    <strong>ПКМ + перетаскивание</strong> — рисование новой
                    рамки
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

              {/* Информационный бейдж ID */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  bgcolor: alpha("#000", 0.6),
                  color: alpha("#fff", 0.9),
                  px: 1.5,
                  py: 0.6,
                  borderRadius: "10px",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  backdropFilter: "blur(8px)",
                  border: `1px solid ${alpha("#fff", 0.1)}`,
                }}
              >
                PHOTO ID: {local?.id || "---"}
              </Box>
            </Box>

            {/* Подпись снизу превью */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center", fontWeight: 500 }}
            >
              {local?.title || local?.filename}
              {local?.faces?.length > 0 &&
                ` · Лиц на снимке: ${local.faces.length}`}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={local.datePhoto}
        format="YYYY-MM-DD"
        showTime={true}
        onSave={(d) => {
          setLocal((s) => ({ ...s, datePhoto: d }));
          setDatePickerOpen(false);
        }}
      />
    </Dialog>
  );
}
