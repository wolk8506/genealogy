import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTheme, darken } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CustomDatePickerDialog from "./CustomDatePickerDialog";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HashtagInput from "./HashtagInput";

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

  // --- СОСТОЯНИЕ ДЛЯ ХЕШТЕГОВ ---

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
        hashtags: extractedHashtags,
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

  // --- ЛОГИКА #ХЕШТЕГОВ ---

  const [uniqueTags, setUniqueTags] = useState([]);
  useEffect(() => {
    window.photoAPI.getGlobalHashtags().then((tags) => {
      setUniqueTags(tags);
    });
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
            <EditIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Редактирование фотографии
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
          {/* ЛЕВАЯ КОЛОНКА: Превью */}
          <Box
            sx={{
              flex: 1,
              bgcolor: isDark ? alpha("#000", 0.2) : "#f8f9fa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              minHeight: 400,
              position: "relative",
              borderRight: {
                md: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              },
            }}
          >
            <Box
              component="img"
              src={previewUrl}
              alt="Превью"
              sx={{
                maxWidth: "100%",
                maxHeight: 480,
                objectFit: "contain",
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.02)" },
              }}
            />

            {/* Информационный бейдж ID */}
            <Box
              sx={{
                position: "absolute",
                bottom: 20,
                right: 20,
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

          {/* ПРАВАЯ КОЛОНКА: Форма редактирования */}
          <Box sx={{ flex: 1.2, p: 4 }}>
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

              {/* Секция: Люди и папки */}
              <Stack spacing={2.5}>
                {mode === "global" && (
                  <Autocomplete
                    options={allPeople}
                    getOptionLabel={(p) =>
                      `${p.id} :: ${
                        [p.firstName, p.lastName || p.maidenName]
                          .filter(Boolean)
                          .join(" ") || "Без имени"
                      } `.trim()
                    }
                    value={allPeople.find((p) => p.id === local.owner) || null}
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
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                  />
                )}

                <Autocomplete
                  multiple
                  options={allPeople}
                  getOptionLabel={(p) =>
                    `${p.id} :: ${
                      [p.firstName, p.lastName || p.maidenName]
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
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                />
              </Stack>

              {/* Секция: Дата и Формат */}
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

                <FormControl variant="outlined" sx={{ minWidth: 140 }}>
                  <InputLabel>Формат</InputLabel>
                  <Select
                    value={local.aspectRatio}
                    label="Формат"
                    onChange={(e) =>
                      setLocal((s) => ({ ...s, aspectRatio: e.target.value }))
                    }
                    sx={{ borderRadius: "12px" }}
                  >
                    <MenuItem value="4/3">4:3</MenuItem>
                    <MenuItem value="1/1">1:1</MenuItem>
                    <MenuItem value="3/4">3:4</MenuItem>
                    <MenuItem value="16/9">16:9</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

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
                  borderColor: rename ? theme.palette.primary.main : "divider",
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
            borderRadius: "12px",
            px: 3,
            fontWeight: 600,
            textTransform: "none",
          }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          disableElevation
          sx={{
            borderRadius: "12px",
            px: 5,
            py: 1.2,
            fontWeight: 700,
            textTransform: "none",
            boxShadow: `0 8px 20px -6px ${alpha(theme.palette.primary.main, 0.5)}`,
          }}
        >
          {saving ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Сохранить изменения"
          )}
        </Button>
      </DialogActions>

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
