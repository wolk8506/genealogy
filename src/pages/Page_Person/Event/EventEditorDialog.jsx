import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  MenuItem,
  Autocomplete,
  Box,
  ListItemText,
  Typography,
} from "@mui/material";
import CustomDatePickerDialog from "../../../components/CustomDatePickerDialog";
import { EVENT_TYPES } from "./EventTypesList";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { alpha, useTheme } from "@mui/material/styles";
import EventIcon from "@mui/icons-material/Event"; // Общая иконка для заголовка
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

export default function EventEditorDialog({
  open,
  onClose,
  initialEvent,
  onSave,
  onDelete,
  onCopyRequest,
  allPeople = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [place, setPlace] = useState("");
  const [participants, setParticipants] = useState([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setType(
        EVENT_TYPES.find((i) => i.name === initialEvent?.type) ??
          EVENT_TYPES[0],
      );
      setDate(initialEvent?.date ?? "");
      setDescription(initialEvent?.description ?? "");
      setNotes(initialEvent?.notes ?? "");
      setPlace(initialEvent?.place ?? "");
      setParticipants(initialEvent?.participants || []);
    }
  }, [open, initialEvent]);

  const handleSave = () => {
    onSave?.({
      type: type.name,
      date,
      description,
      notes,
      place,
      participants,
    });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  const labelOf = (p) =>
    [`${p.id} :: `, p.firstName, p.patronymic, p.lastName]
      .filter(Boolean)
      .join(" ");

  const findById = (id) => allPeople.find((p) => p.id === id) || null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            backgroundImage: "none",
            bgcolor: isDark
              ? alpha(theme.palette.background.paper, 0.9)
              : "#fff",
            backdropFilter: "blur(12px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: theme.shadows[20],
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pb: 1,
            fontWeight: 600,
          }}
        >
          <EventIcon color="primary" fontSize="large" />
          {initialEvent ? "Редактировать событие" : "Новое событие"}
        </DialogTitle>

        <DialogContent sx={{ pt: "16px !important" }}>
          <Stack spacing={2.5}>
            {/* Секция: Тип и Дата (Основные данные) */}
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <TextField
                select
                label="Категория события"
                value={type.name}
                onChange={(e) =>
                  setType(EVENT_TYPES.find((i) => i.name === e.target.value))
                }
                size="small"
                fullWidth
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        borderRadius: "12px",
                        mt: 1,
                        boxShadow: theme.shadows[10],
                      },
                    },
                  },
                  renderValue: (selected) => {
                    const eventType = EVENT_TYPES.find(
                      (t) => t.name === selected,
                    );
                    return (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box
                          sx={{
                            color: theme.palette.primary.main,
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
                    <Box sx={{ color: theme.palette.primary.main }}>
                      {t.icon}
                    </Box>
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
                placeholder="Нажмите для выбора даты"
                InputProps={{
                  readOnly: true,
                  sx: { cursor: "pointer", borderRadius: "10px" },
                }}
              />
            </Box>

            {/* Секция: Описание и Место */}
            <Stack spacing={2}>
              <TextField
                label="Краткое описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                size="small"
                fullWidth
                placeholder="Напр: Переезд в другой город"
              />
              <TextField
                multiline
                rows={2}
                label="Место"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                size="small"
                fullWidth
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Примечания"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  size="small"
                  fullWidth
                />
              </Stack>
            </Stack>

            {/* Секция: Участники */}
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: alpha(theme.palette.action.hover, 0.04),
                border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mb: 1,
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                <PeopleAltIcon sx={{ fontSize: 14 }} /> УЧАСТНИКИ
              </Typography>
              <Autocomplete
                size="small"
                multiple
                options={allPeople}
                getOptionLabel={labelOf}
                value={participants.map(findById).filter(Boolean)}
                onChange={(_, vs) => setParticipants(vs.map((p) => p.id))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    placeholder="Добавить людей..."
                    fullWidth
                  />
                )}
                sx={{
                  "& .MuiInput-underline:before": {
                    borderBottomColor: alpha(theme.palette.divider, 0.2),
                  },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          {initialEvent && (
            <Button
              color="error"
              onClick={handleDelete}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1.2,
                px: 2,
                mr: "auto",
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.95rem",
                color: (theme) =>
                  theme.palette.mode === "dark" ? "#FF453A" : "#FF3B30", // macOS Red
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.08), // Легкий тинт вместо рамки
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                },
              }}
            >
              Удалить
            </Button>
          )}

          {initialEvent && (
            <Button
              // variant="outlined"
              startIcon={<ContentCopyIcon fontSize="12px" />}
              sx={{
                height: 24,
                borderRadius: "6px",
                py: 1.2,
                px: 3.6,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "text.primary",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
                },
              }}
              onClick={() => {
                const dataToCopy = {
                  type: type.name,
                  date,
                  description,
                  notes,
                  place,
                  participants,
                };
                onCopyRequest?.(dataToCopy);
              }}
            >
              Копия
            </Button>
          )}

          <Button
            onClick={onClose}
            sx={{
              height: 24,
              borderRadius: "6px",
              py: 1.2,
              px: 2,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "text.primary",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.05)",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
              },
            }}
          >
            Отменить
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
            disableElevation
            sx={{
              height: 24,
              borderRadius: "6px",
              px: 3,
              fontWeight: 600,
              boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
            }}
          >
            {initialEvent ? "Обновить" : "Сохранить"}
          </Button>
        </DialogActions>
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
    </>
  );
}
