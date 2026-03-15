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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CustomDatePickerDialog from "./CustomDatePickerDialog";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";

export default function PhotoMetaUpdateDialog({
  open, // Открыт ли диалог (openDialogUpdate)
  meta, // Исходный объект фото (editingPhoto)
  onClose, // handleMetaClose
  allPeople = [], // Список людей
  photoPaths, // Кеш путей из родителя
  setPhotos, // Сеттер для обновления списка в галерее
  setPhotoPaths, // Сеттер для сброса кеша картинок
  mode = "global", // "global" (с выбором папки) или "personal" (папка скрыта)
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [local, setLocal] = useState({
    id: null,
    title: "",
    description: "",
    datePhoto: "",
    owner: null,
    people: [],
    filename: "",
    aspectRatio: "4/3",
  });

  const [rename, setRename] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const initialRef = useRef(null);

  // Инициализация при открытии
  useEffect(() => {
    if (meta && open) {
      const data = {
        id: meta.id ?? null,
        title: meta.title ?? "",
        description: meta.description ?? "",
        datePhoto: meta.datePhoto ?? "",
        owner: meta.owner ?? null,
        people: meta.people ? [...meta.people] : [],
        filename: meta.filename ?? "",
        aspectRatio: meta.aspectRatio ?? "4/3",
      };
      setLocal(data);
      setNewFilename(meta.filename ?? "");
      initialRef.current = { ...data };
      setRename(false);
    }
  }, [meta, open]);

  // Логика превью
  useEffect(() => {
    let mounted = true;
    async function loadPreview() {
      if (!meta || !meta.filename || !open) return;

      // Пробуем взять из кеша родителя
      const cached =
        photoPaths?.full?.[meta.id] ||
        photoPaths?.thumbs?.[meta.id] ||
        photoPaths?.[meta.id];
      if (cached) {
        setPreviewUrl(cached);
        return;
      }

      try {
        const p = await window.photoAPI.getPath(
          meta.owner,
          meta.filename,
          "thumbs",
        );
        if (mounted) setPreviewUrl(p);
      } catch (e) {
        console.warn("Preview load failed", e);
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
      const finalFilename = rename
        ? newFilename || oldData.filename
        : oldData.filename;

      const ownerChanged = String(local.owner) !== String(oldData.owner);
      const filenameChanged =
        String(finalFilename) !== String(oldData.filename);

      // 1. Физические операции с файлами
      if (ownerChanged) {
        // Перемещение + возможное переименование
        await window.fileAPI.moveFile(
          oldData.owner,
          local.owner,
          oldData.filename,
          finalFilename,
        );
      } else if (filenameChanged) {
        // Просто переименование
        await window.fileAPI.renameFile?.(
          oldData.owner,
          oldData.filename,
          finalFilename,
        );
      }

      // 2. Сборка объекта (сохраняем всё, что было в meta + новые поля)
      const updatedEntry = {
        ...meta,
        ...local,
        filename: finalFilename,
      };

      // 3. Синхронизация JSON баз
      if (ownerChanged || filenameChanged) {
        await window.photoAPI.removeFromOwnerJson(oldData.owner, {
          filename: oldData.filename,
          id: oldData.id,
        });
      }
      await window.photoAPI.addOrUpdateOwnerJson(local.owner, updatedEntry);

      // 4. Обновление интерфейса родителя
      if (setPhotos) {
        setPhotos((prev) =>
          prev.map((p) => (p.id === oldData.id ? updatedEntry : p)),
        );
      }

      // 5. Инвалидация кеша картинок
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
    } catch (e) {
      console.error("Save failed", e);
      alert("Ошибка: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, ml: 1 }}>
          Редактирование фото
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}
        >
          <Box
            sx={{
              flex: 1,
              bgcolor: isDark ? "#121212" : "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              minHeight: 300,
              position: "relative",
            }}
          >
            <Box
              component="img"
              src={previewUrl}
              sx={{
                maxWidth: "100%",
                maxHeight: 450,
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.02)" },
              }}
            />
            {/* Бейдж с форматом */}
            <Box
              sx={{
                position: "absolute",
                bottom: 20,
                right: 20,
                bgcolor: "rgba(0,0,0,0.6)",
                color: "#fff",
                // color: "red",
                px: 1.5,
                py: 0.5,
                borderRadius: "8px",
                fontSize: "0.75rem",
                backdropFilter: "blur(4px)",
              }}
            >
              ID: {local?.id || "---"}
            </Box>
          </Box>

          <Box sx={{ flex: 1.2, p: 3 }}>
            <Stack spacing={2}>
              <TextField
                label="Заголовок"
                size="small"
                fullWidth
                variant="filled"
                value={local.title}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, title: e.target.value }))
                }
              />

              <TextField
                label="Описание"
                size="small"
                fullWidth
                multiline
                rows={2}
                variant="filled"
                value={local.description}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, description: e.target.value }))
                }
              />

              {mode === "global" && (
                <Autocomplete
                  size="small"
                  options={allPeople}
                  getOptionLabel={(p) =>
                    `${p.id} :: ${p.firstName} ${p.lastName || ""}`.trim()
                  }
                  value={allPeople.find((p) => p.id === local.owner) || null}
                  onChange={(_, v) =>
                    setLocal((s) => ({ ...s, owner: v ? v.id : null }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      variant="filled"
                      label="Владелец (папка)"
                    />
                  )}
                />
              )}

              <Autocomplete
                multiple
                size="small"
                options={allPeople}
                getOptionLabel={(p) =>
                  `${p.id} :: ${p.firstName} ${p.lastName || ""}`.trim()
                }
                value={allPeople.filter((p) => local.people.includes(p.id))}
                onChange={(_, v) =>
                  setLocal((s) => ({ ...s, people: v.map((x) => x.id) }))
                }
                renderInput={(params) => (
                  <TextField {...params} variant="filled" label="Кто на фото" />
                )}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  size="small"
                  label="Дата снимка"
                  value={local.datePhoto}
                  onClick={() => setDatePickerOpen(true)}
                  fullWidth
                  variant="filled"
                  InputProps={{ readOnly: true }}
                />
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

                <FormControl
                  size="small"
                  variant="filled"
                  sx={{ minWidth: 120 }}
                >
                  <InputLabel>Формат</InputLabel>
                  <Select
                    value={local.aspectRatio}
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, aspectRatio: e.target.value }))
                    }
                  >
                    <MenuItem value="4/3">4:3</MenuItem>
                    <MenuItem value="1/1">1:1</MenuItem>
                    <MenuItem value="3/4">3:4</MenuItem>
                    <MenuItem value="16/9">16:9</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  border: "1px dashed",
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Имя файла"
                    value={rename ? newFilename : local.filename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    size="small"
                    fullWidth
                    variant="standard"
                    InputProps={{
                      readOnly: !rename,
                      disableUnderline: !rename,
                    }}
                  />
                  <IconButton
                    size="small"
                    variant={rename ? "contained" : "text"}
                    onClick={() => setRename(!rename)}
                  >
                    {rename ? <EditOffIcon /> : <EditIcon />}
                  </IconButton>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: "10px", px: 4, minWidth: 160 }}
        >
          {saving ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Сохранить"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
