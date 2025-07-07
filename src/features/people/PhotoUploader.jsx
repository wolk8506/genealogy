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
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";

export default function PhotoUploader() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [owner, setOwner] = useState(null);
  const [datePhoto, setDatePhoto] = useState("");
  const [allPeople, setAllPeople] = useState([]);

  const [preview, setPreview] = useState(null);
  const [filename, setFilename] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("4/3");

  useEffect(() => {
    window.peopleAPI.getAll().then(setAllPeople);
  }, []);

  const handleFileSelect = async () => {
    const result = await window.photoAPI.selectFile();
    if (result?.path) {
      setPreview(result.path);
      setFilename(result.path.replace("file://", ""));
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio < 0.9) setAspectRatio("3/4");
        else if (ratio > 1.3) setAspectRatio("4/3");
        else setAspectRatio("1/1");
      };
      img.src = result.path;
    }
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
    const result = await window.photoAPI.saveWithFilename(meta, filename);
    if (result) {
      alert("Фото добавлено!");
      setTitle("");
      setDescription("");
      setPeople([]);
      setOwner(null);
      setPreview(null);
      setFilename(null);
      setAspectRatio("4/3");
      setDatePhoto("");
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{ maxWidth: 600, mx: "auto", p: 3, bgcolor: "background.paper" }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddPhotoAlternateIcon color="primary" fontSize="large" />
          <Typography variant="h5">Добавить фотографию</Typography>
        </Stack>

        <Divider />

        {/* File selector */}
        <Button
          variant="outlined"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={handleFileSelect}
        >
          Выбрать файл
        </Button>

        {/* Preview */}
        {preview && (
          <Box
            sx={{
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              p: 1,
            }}
          >
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
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth>
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
          </Box>
        )}

        <Divider />

        {/* Metadata */}
        <Stack spacing={2}>
          <Autocomplete
            options={allPeople}
            getOptionLabel={(o) =>
              `${o.id} :: ${o.firstName || ""} ${
                o.lastName || o.maidenName || ""
              }`.trim()
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
              `${o.id} :: ${o.firstName || ""} ${
                o.lastName || o.maidenName || ""
              }`.trim()
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

        {/* Save button */}
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
