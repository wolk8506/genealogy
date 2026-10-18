import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Autocomplete,
  Divider,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import CloseIcon from "@mui/icons-material/Close";
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EditIcon from "@mui/icons-material/Edit";
import CropIcon from "@mui/icons-material/Crop";
import HashtagInput from "../components/HashtagInput";
import CustomDatePickerDialog from "../components/CustomDatePickerDialog";
import LocationPickerDialog from "../components/Dialog/LocationPickerDialog";
import { usePhotoInspectorStore } from "../store/usePhotoInspectorStore";
import { useNotificationStore } from "../store/useNotificationStore";
import {
  getPersonLabel,
  syncPeopleFromFaces,
  syncExternalPeopleFromFaces,
  normalizeFaces,
} from "../utils/photoFaces";
import { getExternalEntityLabel } from "../utils/externalEntities";
import { syncReferencesAfterPhotoSave } from "../utils/faceIndex";

function FieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5, display: "block" }}
    >
      {children}
    </Typography>
  );
}

// Правая панель-инспектор фото. Редактирует метаданные выбранного фото
// (заголовок, описание, люди, дата, место, имя файла). Разметка лиц и превью
// открываются в модальном редакторе (кнопка «Лица и превью»).
export default function PhotoInspectorPanel({ allPeople = [] }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Список фото и его сеттер берём из стора: активная галерея их регистрирует,
  // поэтому одна панель работает и в глобальной, и в персональной галерее.
  const photos = usePhotoInspectorStore((s) => s.photos);
  const setPhotos = usePhotoInspectorStore((s) => s.setPhotos);
  const open = usePhotoInspectorStore((s) => s.open);
  const selectedId = usePhotoInspectorStore((s) => s.selectedId);
  const draft = usePhotoInspectorStore((s) => s.draft);
  const dirty = usePhotoInspectorStore((s) => s.dirty);
  const pendingPhoto = usePhotoInspectorStore((s) => s.pendingPhoto);
  const actions = usePhotoInspectorStore((s) => s.actions);
  const toggle = usePhotoInspectorStore((s) => s.toggle);
  const update = usePhotoInspectorStore((s) => s.update);
  const setLocation = usePhotoInspectorStore((s) => s.setLocation);
  const markSaved = usePhotoInspectorStore((s) => s.markSaved);
  const resolvePending = usePhotoInspectorStore((s) => s.resolvePending);
  const resetDraft = usePhotoInspectorStore((s) => s.resetDraft);

  const [allExternal, setAllExternal] = useState([]);
  const [uniqueTags, setUniqueTags] = useState([]);
  const [saving, setSaving] = useState(false);
  // Очередь автосохранений: гарантирует последовательную запись на диск.
  const saveChainRef = useRef(Promise.resolve());
  const [rename, setRename] = useState(false);
  const [newFilename, setNewFilename] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const photo = useMemo(
    () => photos.find((p) => p.id === selectedId) || null,
    [photos, selectedId],
  );

  // Свежие внешние сущности и теги для автодополнения.
  useEffect(() => {
    window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
    window.photoAPI?.getGlobalHashtags?.().then((tags) => setUniqueTags(tags || []));
  }, []);

  // Держим черновик синхронным с актуальными данными фото, пока нет правок.
  useEffect(() => {
    if (photo && !dirty) resetDraft(photo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, dirty]);

  useEffect(() => {
    if (photo) setNewFilename(photo.filename || "");
  }, [photo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    // Всегда берём актуальный черновик из стора: позволяет сохранять
    // сразу после update() (например, подтверждение геометки в модалке).
    const draft = usePhotoInspectorStore.getState().draft;
    if (!photo || !draft) return;
    setSaving(true);
    try {
      const oldData = photo;
      const extractedHashtags = draft.description
        ? (draft.description.match(/#[\p{L}\d_]+/gu) || []).map((t) =>
            t.toLowerCase(),
          )
        : [];
      const finalFilename = rename
        ? newFilename || oldData.filename
        : oldData.filename;
      const ownerChanged = String(draft.owner) !== String(oldData.owner);
      const filenameChanged =
        String(finalFilename) !== String(oldData.filename);

      if (ownerChanged) {
        await window.fileAPI.moveFile(
          oldData.owner,
          draft.owner,
          oldData.filename,
          finalFilename,
        );
      } else if (filenameChanged) {
        await window.fileAPI.renameFile?.(
          oldData.owner,
          oldData.filename,
          finalFilename,
        );
      }

      const faces = normalizeFaces(oldData.faces);
      const updatedEntry = {
        ...oldData,
        title: draft.title,
        description: draft.description,
        owner: draft.owner,
        people: syncPeopleFromFaces(faces, draft.people),
        externalPeople: syncExternalPeopleFromFaces(
          faces,
          draft.externalPeople,
        ),
        datePhoto: draft.datePhoto,
        locationName: draft.locationName?.trim() || null,
        lat: draft.lat,
        lng: draft.lng,
        filename: finalFilename,
        hashtags: extractedHashtags,
        faces,
      };

      if (ownerChanged || filenameChanged) {
        await window.photoAPI.removeFromOwnerJson(oldData.owner, {
          filename: oldData.filename,
          id: oldData.id,
        });
      }
      await window.photoAPI.addOrUpdateOwnerJson(draft.owner, updatedEntry);
      await syncReferencesAfterPhotoSave(
        { owner: draft.owner, id: updatedEntry.id },
        faces,
      );

      setPhotos?.((prev) =>
        prev.map((p) => (p.id === oldData.id ? updatedEntry : p)),
      );
      actions.onSaved?.(updatedEntry, { ownerChanged, filenameChanged });
      markSaved();
      setRename(false);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлено фото ID: ${updatedEntry.id ?? null}.\nИмя файла: ${updatedEntry.filename ?? ""}`,
        type: "success",
        category: "photo",
      });
      return updatedEntry;
    } catch (e) {
      console.error("Save failed", e);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: "Ошибка: " + (e.message || e),
        type: "error",
        category: "photo",
      });
    } finally {
      setSaving(false);
    }
  };

  // Автосохранение: запускает handleSave последовательно (без гонок записи).
  const scheduleSave = () => {
    saveChainRef.current = saveChainRef.current.then(() => handleSave());
    return saveChainRef.current;
  };

  // ESC — откат поля к сохранённому значению (без записи).
  const revertField = (name, value) =>
    usePhotoInspectorStore.getState().revertField(name, value);

  // Смена фото при наличии правок: сначала автосохраняем текущее, потом уходим.
  useEffect(() => {
    if (!pendingPhoto) return;
    (async () => {
      try {
        await scheduleSave();
      } finally {
        resolvePending();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPhoto]);

  // Сохранение только геометки из модалки карты — отдельно от прочих правок.
  const handleSaveLocation = async ({ lat, lng, name }) => {
    if (!photo) return;
    const hasPoint = lat != null && lng != null;
    const nextLat = hasPoint ? lat : null;
    const nextLng = hasPoint ? lng : null;
    const nextName = hasPoint ? name || "" : "";
    try {
      const updatedEntry = {
        ...photo,
        lat: nextLat,
        lng: nextLng,
        locationName: nextName.trim() || null,
      };
      await window.photoAPI.addOrUpdateOwnerJson(photo.owner, updatedEntry);
      setPhotos?.((prev) =>
        prev.map((p) => (p.id === photo.id ? updatedEntry : p)),
      );
      actions.onSaved?.(updatedEntry, {});
      setLocation({ lat: nextLat, lng: nextLng, locationName: nextName });
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: `Обновлена геометка фото ID: ${updatedEntry.id ?? null}.`,
        type: "success",
        category: "photo",
      });
    } catch (e) {
      console.error("Save location failed", e);
      addNotification({
        timestamp: new Date().toISOString(),
        title: "Фото",
        message: "Ошибка: " + (e.message || e),
        type: "error",
        category: "photo",
      });
    }
  };

  const peopleOptions = allPeople;
  // Единый список для отображения: родственники + справочник, но с раздельными id.
  const photoTagOptions = useMemo(
    () => [
      ...allPeople.map((p) => ({
        kind: "person",
        id: p.id,
        label: `${p.id} :: ${getPersonLabel(p)}`,
      })),
      ...allExternal.map((e) => ({
        kind: "external",
        id: e.id,
        label: `${e.id} :: ${getExternalEntityLabel(e)}`,
      })),
    ],
    [allPeople, allExternal],
  );

  const locationText = draft?.locationName?.trim()
    ? draft.locationName
    : draft?.lat != null && draft?.lng != null
      ? `${Number(draft.lat).toFixed(5)}, ${Number(draft.lng).toFixed(5)}`
      : "";

  const facesCount = normalizeFaces(photo?.faces).length;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={toggle}
        variant="persistent"
        transitionDuration={0}
        PaperProps={{
          sx: { top: 50, height: "calc(100% - 50px)" },
        }}
      >
        <Box
          sx={{
            width: 340,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: 2,
              pb: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <PhotoLibraryIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={800} sx={{ flexGrow: 1 }}>
              Фото
            </Typography>
            {dirty && (
              <Typography
                variant="caption"
                sx={{ color: "warning.main", fontWeight: 700 }}
              >
                не сохранено
              </Typography>
            )}
            <IconButton
              size="small"
              title="Закрыть"
              onClick={toggle}
              sx={{ color: "action.active" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {!photo || !draft ? (
            <Box sx={{ p: 2, color: "text.secondary" }}>
              <Typography variant="body2">
                Выберите фото в галерее, чтобы редактировать сведения.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="Добавить название"
                    value={draft.title}
                    onChange={(e) => update({ title: e.target.value })}
                    onBlur={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        e.stopPropagation();
                        revertField("title", photo.title ?? "");
                        e.currentTarget.blur();
                      }
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        px: "6px",
                        "& fieldset": { border: "none" },
                        "&:hover": { bgcolor: "action.hover" },
                        "&.Mui-focused": { bgcolor: "action.hover" },
                      },
                    }}
                  />

                  <HashtagInput
                    value={draft.description}
                    onChange={(val) => update({ description: val })}
                    suggestions={uniqueTags}
                    label="Описание и #теги"
                    onBlur={() => {
                      if (usePhotoInspectorStore.getState().dirty) scheduleSave();
                    }}
                    onEscape={() => revertField("description", photo.description ?? "")}
                  />

                  <Divider sx={{ opacity: 0.5 }} />

                  <Autocomplete
                    size="small"
                    options={peopleOptions}
                    getOptionLabel={(p) => `${p.id} :: ${getPersonLabel(p)}`}
                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                    value={
                      peopleOptions.find((p) => p.id === draft.owner) || null
                    }
                    onChange={(_, v) => {
                      update({ owner: v ? v.id : null });
                      scheduleSave();
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Владелец (папка)"
                        variant="outlined"
                        InputLabelProps={{
                          ...params.InputLabelProps,
                          shrink: true,
                        }}
                        sx={{
                          "& .MuiInputBase-input": { fontSize: "0.8rem" },
                          "& .MuiInputLabel-root": { fontSize: "0.75rem" },
                        }}
                      />
                    )}
                  />

                  <Autocomplete
                    multiple
                    size="small"
                      options={photoTagOptions}
                      groupBy={(o) =>
                        o.kind === "person" ? "Родственники" : "Справочник"
                      }
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(a, b) =>
                        a?.kind === b?.kind && a?.id === b?.id
                      }
                      value={photoTagOptions.filter((o) =>
                        o.kind === "person"
                          ? draft.people.includes(o.id)
                          : draft.externalPeople.includes(o.id),
                      )}
                      onChange={(_, v) => {
                        update({
                          people: v
                            .filter((x) => x.kind === "person")
                            .map((x) => x.id),
                          externalPeople: v
                            .filter((x) => x.kind === "external")
                            .map((x) => x.id),
                        });
                        scheduleSave();
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Кто на фото"
                          variant="outlined"
                          InputLabelProps={{
                            ...params.InputLabelProps,
                            shrink: true,
                          }}
                        />
                      )}
                      ChipProps={{
                        sx: { borderRadius: "8px", fontWeight: 500 },
                      }}
                    />

                  <Divider sx={{ opacity: 0.5 }} />

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <FieldLabel>Дата снимка</FieldLabel>
                    <Box
                      onClick={() => setDatePickerOpen(true)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        py: "2px",
                        px: "6px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <CalendarMonthIcon
                        sx={{ color: "action.active", fontSize: 18 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: draft.datePhoto
                            ? "text.primary"
                            : "text.secondary",
                        }}
                      >
                        {draft.datePhoto || "Указать дату"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Box
                    onClick={() => setLocationPickerOpen(true)}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.5,
                      p: "4px 6px",
                      mx: "-6px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        color: locationText ? "text.primary" : "text.secondary",
                      }}
                    >
                      {locationText ? `📍 ${locationText}` : "Назначить геопозицию"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor: isDark
                        ? alpha("#000", 0.15)
                        : alpha(theme.palette.action.hover, 0.05),
                      border: "1px solid",
                      borderColor: rename ? "primary.main" : "divider",
                      borderStyle: rename ? "solid" : "dashed",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        label="Имя файла на диске"
                        value={rename ? newFilename : photo.filename}
                        onChange={(e) => setNewFilename(e.target.value)}
                        onBlur={() => {
                          if (rename) scheduleSave();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            e.stopPropagation();
                            setNewFilename(photo.filename || "");
                            setRename(false);
                          }
                        }}
                        size="small"
                        fullWidth
                        variant="standard"
                        InputProps={{
                          readOnly: !rename,
                          disableUnderline: !rename,
                          sx: {
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            fontFamily: "monospace",
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => setRename(!rename)}
                        sx={{
                          bgcolor: rename ? "primary.main" : "transparent",
                          color: rename
                            ? "primary.contrastText"
                            : "action.active",
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<FaceRetouchingNaturalIcon />}
                      onClick={async () => {
                        let target = photo;
                        if (usePhotoInspectorStore.getState().dirty) {
                          const saved = await scheduleSave();
                          if (!saved) return;
                          target = saved;
                        }
                        actions.openFaces?.(target);
                      }}
                      sx={{ borderRadius: "10px", textTransform: "none" }}
                    >
                      {`Лица (${facesCount})`}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<CropIcon />}
                      onClick={async () => {
                        let target = photo;
                        if (usePhotoInspectorStore.getState().dirty) {
                          const saved = await scheduleSave();
                          if (!saved) return;
                          target = saved;
                        }
                        actions.openPreview?.(target);
                      }}
                      sx={{ borderRadius: "10px", textTransform: "none" }}
                    >
                      Превью
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={draft?.datePhoto || ""}
        format="YYYY-MM-DD"
        showTime={true}
        onSave={(d) => {
          update({ datePhoto: d });
          setDatePickerOpen(false);
          scheduleSave();
        }}
      />

      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          draft?.lat != null && draft?.lng != null
            ? { lat: draft.lat, lng: draft.lng }
            : null
        }
        initialQuery={draft?.locationName || ""}
        onSelect={({ lat, lng, name }) => {
          // Геометку сохраняем сразу из модалки; в панели она обновляется,
          // но не считается отслеживаемым изменением (dirty не выставляется).
          handleSaveLocation({ lat, lng, name });
        }}
      />
    </>
  );
}
