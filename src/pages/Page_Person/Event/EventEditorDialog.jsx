import React, { useEffect, useState } from "react";
import {
  Dialog,
  Stack,
  TextField,
  MenuItem,
  Autocomplete,
  Box,
  ListItemText,
  Typography,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";
import { EVENT_TYPES } from "./EventTypesList";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import MapIcon from "@mui/icons-material/Map";
import LocationPickerDialog from "../../../components/Dialog/LocationPickerDialog";
import AppButton from "../../../components/AppButton";
import {
  buildFaceTagOptions,
  splitEventParticipantOptions,
  eventParticipantOptionsFromEvent,
} from "../../../utils/externalEntities";
import useDialogSaveHotkey from "../../../hooks/useDialogSaveHotkey";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
};

const sectionLabelSx = {
  display: "block",
  mb: 1,
  fontWeight: 700,
  color: "text.secondary",
};

export default function EventEditorDialog({
  open,
  onClose,
  initialEvent,
  onSave,
  onDelete,
  onCopyRequest,
  allPeople = [],
}) {
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [place, setPlace] = useState("");
  const [evLat, setEvLat] = useState(null);
  const [evLng, setEvLng] = useState(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [participantOptions, setParticipantOptions] = useState([]);
  const [allExternal, setAllExternal] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      window.externalAPI?.getAll().then((data) => setAllExternal(data || []));
      setType(
        EVENT_TYPES.find((i) => i.name === initialEvent?.type) ??
          EVENT_TYPES[0],
      );
      setDate(initialEvent?.date ?? "");
      setDescription(initialEvent?.description ?? "");
      setNotes(initialEvent?.notes ?? "");
      setPlace(initialEvent?.place ?? "");
      setEvLat(initialEvent?.lat ?? null);
      setEvLng(initialEvent?.lng ?? null);
    }
  }, [open, initialEvent]);

  useEffect(() => {
    if (!open) return;
    setParticipantOptions(
      eventParticipantOptionsFromEvent(initialEvent, allPeople, allExternal),
    );
  }, [open, initialEvent, allPeople, allExternal]);

  const handleSave = () => {
    const { participants, externalParticipants } =
      splitEventParticipantOptions(participantOptions);

    onSave?.({
      type: type.name,
      date,
      description,
      notes,
      place,
      lat: evLat,
      lng: evLng,
      participants,
      externalParticipants,
    });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  const participantSelectOptions = buildFaceTagOptions(
    allPeople.filter((p) => !p.archived),
    allExternal,
  );

  useDialogSaveHotkey({ open, onSave: handleSave });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
        transitionDuration={{ enter: 180, exit: 140 }}
        PaperProps={{
          sx: {
            width: 600,
            maxWidth: "94vw",
            maxHeight: "calc(100vh - 64px)",
            borderRadius: "24px",
            backgroundImage: "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2, overflowY: "auto" }}>
          <Typography
            variant="h6"
            sx={{ textAlign: "center", fontWeight: 700, mb: 3 }}
          >
            {initialEvent ? "Редактировать событие" : "Новое событие"}
          </Typography>

          <Stack spacing={2.5}>
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Основное
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Категория события"
                  value={type.name}
                  onChange={(e) =>
                    setType(
                      EVENT_TYPES.find((i) => i.name === e.target.value),
                    )
                  }
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  SelectProps={{
                    renderValue: (selected) => {
                      const eventType = EVENT_TYPES.find(
                        (t) => t.name === selected,
                      );
                      return (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              color: "primary.main",
                              display: "flex",
                            }}
                          >
                            {eventType?.icon}
                          </Box>
                          <Typography variant="body2" fontWeight={500}>
                            {eventType?.name}
                          </Typography>
                        </Box>
                      );
                    },
                  }}
                >
                  {EVENT_TYPES.map((t) => (
                    <MenuItem
                      key={t.name}
                      value={t.name}
                      sx={{ gap: 1.5, mx: 1, my: 0.5, borderRadius: "8px" }}
                    >
                      <Box sx={{ color: "primary.main" }}>{t.icon}</Box>
                      <ListItemText primary={t.name} />
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Когда произошло?"
                  value={date}
                  onClick={() => setDatePickerOpen(true)}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="Нажмите для выбора даты"
                  InputProps={{
                    readOnly: true,
                    sx: { cursor: "pointer" },
                  }}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Описание и место
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Краткое описание"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="Напр: Переезд в другой город"
                />
                <TextField
                  label="Место"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                  placeholder="Напр: Киев"
                  helperText={
                    evLat != null && evLng != null
                      ? `Координаты: ${Number(evLat).toFixed(4)}, ${Number(evLng).toFixed(4)}`
                      : "Можно указать точку на карте"
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Указать на карте">
                          <IconButton
                            size="small"
                            color={
                              evLat != null && evLng != null
                                ? "primary"
                                : "default"
                            }
                            onClick={() => setLocationPickerOpen(true)}
                          >
                            <MapIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {(place.trim() !== "" ||
                          (evLat != null && evLng != null)) && (
                          <Tooltip title="Очистить">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setPlace("");
                                setEvLat(null);
                                setEvLng(null);
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  label="Примечания"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  size="small"
                  fullWidth
                  sx={fieldSx}
                />
              </Stack>
            </Box>

            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Участники
              </Typography>
              <Autocomplete
                size="small"
                multiple
                options={participantSelectOptions}
                groupBy={(opt) =>
                  opt.kind === "person" ? "Родственники" : "Справочник"
                }
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(a, b) =>
                  a?.kind === b?.kind && a?.id === b?.id
                }
                value={participantOptions}
                onChange={(_, vs) => setParticipantOptions(vs)}
                slotProps={{
                  popper: {
                    sx: { zIndex: (t) => t.zIndex.modal + 2 },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Участники"
                    placeholder="Родственники или справочник..."
                    fullWidth
                    sx={fieldSx}
                  />
                )}
              />
            </Box>
          </Stack>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 2,
            pt: 1,
          }}
        >
          {initialEvent && (
            <AppButton
              preset="dangerOutlined"
              onClick={handleDelete}
              sx={{ px: 2.5, borderRadius: "999px" }}
            >
              Удалить
            </AppButton>
          )}
          {initialEvent && (
            <AppButton
              preset="secondary"
              startIcon={<ContentCopyIcon />}
              sx={{ px: 2.5, borderRadius: "999px" }}
              onClick={() => {
                const { participants, externalParticipants } =
                  splitEventParticipantOptions(participantOptions);
                onCopyRequest?.({
                  type: type.name,
                  date,
                  description,
                  notes,
                  place,
                  lat: evLat,
                  lng: evLng,
                  participants,
                  externalParticipants,
                });
              }}
            >
              Копия
            </AppButton>
          )}
          <AppButton
            preset="secondary"
            onClick={onClose}
            sx={{ px: 2.5, borderRadius: "999px" }}
          >
            Отмена
          </AppButton>
          <Box sx={{ flex: 1 }} />
          <AppButton
            preset="primary"
            onClick={handleSave}
            sx={{ px: 3, borderRadius: "999px" }}
          >
            {initialEvent ? "Обновить" : "Сохранить"}
          </AppButton>
        </Box>
      </Dialog>

      {/* Встраиваем кастомный дейтпикер */}
      <CustomDatePickerDialog
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        initialDate={date}
        format="DD.MM.YYYY" // или "YYYY-MM-DD"
        showTime={true} // включить выбор времени
        onSave={(newDate) => {
          setDate(newDate);
          setDatePickerOpen(false);
        }}
      />
      <LocationPickerDialog
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        initial={
          evLat != null && evLng != null ? { lat: evLat, lng: evLng } : null
        }
        initialQuery={place || ""}
        onSelect={({ lat, lng, name }) => {
          setEvLat(lat);
          setEvLng(lng);
          if (!place.trim() && name) setPlace(name);
        }}
      />
    </>
  );
}
