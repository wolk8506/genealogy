import React, { useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Box,
  Button,
  TextField,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import { AddPhotoAlternate as AddPhotoAlternateIcon } from "@mui/icons-material";
import heic2any from "heic2any";

export default function PhotoUploader() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [owner, setOwner] = useState(null);
  const [datePhoto, setDatePhoto] = useState("");
  const [allPeople, setAllPeople] = useState([]);

  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [filePath, setFilePath] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  const [convertedArrayBuffer, setConvertedArrayBuffer] = useState(null);

  useEffect(() => {
    window.peopleAPI.getAll().then(setAllPeople);
  }, []);

  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (!result?.path) return;

    setConvertedArrayBuffer(null);

    // raw path без file://
    const raw = result.path.replace(/^file:\/\//, "");
    const ext = raw.split(".").pop().toLowerCase();

    let previewUrl;
    let uiName = result.filename;
    let pathOnDisk = null;

    if (ext === "heic") {
      try {
        // читаем исходный файл
        const blobOrig = await fetch(`file://${raw}`).then((r) => r.blob());
        // конвертим
        const ab = await heic2any({
          blob: blobOrig,
          toType: "image/jpeg",
          toArrayBuffer: true,
        });
        setConvertedArrayBuffer(ab);

        const blob = new Blob([ab], { type: "image/jpeg" });
        previewUrl = URL.createObjectURL(blob);
        uiName = result.filename.replace(/\.heic$/i, ".jpg");
      } catch {
        alert("❌ Ошибка конвертации HEIC");
        return;
      }
    } else {
      pathOnDisk = raw;
      previewUrl = `file://${raw}`;
    }

    setPreview(previewUrl);
    setFilename(uiName);
    setFilePath(pathOnDisk);

    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = previewUrl;
  };

  const handleSave = async () => {
    if (!owner || !filename) {
      alert("Выберите владельца и файл.");
      return;
    }

    const meta = {
      title,
      description,
      people: people.map((p) => p.id),
      owner: owner.id,
      date: new Date().toISOString().split("T")[0],
      datePhoto,
      aspectRatio,
    };

    let result;
    if (convertedArrayBuffer) {
      result = await window.photoAPI.saveBlobFile(
        meta,
        convertedArrayBuffer,
        filename
      );
    } else {
      const source = filePath || filename;
      result = await window.photoAPI.saveWithFilename(meta, source);
    }

    if (result) {
      alert("Фото добавлено!");
      setTitle("");
      setDescription("");
      setPeople([]);
      setOwner(null);
      setPreview(null);
      setFilename(null);
      setFilePath(null);
      setAspectRatio("4/3");
      setDatePhoto("");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      alert(`❌ Неподдерживаемый формат: .${ext}`);
      return;
    }

    setConvertedArrayBuffer(null);

    let previewUrl;
    let uiName = file.name;
    let pathOnDisk = null;

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
        uiName = file.name.replace(/\.heic$/i, ".jpg");
      } catch {
        alert("❌ Ошибка конвертации HEIC");
        return;
      }
    } else {
      pathOnDisk = file.path;
      previewUrl = URL.createObjectURL(file);
    }

    setPreview(previewUrl);
    setFilename(uiName);
    setFilePath(pathOnDisk);

    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setAspectRatio(r < 0.9 ? "3/4" : r > 1.3 ? "4/3" : "1/1");
    };
    img.src = previewUrl;
  };

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddPhotoAlternateIcon color="primary" fontSize="large" />
          <Typography variant="h5">Добавить фотографию</Typography>
        </Stack>
        <Divider />

        <Box
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setDragCounter((c) => c + 1)}
          onDragLeave={() => setDragCounter((c) => Math.max(c - 1, 0))}
          onDrop={handleDrop}
          sx={{
            border: "2px dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            bgcolor: isDragging ? "action.selected" : "action.hover",
            transition: "0.3s",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <Typography color="text.secondary" mb={1}>
            Перетащите изображение сюда или
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddPhotoAlternateIcon />}
            onClick={handleFileSelect}
          >
            Выбрать файл
          </Button>
        </Box>

        {preview && (
          <Box sx={{ border: "1px dashed", borderRadius: 2, p: 1 }}>
            <img
              src={preview}
              alt="Preview"
              style={{ width: "100%", objectFit: "contain", maxHeight: 300 }}
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

        <Stack spacing={2}>
          <Autocomplete
            options={allPeople}
            getOptionLabel={(o) =>
              `${o.id} :: ${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
            }
            value={owner}
            onChange={(e, v) => setOwner(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Владелец"
                required
                error={!owner}
                helperText={!owner && "Выберите владельца"}
              />
            )}
          />

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
              `${o.id} :: ${o.firstName ?? ""} ${o.lastName ?? ""}`.trim()
            }
            value={people}
            onChange={(e, v) => setPeople(v)}
            renderInput={(params) => (
              <TextField {...params} label="Кто на фото" fullWidth />
            )}
          />

          <TextField
            label="Дата снимка (ГГГГ-MM-DD)"
            value={datePhoto}
            onChange={(e) => setDatePhoto(e.target.value)}
            fullWidth
          />
        </Stack>

        <Divider />

        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={!owner || !filename}
        >
          Сохранить
        </Button>
      </Stack>
    </Paper>
  );
}
