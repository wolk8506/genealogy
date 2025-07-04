import React, { useEffect, useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Stack,
  Autocomplete,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";

export default function PhotoUploader() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState([]);
  const [owner, setOwner] = useState(null);
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
      aspectRatio,
    };

    const result = await window.photoAPI.save(meta, filename);
    if (result) {
      alert("Фото добавлено!");
      setTitle("");
      setDescription("");
      setPeople([]);
      setOwner(null);
      setPreview(null);
      setFilename(null);
      setAspectRatio("4/3");
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Добавить фотографию</Typography>

      <Autocomplete
        options={allPeople}
        getOptionLabel={(option) =>
          `${option.firstName || ""} ${option.lastName || ""}`.trim()
        }
        value={owner}
        onChange={(e, newValue) => setOwner(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Кому добавляем фото (владелец)"
            required
            error={!owner}
            helperText={!owner ? "Выберите владельца фото" : ""}
          />
        )}
      />

      <TextField
        label="Заголовок"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Описание"
        multiline
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Autocomplete
        multiple
        options={allPeople}
        getOptionLabel={(option) =>
          `${option.firstName || ""} ${option.lastName || ""}`.trim()
        }
        value={people}
        onChange={(e, newValue) => setPeople(newValue)}
        renderInput={(params) => <TextField {...params} label="Кто на фото" />}
      />

      <Button variant="outlined" onClick={handleFileSelect}>
        Выбрать файл
      </Button>

      {preview && (
        <>
          <img
            src={preview}
            alt="Предпросмотр"
            style={{
              maxWidth: "100%",
              maxHeight: 300,
              objectFit: "contain",
              borderRadius: 8,
            }}
          />
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
        </>
      )}

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={!owner || !filename}
      >
        Сохранить
      </Button>
    </Stack>
  );
}
