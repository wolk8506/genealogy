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
} from "@mui/material";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import { EVENT_TYPES } from "./EventTypesList";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

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
        PaperProps={{ sx: { borderRadius: "15px" } }}
      >
        <DialogTitle>
          {initialEvent ? "Редактировать событие" : "Добавить событие"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Тип события"
              value={type.name}
              // onChange={(e) => setType({e.target.value})}
              onChange={(e) =>
                setType(EVENT_TYPES.find((i) => i.name === e.target.value))
              }
              size="small"
              fullWidth
              // Настройка отображения ВНУТРИ самого TextField после выбора
              SelectProps={{
                renderValue: (selected) => {
                  const eventType = EVENT_TYPES.find(
                    (t) => t.name === selected,
                  );
                  return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {eventType?.icon}
                      {eventType?.name}
                    </Box>
                  );
                },
              }}
            >
              {EVENT_TYPES.map((t) => (
                <MenuItem
                  key={t.name}
                  value={t.name}
                  // Выравнивание внутри списка (при наведении/выборе)
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  {t.icon}
                  {t.name}
                </MenuItem>
              ))}
            </TextField>

            {/* Кнопка для открытия кастомного дейтпикера */}
            <TextField
              label="Дата"
              value={date}
              onClick={() => setDatePickerOpen(true)}
              size="small"
              fullWidth
              placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ"
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Примечания"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Место"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              size="small"
              fullWidth
            />
            <Autocomplete
              size="small"
              multiple
              options={allPeople}
              getOptionLabel={labelOf}
              value={participants.map(findById).filter(Boolean)}
              onChange={(_, vs) => setParticipants(vs.map((p) => p.id))}
              renderInput={(params) => (
                <TextField {...params} label="Участники события" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px" }}>
          {initialEvent && (
            <Button color="error" onClick={handleDelete} sx={{ mr: "auto" }}>
              Удалить
            </Button>
          )}
          {initialEvent && (
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                // Создаем копию данных БЕЗ иконки
                const dataToCopy = {
                  // Если type — это объект {name, icon}, берем только name
                  // Если type уже строка (вдруг), берем её
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
              Скопировать...
            </Button>
          )}
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>
            Сохранить
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
