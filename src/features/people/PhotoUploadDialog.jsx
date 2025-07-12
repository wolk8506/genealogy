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
} from "@mui/material";
import heic2any from "heic2any";

export default function PhotoUploadDialog({
  open,
  onClose,
  personId,
  currentUserId,
  onPhotoAdded,
}) {
  // ———————————————————————————
  // Поля формы
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
        filename
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
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Добавить фотографию</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDragCounter((c) => c + 1)}
            onDragLeave={() => setDragCounter((c) => Math.max(c - 1, 0))}
            onDrop={onDrop}
            sx={{
              border: "2px dashed",
              borderColor: isDragging ? "primary.main" : "divider",
              bgcolor: isDragging ? "action.selected" : "action.hover",
              transition: "0.3s",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Перетащите изображение сюда или
            </Typography>
            <Button variant="outlined" onClick={handleFileSelect}>
              Выбрать файл
            </Button>
          </Box>

          {preview && (
            <Box sx={{ border: "1px dashed", borderRadius: 2, p: 1 }}>
              <img
                src={preview}
                alt="Предпросмотр"
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Отображение</InputLabel>
                <Select
                  value={aspectRatio}
                  label="Отображение"
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  <MenuItem value="4/3">Горизонтальное (4:3)</MenuItem>
                  <MenuItem value="1/1">Квадратное (1:1)</MenuItem>
                  <MenuItem value="3/4">Вертикальное (3:4)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
          <Divider />
          <TextField
            label="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          <Autocomplete
            multiple
            options={allPeople}
            getOptionLabel={(o) =>
              `${o.id} :: ${o.firstName || ""} ${o.lastName || ""}`.trim()
            }
            value={people}
            onChange={(e, v) => setPeople(v)}
            renderInput={(params) => (
              <TextField {...params} label="Кто на фото" fullWidth />
            )}
          />
          <TextField
            label="Дата снимка (ГГГГ-ММ-ДД)"
            value={datePhoto}
            onChange={(e) => setDatePhoto(e.target.value)}
            fullWidth
          />
          {/* Checkbox: оставаться в модалке после сохранения */}
          <FormControlLabel
            control={
              <Checkbox
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
              />
            }
            label="Добавить ещё"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            setKeepOpen(false);
          }}
        >
          Отмена
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
