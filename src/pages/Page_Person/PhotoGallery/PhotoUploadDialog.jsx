import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  IconButton,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

import heic2any from "heic2any";
import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId,
  currentUserId,
  onPhotoAdded,
}) {
  // ———————————————————————————
  // Поля формы
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [datePhoto, setDatePhoto] = useState("");

  // ———————————————————————————
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

  // ———————————————————————————
  // Новый чекбокс: оставлять модалку открытой
  const [keepOpen, setKeepOpen] = useState(false);

  // Сброс формы при открытии (если keepOpen=false)
  useEffect(() => {
    if (open && !keepOpen) {
      window.peopleAPI.getAll().then(setAllPeople);
      setTitle("");
      setDescription("");
      setPeople([]);
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

    // чистим предыдущий heic-буфер
    setConvertedArrayBuffer(null);

    // реальный путь без file://
    const raw = result.path.replace(/^file:\/\//, "");
    const ext = raw.split(".").pop().toLowerCase();

    let previewUrl = "";

    if (ext === "heic") {
      try {
        // читаем файл как Blob
        const blobOrig = await fetch(`file://${raw}`).then((r) => r.blob());
        // конвертим в JPEG ArrayBuffer
        const ab = await heic2any({
          blob: blobOrig,
          toType: "image/jpeg",
          toArrayBuffer: true,
        });
        setConvertedArrayBuffer(ab);

        // готовим preview из ArrayBuffer
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
      // обычный JPG/PNG
      previewUrl = `file://${raw}`;
      setFilename(result.filename);
      setFilePath(raw);
    }

    // показываем картинку
    setPreview(previewUrl);

    // считаем соотношение сторон по previewUrl
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
      alert("Сначала выберите файл.");
      return;
    }

    const meta = {
      title,
      description,
      people: [...new Set([...people.map((p) => p.id), personId])],
      owner: currentUserId,
      date: new Date().toISOString().split("T")[0],
      datePhoto,
      aspectRatio,
    };

    // Выбор метода сохранения (blob или путь)
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
      onPhotoAdded(newPhoto);

      if (keepOpen) {
        // если «Добавить ещё» отмечено — очищаем всё, кроме datePhoto
        setTitle("");
        setDescription("");
        setPeople([]);
        setPreview(null);
        setFilename(null);
        setFilePath(null);
        setAspectRatio("4/3");
        setConvertedArrayBuffer(null);
        setDragCounter(0);
        // datePhoto оставляем без изменений
      } else {
        // иначе закрываем модалку
        onClose();
      }
    }
  };

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
          borderRadius: "20px",
          backgroundImage: "none",
          overflow: "hidden",
        },
      }}
    >
      {/* Шапка диалога — как в Edit */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.02)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, ml: 1 }}>
          Добавление новой фотографии
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          {/* Левая колонка: Загрузка / Превью */}
          <Box
            sx={{
              flex: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#121212" : "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              minHeight: 400,
              position: "relative",
            }}
          >
            {!preview ? (
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragCounter((c) => c + 1)}
                onDragLeave={() => setDragCounter((c) => Math.max(c - 1, 0))}
                onDrop={onDrop}
                sx={{
                  width: "100%",
                  height: "100%",
                  minHeight: 300,
                  border: "2px dashed",
                  borderColor: isDragging ? "primary.main" : "divider",
                  bgcolor: isDragging ? "action.selected" : "transparent",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "0.3s",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.02)" },
                }}
                onClick={handleFileSelect}
              >
                <AddPhotoAlternateIcon
                  sx={{ fontSize: 48, mb: 2, color: "text.secondary" }}
                />
                <Typography color="text.secondary">
                  Перетащите фото или нажмите для выбора
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                <Box
                  component="img"
                  src={preview}
                  alt="Превью"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 450,
                    objectFit: "contain",
                    borderRadius: "12px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleFileSelect}
                  // sx={{ borderRadius: "10px" }}
                  sx={{
                    position: "absolute",
                    color: "orange",
                    top: 10,
                    right: 10,
                    bgcolor: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "10px",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  Сменить файл
                </Button>
              </Box>
            )}
          </Box>

          {/* Правая колонка: Форма */}
          <Box sx={{ flex: 1.2, p: 3 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: "bold" }}
                >
                  Основные сведения
                </Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    fullWidth
                    label="Заголовок"
                    variant="filled"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Описание"
                    multiline
                    rows={2}
                    variant="filled"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ fontWeight: "bold" }}
                >
                  Детали и теги
                </Typography>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Autocomplete
                    multiple
                    options={allPeople}
                    getOptionLabel={(o) =>
                      `${o.id} :: ${o.firstName || ""} ${o.lastName || ""}`.trim()
                    }
                    value={people}
                    onChange={(e, v) => setPeople(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="filled"
                        label="Кто на фото"
                      />
                    )}
                    ChipProps={{ size: "small", sx: { borderRadius: "8px" } }}
                  />

                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Дата снимка"
                      value={datePhoto || ""}
                      onClick={() => setDatePickerOpen(true)}
                      variant="filled"
                      fullWidth
                      placeholder="ГГГГ-ММ-ДД"
                      InputProps={{ readOnly: true }}
                    />

                    <FormControl variant="filled" sx={{ minWidth: 140 }}>
                      <InputLabel>Формат</InputLabel>
                      <Select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                      >
                        <MenuItem value="4/3">4:3</MenuItem>
                        <MenuItem value="1/1">1:1</MenuItem>
                        <MenuItem value="3/4">3:4</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Stack>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepOpen}
                    onChange={(e) => setKeepOpen(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    Оставить окно открытым (для загрузки нескольких)
                  </Typography>
                }
              />
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button onClick={onClose} sx={{ borderRadius: "10px" }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          sx={{
            borderRadius: "10px",
            px: 4,
            boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
          }}
        >
          Сохранить фото
        </Button>
      </DialogActions>

      {/* Вынесенный календарь (как в Edit) */}
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
