import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import HashtagInput from "../../components/HashtagInput";
import PhotoBadgePlusIcon from "../svg/PhotoBadgePlusIcon";
import ExifReader from "exifreader";
import { usePhotoFaceMarkup } from "../../hooks/usePhotoFaceMarkup";
import {
  PhotoFacePreviewBlock,
  PhotoFaceFormSection,
} from "../PhotoFaceMarkupBlocks";
import {
  enrichFacesWithDescriptors,
  syncReferencesAfterPhotoSave,
} from "../../utils/faceIndex";
import {
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  normalizeFaces,
} from "../../utils/photoFaces";
import { getExternalEntityLabel } from "../../utils/externalEntities";
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

  const [saving, setSaving] = useState(false);

  // Поля формы
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [externalPeople, setExternalPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
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
    }
  }, [open, keepOpen, resetFaces]);

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
          {/* ЛЕВАЯ КОЛОНКА */}
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
              <IconButton onClick={onClose} size="small" sx={{ borderRadius: "10px" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Добавление фотографии
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
                  <PhotoBadgePlusIcon sx={{ fontSize: 20 }} />
                </Box>
              </Stack>
            </Box>

            <Box
              sx={{
                p: 3,
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
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="Заголовок"
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    InputProps={{ sx: { borderRadius: "12px" } }}
                  />

                  <HashtagInput
                    value={description}
                    onChange={setDescription}
                    suggestions={uniqueTags}
                    placeholder="Описание и #теги..."
                  />
                </Stack>

                <Divider sx={{ opacity: 0.5 }} />

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

                <Divider sx={{ opacity: 0.5 }} />

                <Stack spacing={2.5}>
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
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <>
                                <PersonIcon
                                  sx={{ color: "action.active", ml: 1, mr: 0.5 }}
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
                    options={allPeople}
                    getOptionLabel={getPersonLabel}
                    value={people}
                    onChange={(e, v) => setPeople(v)}
                    renderInput={(params) => (
                      <TextField {...params} variant="outlined" label="Кто на фото" />
                    )}
                    ChipProps={{ sx: { borderRadius: "8px", fontWeight: 500 } }}
                  />

                  <Autocomplete
                    multiple
                    options={allExternal}
                    getOptionLabel={(e) => `${e.id} :: ${getExternalEntityLabel(e)}`}
                    value={allExternal.filter((e) => externalPeople.includes(e.id))}
                    onChange={(_, v) => setExternalPeople(v.map((x) => x.id))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Из справочника (внешние)"
                      />
                    )}
                    ChipProps={{ sx: { borderRadius: "8px", fontWeight: 500 } }}
                  />
                </Stack>

                <Stack spacing={2}>
                  <TextField
                    label="Дата снимка"
                    value={datePhoto || ""}
                    onClick={() => setDatePickerOpen(true)}
                    variant="outlined"
                    fullWidth
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

                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: keepOpen
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "transparent",
                      border: `1px solid ${
                        keepOpen
                          ? alpha(theme.palette.primary.main, 0.1)
                          : "transparent"
                      }`,
                      transition: "0.3s",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={keepOpen}
                          onChange={(e) => setKeepOpen(e.target.checked)}
                          size="small"
                          sx={{ borderRadius: "4px" }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Добавить еще одну
                        </Typography>
                      }
                    />
                  </Box>
                </Stack>
              </Stack>
            </Box>

            <DialogActions
              sx={{
                px: 3,
                py: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: isDark ? alpha("#000", 0.2) : alpha("#000", 0.01),
                justifyContent: "space-around",
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
                disabled={isSaveDisabled}
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

          {/* ПРАВАЯ КОЛОНКА */}
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
                    m: 2,
                    border: "2px dashed",
                    borderColor: isDragging
                      ? "primary.main"
                      : alpha(theme.palette.divider, 0.2),
                    bgcolor: isDragging
                      ? alpha(theme.palette.primary.main, 0.05)
                      : "transparent",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      pt: 1.8,
                      pb: 1.4,
                      borderRadius: "50%",
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      mb: 2,
                    }}
                  >
                    <PhotoBadgePlusIcon
                      sx={{ fontSize: 40, color: theme.palette.primary.main }}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Выберите файл
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    или перетащите его сюда
                  </Typography>
                </Box>
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
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleFileSelect}
                    startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      zIndex: 4,
                      backdropFilter: "blur(8px)",
                      height: 24,
                      borderRadius: "8px",
                      px: 3,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "none",
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
              sx={{ textAlign: "center", fontWeight: 500 }}
            >
              {filename || "Файл не выбран"}
              {faces?.length > 0 && ` · Лиц на снимке: ${faces.length}`}
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
    </Dialog>
  );
}