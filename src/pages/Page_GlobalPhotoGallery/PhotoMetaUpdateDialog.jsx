// ./PhotoMetaUpdateDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Typography,
  Avatar,
} from "@mui/material";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";

/**
 * Props:
 * - openDialog: boolean
 * - meta: object { id, title, description, datePhoto, owner, people, filename, ... }
 * - onClose: () => void
 * - onSave: (updatedMeta) => Promise|void
 * - saving: boolean
 * - allPeople: array [{id, firstName, lastName, maidenName, ...}]
 * - getPreviewPath: (ownerId, filename) => Promise<string> optional
 */
export default function PhotoMetaUpdateDialog({
  openDialog,
  meta,
  onClose,
  onSave,
  saving = false,
  allPeople = [],
  getPreviewPath,
}) {
  const [local, setLocal] = useState({
    id: null,
    title: "",
    description: "",
    datePhoto: "",
    owner: null,
    people: [],
    filename: "",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rename, setRename] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (meta) {
      setLocal({
        id: meta.id ?? null,
        title: meta.title ?? "",
        description: meta.description ?? "",
        datePhoto: meta.datePhoto ?? "",
        owner: meta.owner ?? null,
        people: meta.people ? [...meta.people] : [],
        filename: meta.filename ?? "",
      });
      setNewFilename(meta.filename ?? "");
    } else {
      setLocal({
        id: null,
        title: "",
        description: "",
        datePhoto: "",
        owner: null,
        people: [],
        filename: "",
      });
      setNewFilename("");
    }
  }, [meta]);

  useEffect(() => {
    let mounted = true;
    async function loadPreview() {
      setPreviewUrl(null);
      if (!meta || !meta.filename) return;
      try {
        if (typeof getPreviewPath === "function") {
          const p = await getPreviewPath(meta.owner, meta.filename);
          if (mounted) setPreviewUrl(p);
        } else if (window.photoAPI?.getPath) {
          const p = await window.photoAPI.getPath(meta.owner, meta.filename);
          if (mounted) setPreviewUrl(p);
        }
      } catch (e) {
        console.warn("preview load failed", e);
      }
    }
    loadPreview();
    return () => {
      mounted = false;
    };
  }, [meta, getPreviewPath]);

  const handleSave = async () => {
    const updated = {
      id: local.id,
      title: local.title,
      description: local.description,
      datePhoto: local.datePhoto,
      owner: local.owner,
      people: local.people,
      filename: rename ? newFilename : local.filename,
    };
    try {
      const res = onSave && onSave(updated);
      if (res && typeof res.then === "function") await res;
    } catch (e) {
      console.error("PhotoMetaUpdateDialog onSave failed", e);
      throw e;
    }
  };

  return (
    <Dialog
      open={!!openDialog}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <DialogTitle>Редактировать фото</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <Box
              sx={{
                width: 220,
                height: 220,
                // bgcolor: "#f5f5f5",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={local.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Avatar variant="rounded" sx={{ width: 120, height: 120 }}>
                  <Typography variant="caption">Нет превью</Typography>
                </Avatar>
              )}
            </Box>

            <Stack spacing={1} gap={2} sx={{ flex: 1 }}>
              <TextField
                label="Заголовок"
                value={local.title}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, title: e.target.value }))
                }
                fullWidth
                size="small"
              />
              <TextField
                label="Описание"
                value={local.description}
                onChange={(e) =>
                  setLocal((s) => ({ ...s, description: e.target.value }))
                }
                fullWidth
                multiline
                rows={3}
                size="small"
              />
              <TextField
                label="Дата фотографии (YYYY-MM-DD)"
                value={local.datePhoto}
                onClick={(e) => setDatePickerOpen(true)}
                fullWidth
                size="small"
                placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ"
              />

              {/* Встраиваем кастомный дейтпикер */}
              <CustomDatePickerDialog
                open={datePickerOpen}
                onClose={() => setDatePickerOpen(false)}
                initialDate={local.datePhoto}
                format="YYYY-MM-DD" // или "DD.MM.YYYY"
                showTime={true} // включить выбор времени
                onSave={(newDate) => {
                  setLocal((s) => ({ ...s, datePhoto: newDate }));
                  setDatePickerOpen(false);
                }}
              />
            </Stack>
          </Box>

          <Autocomplete
            size="small"
            options={allPeople}
            getOptionLabel={(p) =>
              `${p.id} :: ${p.firstName || ""} ${
                p.lastName || p.maidenName || ""
              }`.trim()
            }
            value={allPeople.find((p) => p.id === local.owner) || null}
            onChange={(_, v) =>
              setLocal((s) => ({ ...s, owner: v ? v.id : null }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Владелец (поиск)" />
            )}
            isOptionEqualToValue={(opt, val) =>
              String(opt.id) === String(val?.id)
            }
            freeSolo={false}
          />

          <Autocomplete
            multiple
            size="small"
            options={allPeople}
            getOptionLabel={(p) =>
              `${p.id} :: ${p.firstName || ""} ${
                p.lastName || p.maidenName || ""
              }`.trim()
            }
            value={allPeople.filter((p) => (local.people || []).includes(p.id))}
            onChange={(_, v) =>
              setLocal((s) => ({ ...s, people: v.map((x) => x.id) }))
            }
            renderInput={(params) => (
              <TextField {...params} label="Люди на фото" />
            )}
            isOptionEqualToValue={(opt, val) =>
              String(opt.id) === String(val?.id)
            }
          />

          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <TextField
              label="Имя файла"
              value={rename ? newFilename : local.filename}
              onChange={(e) => setNewFilename(e.target.value)}
              size="small"
              fullWidth
              helperText={
                rename
                  ? "Введите новое имя файла (включая расширение)"
                  : "Информационное поле. Включите переименование, чтобы изменить файл на диске"
              }
              InputProps={{ readOnly: !rename }}
            />
            <Button
              variant={rename ? "contained" : "outlined"}
              onClick={() => setRename((s) => !s)}
            >
              {rename ? "Отмена" : "Переименовать"}
            </Button>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px" }}>
        <Box sx={{ position: "relative" }}>
          <Button onClick={onClose} disabled={saving}>
            Отмена
          </Button>
        </Box>

        <Box sx={{ position: "relative" }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            Сохранить
          </Button>
          {saving && (
            <CircularProgress
              size={20}
              sx={{
                position: "absolute",
                right: -28,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
