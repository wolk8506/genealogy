import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import { useNotificationStore } from "../../store/useNotificationStore";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import heic2any from "heic2any";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import HashtagInput from "../../components/HashtagInput";
import PhotoBadgePlusIcon from "../svg/PhotoBadgePlusIcon";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId, // Если передан - значит персональная страница
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
  const [allPeople, setAllPeople] = useState([]);
  const [datePhoto, setDatePhoto] = useState("");

  // Состояние для владельца, если мы НЕ на персональной странице
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Превью и файл
  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  // Drag & drop
  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  // Для HEIC → JPEG
  const [convertedArrayBuffer, setConvertedArrayBuffer] = useState(null);

  // Чекбокс: оставлять модалку открытой
  const [keepOpen, setKeepOpen] = useState(false);

  // Загрузка списка тегов
  const [uniqueTags, setUniqueTags] = useState([]);

  useEffect(() => {
    if (open) {
      window.photoAPI.getGlobalHashtags().then(setUniqueTags);
      window.peopleAPI.getAll().then(setAllPeople);
    }
  }, [open, saving]);

  // Сброс формы при открытии (если keepOpen=false)
  useEffect(() => {
    if (open && !keepOpen) {
      setTitle("");
      setDescription("");
      setPeople([]);
      setSelectedOwner(null);
      setDatePhoto("");
      setPreview(null);
      setFilename(null);
      setFilePath(null);
      setAspectRatio("4/3");
      setConvertedArrayBuffer(null);
      setDragCounter(0);
    }
  }, [open, keepOpen]);

  // === 1) Выбор через кнопку ===
  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (!result?.path) return;

    setConvertedArrayBuffer(null);
    const raw = result.path.replace(/^file:\/\//, "");
    const ext = raw.split(".").pop().toLowerCase();

    let previewUrl = "";

    if (ext === "heic") {
      try {
        const blobOrig = await fetch(`file://${raw}`).then((r) => r.blob());
        const ab = await heic2any({
          blob: blobOrig,
          toType: "image/jpeg",
          toArrayBuffer: true,
        });
        setConvertedArrayBuffer(ab);

        const blob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(blob);

        setFilename(result.filename.replace(/\.heic$/i, ".jpg"));
        setFilePath(null);
      } catch (err) {
        console.error("HEIC→JPEG ошибка:", err);
        alert("❌ Не удалось конвертировать .heic файл.");
        return;
      }
    } else {
      previewUrl = `file://${raw}`;
      setFilename(result.filename);
      setFilePath(raw);
    }

    setPreview(previewUrl);

    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = previewUrl;
  };

  // === 2) Drag & Drop ===
  const onDrop = async (e) => {
    e.preventDefault();
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      alert(`❌ Формат .${ext} не поддерживается.`);
      return;
    }

    setConvertedArrayBuffer(null);
    let previewUrl,
      name,
      pathOnDisk = null;

    if (ext === "heic") {
      try {
        const ab = await heic2any({
          blob: file,
          toType: "image/jpeg",
          toArrayBuffer: true,
        });
        setConvertedArrayBuffer(ab);

        const blob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(blob);
        name = file.name.replace(/\.heic$/i, ".jpg");
      } catch (err) {
        console.error(err);
        alert("❌ Не удалось конвертировать .heic файл.");
        return;
      }
    } else {
      previewUrl = URL.createObjectURL(file);
      name = file.name;
      pathOnDisk = file.path;
    }

    setPreview(previewUrl);
    setFilename(name);
    setFilePath(pathOnDisk);

    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = previewUrl;
  };

  // === 3) Сохранение ===
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

    // Если нет personId, значит мы на общей странице и нужно выбрать владельца
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
        ? (description.match(/#[\p{L}\d_]+/gu) || []).map((t) =>
            t.toLowerCase(),
          )
        : [];

      // Формируем список людей на фото (добавляем personId, если загружаем с персональной страницы)
      const peopleIdsArray = people.map((p) => p.id);
      const finalPeopleIds = personId
        ? [...new Set([...peopleIdsArray, personId])]
        : peopleIdsArray;

      const meta = {
        title: title.trim(),
        description: description.trim(),
        hashtags: extractedHashtags,
        people: finalPeopleIds,
        owner: finalOwnerId,
        date: new Date().toISOString().split("T")[0],
        datePhoto: datePhoto,
        aspectRatio: aspectRatio,
      };

      let newPhoto = null;

      if (convertedArrayBuffer) {
        newPhoto = await window.photoAPI.saveBlobFile(
          meta,
          convertedArrayBuffer,
          filename,
        );
      } else if (filePath) {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filePath);
      } else {
        newPhoto = await window.photoAPI.saveWithFilename(meta, filename);
      }

      if (newPhoto) {
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
          setSelectedOwner(null);
          setPreview(null);
          setFilename(null);
          setFilePath(null);
          setAspectRatio("4/3");
          setConvertedArrayBuffer(null);
          setDragCounter(0);
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
    `${p.id} :: ${[p.firstName, p.lastName || p.maidenName].filter(Boolean).join(" ") || "Без имени"}`.trim();

  // Отключаем кнопку, если файл не выбран ИЛИ (если нет personId и не выбран владелец)
  const isSaveDisabled = saving || !filename || (!personId && !selectedOwner);

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setKeepOpen(false);
      }}
      maxWidth="md"
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
      {/* Шапка диалога */}
      <Box
        sx={{
          p: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: isDark ? alpha("#fff", 0.02) : alpha("#000", 0.01),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              display: "flex",
            }}
          >
            <PhotoBadgePlusIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Добавление фотографии
          </Typography>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ borderRadius: "10px" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          {/* ЛЕВАЯ КОЛОНКА: Загрузка / Превью */}
          <Box
            sx={{
              flex: 1,
              bgcolor: isDark ? alpha("#000", 0.2) : "#f8f9fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              minHeight: 450,
              position: "relative",
              borderRight: {
                md: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
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
                  minHeight: 320,
                  border: "2px dashed",
                  borderColor: isDragging
                    ? "primary.main"
                    : alpha(theme.palette.divider, 0.2),
                  bgcolor: isDragging
                    ? alpha(theme.palette.primary.main, 0.05)
                    : "transparent",
                  borderRadius: "20px",
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
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  zIndex: 1,
                  textAlign: "center",
                }}
              >
                <Box
                  component="img"
                  src={preview}
                  alt="Превью"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 480,
                    objectFit: "contain",
                    borderRadius: "16px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.01)" },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleFileSelect}
                  startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    bgcolor: alpha("#000", 0.6),
                    backdropFilter: "blur(8px)",
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": { bgcolor: alpha("#000", 0.8) },
                  }}
                >
                  Сменить
                </Button>
              </Box>
            )}
          </Box>

          {/* ПРАВАЯ КОЛОНКА: Форма */}
          <Box sx={{ flex: 1.2, p: 4 }}>
            <Stack spacing={3.5}>
              {/* Секция Основное */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 800,
                    color: theme.palette.primary.main,
                    display: "block",
                    mb: 2,
                  }}
                >
                  Основные сведения
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Заголовок"
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    slotProps={{ input: { sx: { borderRadius: "12px" } } }}
                  />

                  <HashtagInput
                    value={description}
                    onChange={setDescription}
                    suggestions={uniqueTags}
                    placeholder="Описание и #теги..."
                  />
                </Stack>
              </Box>

              {/* Секция Детали */}
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 800,
                    color: theme.palette.primary.main,
                    display: "block",
                    mb: 2,
                  }}
                >
                  Детали и люди
                </Typography>
                <Stack spacing={2}>
                  {/* Умный рендер выбора Владельца, если мы НЕ на персональной странице */}
                  {!personId && (
                    <Autocomplete
                      options={allPeople}
                      getOptionLabel={getPersonLabel}
                      value={selectedOwner}
                      onChange={(e, v) => setSelectedOwner(v)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Владелец (обязательно)"
                          variant="outlined"
                          required
                          error={!selectedOwner}
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
                      slotProps={{
                        paper: { sx: { borderRadius: "12px", mt: 1 } },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                      }}
                    />
                  )}

                  <Autocomplete
                    multiple
                    options={allPeople}
                    getOptionLabel={getPersonLabel}
                    value={people}
                    onChange={(e, v) => setPeople(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Кто на фото"
                      />
                    )}
                    slotProps={{
                      paper: { sx: { borderRadius: "12px", mt: 1 } },
                    }}
                    ChipProps={{
                      size: "small",
                      sx: { borderRadius: "8px", fontWeight: 500 },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  />

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems={"center"}
                    justifyContent={"space-around"}
                  >
                    <TextField
                      label="Дата снимка"
                      value={datePhoto || ""}
                      onClick={() => setDatePickerOpen(true)}
                      variant="outlined"
                      fullWidth
                      sx={{ width: "190px" }}
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

                    {/* <FormControl variant="outlined" sx={{ minWidth: 140 }}>
                      <InputLabel>Формат</InputLabel>
                      <Select
                        value={aspectRatio}
                        label="Формат"
                        onChange={(e) => setAspectRatio(e.target.value)}
                        sx={{ borderRadius: "12px" }}
                      >
                        <MenuItem value="4/3">4:3</MenuItem>
                        <MenuItem value="1/1">1:1</MenuItem>
                        <MenuItem value="3/4">3:4</MenuItem>
                      </Select>
                    </FormControl> */}
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        bgcolor: keepOpen
                          ? alpha(theme.palette.primary.main, 0.05)
                          : "transparent",
                        border: `1px solid ${keepOpen ? alpha(theme.palette.primary.main, 0.1) : "transparent"}`,
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

              {/* <Box
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  bgcolor: keepOpen
                    ? alpha(theme.palette.primary.main, 0.05)
                    : "transparent",
                  border: `1px solid ${keepOpen ? alpha(theme.palette.primary.main, 0.1) : "transparent"}`,
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
              </Box> */}
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 4,
          py: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            height: 24,
            borderRadius: "6px",
            py: 1.2,
            px: 2,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "text.primary",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
            },
          }}
        >
          Отменить
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaveDisabled}
          disableElevation
          sx={{
            height: 24,
            borderRadius: "6px",
            px: 2,
            py: 1.2,
            textTransform: "none",
            fontWeight: 700,
            boxShadow: `0 8px 20px -6px ${alpha(theme.palette.primary.main, 0.5)}`,
            "&:hover": {
              boxShadow: `0 12px 25px -6px ${alpha(theme.palette.primary.main, 0.6)}`,
            },
          }}
        >
          {saving ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Сохранить"
          )}
        </Button>
      </DialogActions>

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
