import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Typography,
  Box,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MapIcon from "@mui/icons-material/Map";
import LocationPickerDialog from "./LocationPickerDialog";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import CustomSwitch from "../../components/CustomSwitch";
import HashtagInput from "../../components/HashtagInput";
import PhotoBadgePlusIcon from "../svg/PhotoBadgePlusIcon";
import ExifReader from "exifreader";
import { usePhotoFaceMarkup } from "../../hooks/usePhotoFaceMarkup";
import {
  PhotoFacePreviewBlock,
  PhotoFaceFormSection,
} from "../PhotoFaceMarkupBlocks";
import {
  PhotoThumbCropPanel,
  PhotoThumbCropToolbar,
} from "../PhotoThumbCropTools";
import { cropToThumbWebp } from "../../utils/thumbCrop";
import {
  enrichFacesWithDescriptors,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import {
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  normalizeFaces,
} from "../../utils/photoFaces";
import { buildFaceTagOptions } from "../../utils/externalEntities";
import DraggableDialog from "./DraggableDialog";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId,
  currentUserId,
  onPhotoAdded,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const fieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: "10px" },
  };
  const sectionLabelSx = {
    display: "block",
    mb: 1,
    ml: 0.5,
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "text.secondary",
  };
  const groupSx = {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "12px",
    overflow: "hidden",
    bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.015),
  };

  const glassButtonSx = {
    height: 32,
    minHeight: 32,
    px: 1.75,
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.8125rem",
    color: "text.primary",
    bgcolor: `${theme.palette.glass.surface} !important`,
    border: `1px solid ${theme.palette.glass.border}`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    "& .MuiButton-startIcon": { mr: 0.5 },
    "&:hover": {
      bgcolor: `${theme.palette.glass.surface} !important`,
      backgroundImage: `linear-gradient(${theme.palette.glass.hover}, ${theme.palette.glass.hover}) !important`,
    },
  };

  const [saving, setSaving] = useState(false);

  // Поля формы
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [externalPeople, setExternalPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const photoTagOptions = buildFaceTagOptions(allPeople, allExternal);
  const [datePhoto, setDatePhoto] = useState("");

  const [selectedOwner, setSelectedOwner] = useState(null);

  // Превью и файл
  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  const [convertedArrayBuffer, setConvertedArrayBuffer] = useState(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [uniqueTags, setUniqueTags] = useState([]);
  const facesRef = useRef([]);

  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [thumbsEditing, setThumbsEditing] = useState(false);
  const [thumbsCrop, setThumbsCrop] = useState({ x: 0, y: 0 });
  const [thumbsZoom, setThumbsZoom] = useState(1);
  const [thumbsPixels, setThumbsPixels] = useState(null);
  const [thumbsBusy, setThumbsBusy] = useState(false);
  const customThumbBlobRef = useRef(null);
  const [customThumbReady, setCustomThumbReady] = useState(false);

  const faceMarkup = usePhotoFaceMarkup(addNotification);
  const {
    resetFaces,
    previewFrameRef,
    faces,
    setFaces, // Достаем прямой сеттер из хука
    imageSize,
    selectedFaceId,
    setSelectedFaceId,
    drawMode,
    setDrawMode,
    detecting,
    handlePreviewLoad,
    handleFacesChange,
    handleAddFace,
    handleDeleteSelectedFace,
    handleDetectFaces,
  } = faceMarkup;

  useEffect(() => {
    facesRef.current = normalizeFaces(faces || []);
  }, [faces]);

  // Главная функция обновления лиц
  const onFacesChange = (nextFaces) => {
    const normalized = normalizeFaces(nextFaces);
    facesRef.current = normalized;
    
    // Обновляем состояние внутри хука
    if (typeof setFaces === "function") {
      setFaces(normalized);
    } else {
      handleFacesChange(normalized, people.map((p) => p.id));
    }

    // Подтягиваем привязанных людей в селекторы
    const facePeopleIds = normalized.map((f) => f.personId).filter(Boolean);
    if (facePeopleIds.length) {
      setPeople((prev) => {
        const currentIds = prev.map((p) => p.id);
        const combined = [...new Set([...currentIds, ...facePeopleIds])];
        return allPeople.filter((p) => combined.includes(p.id));
      });
    }

    const externalIds = syncExternalPeopleFromFaces(normalized, externalPeople);
    setExternalPeople(externalIds);
  };

  // Автосинхронизация при любых изменениях в faces из хука
  useEffect(() => {
    if (faces && faces.length > 0 && allPeople.length > 0) {
      const facePeopleIds = faces.map((f) => f.personId).filter(Boolean);
      if (facePeopleIds.length > 0) {
        setPeople((prev) => {
          const currentIds = prev.map((p) => p.id);
          const combined = [...new Set([...currentIds, ...facePeopleIds])];
          return allPeople.filter((p) => combined.includes(p.id));
        });
      }
    }
  }, [faces, allPeople]);

  useEffect(() => {
    if (open) {
      window.photoAPI.getGlobalHashtags().then(setUniqueTags);
      window.peopleAPI.getAll().then(setAllPeople);
      window.externalAPI?.getAll?.().then(setAllExternal);
    }
  }, [open, saving]);

  const clearCustomThumb = () => {
    customThumbBlobRef.current = null;
    setCustomThumbReady(false);
  };

  const exitThumbsEditing = () => {
    setThumbsCrop({ x: 0, y: 0 });
    setThumbsZoom(1);
    setThumbsPixels(null);
    setThumbsBusy(false);
    setThumbsEditing(false);
  };

  const resetThumbEditor = () => {
    exitThumbsEditing();
    clearCustomThumb();
  };

  useEffect(() => {
    if (open && !keepOpen) {
      setTitle("");
      setDescription("");
      setPeople([]);
      setExternalPeople([]);
      setSelectedOwner(null);
      setDatePhoto("");
      setPreview(null);
      setFilename(null);
      setFilePath(null);
      setAspectRatio("4/3");
      setConvertedArrayBuffer(null);
      setDragCounter(0);
      setLat(null);
      setLng(null);
      resetFaces();
      facesRef.current = [];
      resetThumbEditor();
    }
  }, [open, keepOpen, resetFaces]);

  useEffect(() => {
    if (!open) resetThumbEditor();
  }, [open]);

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
        onFacesChange(next);
        setSelectedFaceId(null);
      }
      return undefined;
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedFaceId, faces, onFacesChange, setSelectedFaceId]);

  const extractExifData = async (input) => {
    try {
      let buffer = input instanceof Blob || input instanceof File ? await input.arrayBuffer() : input;
      const tags = ExifReader.load(buffer);
      if (tags["DateTimeOriginal"]) {
        const dateStr = tags["DateTimeOriginal"].description;
        const datePart = dateStr.split(" ")[0].replace(/:/g, "-");
        setDatePhoto(datePart);
      }
      if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
        setLat(tags["GPSLatitude"].description);
        setLng(tags["GPSLongitude"].description);
      }
    } catch (error) {
      console.warn("Метаданные не найдены:", error.message);
    }
  };

  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (!result?.path) return;

    setConvertedArrayBuffer(null);
    resetFaces();
    facesRef.current = [];
    resetThumbEditor();
    const raw = result.path.replace(/^file:\/\//, "");

    const response = await fetch(`file://${raw}`);
    const blob = await response.blob();
    await extractExifData(blob);

    const ext = raw.split(".").pop().toLowerCase();
    let previewUrl = "";

    if (ext === "heic") {
      try {
        const ab = await window.photoAPI.convertHeic(raw);
        setConvertedArrayBuffer(ab);
        const previewBlob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(previewBlob);
        setFilename(result.filename.replace(/\.heic$/i, ".jpg"));
        setFilePath(null);
      } catch (err) {
        console.error("Ошибка HEIC:", err);
        return;
      }
    } else {
      previewUrl = `file://${raw}`;
      setFilename(result.filename);
      setFilePath(raw);
    }

    setPreview(previewUrl);
    updateAspectRatio(previewUrl);
  };

  const updateAspectRatio = (url) => {
    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = url;
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await extractExifData(file);

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      alert(`❌ Формат .${ext} не поддерживается.`);
      return;
    }

    setConvertedArrayBuffer(null);
    resetFaces();
    facesRef.current = [];
    resetThumbEditor();
    let previewUrl, name, pathOnDisk = null;

    if (ext === "heic") {
      try {
        const fileBuffer = await file.arrayBuffer();
        const ab = await window.photoAPI.convertHeic(fileBuffer);

        setConvertedArrayBuffer(ab);
        const previewBlob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(previewBlob);
        name = file.name.replace(/\.heic$/i, ".jpg");
      } catch (err) {
        console.error(err);
        alert("❌ Ошибка конвертации HEIC.");
        return;
      }
    } else {
      previewUrl = URL.createObjectURL(file);
      name = file.name;
      const ab = await file.arrayBuffer();
      setConvertedArrayBuffer(ab);
    }

    setPreview(previewUrl);
    setFilename(name);
    setFilePath(pathOnDisk);
    updateAspectRatio(previewUrl);
  };

  const enterThumbsEditing = () => {
    if (!preview) return;
    setDrawMode(false);
    setSelectedFaceId(null);
    setThumbsEditing(true);
    setThumbsCrop({ x: 0, y: 0 });
    setThumbsZoom(1);
    setThumbsPixels(null);
  };

  const applyThumbDraft = async () => {
    if (!preview || !thumbsPixels || thumbsBusy) return;
    setThumbsBusy(true);
    try {
      const blob = await cropToThumbWebp(preview, thumbsPixels);
      customThumbBlobRef.current = blob;
      setCustomThumbReady(true);
      exitThumbsEditing();
      addNotification({
        title: "Превью",
        message: "Фрагмент будет сохранён вместе с фото",
        type: "success",
        category: "photo",
      });
    } catch (e) {
      addNotification({
        title: "Превью",
        message: e.message || "Не удалось подготовить превью",
        type: "error",
        category: "photo",
      });
    } finally {
      setThumbsBusy(false);
    }
  };

  const handleSave = async () => {
    if (!filename) {
      addNotification({
        title: "Ошибка",
        message: "Сначала выберите файл.",
        type: "warning",
        category: "photo",
      });
      return;
    }

    const finalOwnerId = personId ? currentUserId : selectedOwner?.id;
    if (!finalOwnerId) {
      addNotification({
        title: "Ошибка",
        message: "Выберите владельца фото.",
        type: "warning",
        category: "photo",
      });
      return;
    }

    setSaving(true);

    try {
      const extractedHashtags = description
        ? (description.match(/#[\p{L}\d_]+/gu) || []).map((t) => t.toLowerCase())
        : [];

      // БЕРЕМ ИСКЛЮЧИТЕЛЬНО АКТУАЛЬНОЕ СОСТОЯНИЕ ИЗ ХУКА
      let facesToSave = normalizeFaces(facesRef.current.length ? facesRef.current : faces || []);

      const peopleIdsArray = people.map((p) => p.id);
      const basePeopleIds = personId
        ? [...new Set([...peopleIdsArray, personId])]
        : peopleIdsArray;

      const finalPeopleIds = syncPeopleFromFaces(facesToSave, basePeopleIds);
      const finalExternalIds = syncExternalPeopleFromFaces(facesToSave, externalPeople);

      if (preview) {
        facesToSave = await enrichFacesWithDescriptors(
          preview,
          facesToSave,
          imageSize
        );
      }

      const meta = {
        title: title.trim(),
        description: description.trim(),
        hashtags: extractedHashtags,
        people: finalPeopleIds,
        externalPeople: finalExternalIds,
        owner: finalOwnerId,
        date: new Date().toISOString().split("T")[0],
        datePhoto: datePhoto,
        aspectRatio: aspectRatio,
        lat: lat,
        lng: lng,
        faces: facesToSave,
        imageSize,
      };

      let newPhoto = null;

      if (convertedArrayBuffer) {
        const blobForSaving = new Blob([convertedArrayBuffer], { type: "image/jpeg" });
        newPhoto = await window.photoAPI.saveBlobFile(meta, blobForSaving, filename);
      } else if (filePath) {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filePath);
      } else {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filename);
      }

      if (newPhoto) {
        if (customThumbBlobRef.current && newPhoto.filename) {
          try {
            const thumbBuffer = await customThumbBlobRef.current.arrayBuffer();
            await window.photoAPI.saveThumbs(
              finalOwnerId,
              newPhoto.filename,
              thumbBuffer,
            );
          } catch (thumbErr) {
            console.warn("Custom thumb save failed:", thumbErr);
            addNotification({
              title: "Превью",
              message:
                "Фото сохранено, но не удалось записать превью: " +
                (thumbErr.message || thumbErr),
              type: "warning",
              category: "photo",
            });
          }
        }

        await syncReferencesAfterPhotoSave(
          { owner: finalOwnerId, id: newPhoto.id },
          facesToSave
        );

        addNotification({
          title: "Фото добавлено",
          message: `Файл "${filename}" успешно сохранен.`,
          type: "success",
          category: "photo",
        });

        if (onPhotoAdded) onPhotoAdded(newPhoto);

        if (keepOpen) {
          setTitle("");
          setDescription("");
          setPeople([]);
          setExternalPeople([]);
          setSelectedOwner(null);
          setPreview(null);
          setFilename(null);
          setFilePath(null);
          setAspectRatio("4/3");
          setConvertedArrayBuffer(null);
          setDragCounter(0);
          setLat(null);
          setLng(null);
          resetFaces();
          resetThumbEditor();
        } else {
          onClose();
        }
      } else {
        throw new Error("Ошибка при обработке фото на стороне сервера.");
      }
    } catch (err) {
      console.error("Save failed:", err);
      addNotification({
        title: "Ошибка сохранения",
        message: err.message || "Не удалось сохранить фото",
        type: "error",
        category: "photo",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPersonLabel = (p) =>
    `${p.id} :: ${
      [p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") ||
      "Без имени"
    }`.trim();

  const isSaveDisabled = saving || !filename || (!personId && !selectedOwner);

  useDialogSaveHotkey({
    open,
    onSave: handleSave,
    disabled: isSaveDisabled,
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setKeepOpen(false);
      }}
      maxWidth="lg"
      fullWidth
      PaperComponent={DraggableDialog}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          bgcolor: "background.paper",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Stack direction="row" sx={{ height: "min(720px, 84vh)" }}>
          {/* ЛЕВАЯ КОЛОНКА */}
          <Box
            sx={{
              width: 400,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box
              id="draggable-header"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${theme.palette.divider}`,
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
              <Typography
                variant="subtitle1"
                noWrap
                sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0 }}
              >
                Добавить фото
              </Typography>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <PhotoBadgePlusIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

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
              <Stack spacing={2.5}>
                <Box>
                  <Typography sx={sectionLabelSx}>Основное</Typography>
                  <Box sx={groupSx}>
                    <Box sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label="Заголовок"
                          variant="outlined"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          sx={fieldSx}
                        />

                        <HashtagInput
                          value={description}
                          onChange={setDescription}
                          suggestions={uniqueTags}
                          placeholder="Описание и #теги..."
                        />
                      </Stack>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sectionLabelSx}>Разметка</Typography>
                  <Box sx={groupSx}>
                    <Box sx={{ p: 2 }}>
                      <PhotoFaceFormSection
                        theme={theme}
                        faces={faces}
                        allPeople={allPeople}
                        allExternal={allExternal}
                        selectedFaceId={selectedFaceId}
                        onSelectFace={setSelectedFaceId}
                        onFacesChange={onFacesChange}
                        onAddFace={() => onFacesChange(handleAddFace())}
                        onDeleteSelectedFace={() => {
                          const next = handleDeleteSelectedFace();
                          if (next) onFacesChange(next);
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sectionLabelSx}>Люди и место</Typography>
                  <Box sx={groupSx}>
                    <Box sx={{ p: 2 }}>
                      <Stack spacing={2}>
                        {!personId && (
                          <Autocomplete
                            options={allPeople}
                            getOptionLabel={getPersonLabel}
                            value={selectedOwner}
                            onChange={(e, v) => setSelectedOwner(v)}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Владелец (папка)"
                                variant="outlined"
                                required
                                error={!selectedOwner}
                                sx={fieldSx}
                                InputProps={{
                                  ...params.InputProps,
                                  startAdornment: (
                                    <>
                                      <PersonIcon
                                        sx={{
                                          color: "action.active",
                                          ml: 1,
                                          mr: 0.5,
                                        }}
                                      />
                                      {params.InputProps.startAdornment}
                                    </>
                                  ),
                                }}
                              />
                            )}
                          />
                        )}

                        <Autocomplete
                          multiple
                          options={photoTagOptions}
                          groupBy={(o) =>
                            o.kind === "person"
                              ? "Родственники"
                              : "Справочник"
                          }
                          getOptionLabel={(o) => o.label}
                          isOptionEqualToValue={(a, b) =>
                            a?.kind === b?.kind && a?.id === b?.id
                          }
                          value={photoTagOptions.filter((o) =>
                            o.kind === "person"
                              ? people.some((p) => p.id === o.id)
                              : externalPeople.includes(o.id),
                          )}
                          onChange={(_, v) => {
                            setPeople(
                              v
                                .filter((x) => x.kind === "person")
                                .map((x) => x.data),
                            );
                            setExternalPeople(
                              v
                                .filter((x) => x.kind === "external")
                                .map((x) => x.id),
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Кто на фото"
                              sx={fieldSx}
                            />
                          )}
                          ChipProps={{
                            sx: { borderRadius: "8px", fontWeight: 500 },
                          }}
                        />

                        <TextField
                          label="Дата снимка"
                          value={datePhoto || ""}
                          onClick={() => setDatePickerOpen(true)}
                          variant="outlined"
                          fullWidth
                          sx={fieldSx}
                          InputProps={{
                            readOnly: true,
                            startAdornment: (
                              <CalendarMonthIcon
                                sx={{
                                  mr: 1,
                                  color: "action.active",
                                  fontSize: 20,
                                }}
                              />
                            ),
                          }}
                        />

                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<MapIcon sx={{ fontSize: 18 }} />}
                            onClick={() => setLocationPickerOpen(true)}
                            sx={{
                              height: 32,
                              borderRadius: "10px",
                              textTransform: "none",
                              fontWeight: 600,
                            }}
                          >
                            {lat != null && lng != null
                              ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} — на карте`
                              : "Место на карте"}
                          </Button>
                          {lat != null && lng != null && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                setLat(null);
                                setLng(null);
                              }}
                              sx={{
                                textTransform: "none",
                                fontWeight: 600,
                              }}
                            >
                              Убрать
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography sx={sectionLabelSx}>При сохранении</Typography>
                  <Box sx={groupSx}>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Добавить ещё одну
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Окно останется открытым после сохранения
                        </Typography>
                      </Box>
                      <CustomSwitch
                        checked={keepOpen}
                        onChange={(e) => setKeepOpen(e.target.checked)}
                      />
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <DialogActionsBar
              sx={{
                px: 2.5,
                py: 1.5,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <DialogActionButton onClick={onClose}>
                Отменить
              </DialogActionButton>
              <DialogActionButton
                tone="primary"
                onClick={handleSave}
                disabled={isSaveDisabled}
              >
                {saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  "Сохранить"
                )}
              </DialogActionButton>
            </DialogActionsBar>
          </Box>

          {/* ПРАВАЯ КОЛОНКА */}
          <Stack
            flex={1}
            minWidth={0}
            spacing={1.25}
            sx={{ p: 1.5, height: "100%" }}
          >
            <Box
              sx={{
                position: "relative",
                flexGrow: 1,
                width: "100%",
                bgcolor: isDark ? alpha("#000", 0.35) : alpha("#000", 0.03),
                borderRadius: "14px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {!preview ? (
                <Box
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragCounter((c) => c + 1)}
                  onDragLeave={() => setDragCounter((c) => Math.max(c - 1, 0))}
                  onDrop={onDrop}
                  onClick={handleFileSelect}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.5,
                    bgcolor: isDragging
                      ? alpha(theme.palette.primary.main, 0.08)
                      : "transparent",
                    transition: "background-color 0.2s ease",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "18px",
                      bgcolor: alpha(theme.palette.primary.main, 0.09),
                      color: theme.palette.primary.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                    }}
                  >
                    <PhotoBadgePlusIcon sx={{ fontSize: 30 }} />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Перетащите фото
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    или нажмите, чтобы выбрать файл
                  </Typography>
                </Box>
              ) : thumbsEditing ? (
                <>
                  <PhotoThumbCropPanel
                    imageSrc={preview}
                    crop={thumbsCrop}
                    zoom={thumbsZoom}
                    onCropChange={setThumbsCrop}
                    onZoomChange={setThumbsZoom}
                    onCropComplete={(_, pixels) => setThumbsPixels(pixels)}
                  />
                  <PhotoThumbCropToolbar
                    zoom={thumbsZoom}
                    onZoomDecrease={() =>
                      setThumbsZoom((z) => Math.max(z - 0.2, 1))
                    }
                    onZoomIncrease={() =>
                      setThumbsZoom((z) => Math.min(z + 0.2, 5))
                    }
                    onSave={applyThumbDraft}
                    onCancel={exitThumbsEditing}
                    canSave={Boolean(thumbsPixels)}
                    busy={thumbsBusy}
                    saveLabel="Применить"
                  />
                </>
              ) : (
                <>
                  <PhotoFacePreviewBlock
                    preview={preview}
                    previewFrameRef={previewFrameRef}
                    faces={faces}
                    imageSize={imageSize}
                    allPeople={allPeople}
                    allExternal={allExternal}
                    selectedFaceId={selectedFaceId}
                    onSelectFace={setSelectedFaceId}
                    onFacesChange={onFacesChange}
                    drawMode={drawMode}
                    setDrawMode={setDrawMode}
                    detecting={detecting}
                    onDetect={async () => {
                      const detected = await handleDetectFaces(preview);
                      if (detected) onFacesChange(detected);
                    }}
                    onPreviewLoad={handlePreviewLoad}
                    onEditThumb={enterThumbsEditing}
                    customThumbReady={customThumbReady}
                  />
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleFileSelect}
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      ...glassButtonSx,
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 4,
                    }}
                  >
                    Сменить
                  </Button>
                </>
              )}
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ textAlign: "center", fontWeight: 500, px: 1, pb: 0.5 }}
            >
              {filename || "Файл не выбран"}
              {faces?.length > 0 && ` · Лиц на снимке: ${faces.length}`}
              {customThumbReady && " · Превью настроено"}
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={datePhoto}
        format="YYYY-MM-DD"
        showTime={true}
        onSave={(newDate) => {
          setDatePhoto(newDate);
          setDatePickerOpen(false);
        }}
      />
      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          lat != null && lng != null ? { lat, lng } : null
        }
        onSelect={({ lat: la, lng: ln }) => {
          setLat(la);
          setLng(ln);
        }}
      />
    </Dialog>
  );
}