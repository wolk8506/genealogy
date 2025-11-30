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
} from "@mui/material";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import EventIcon from "@mui/icons-material/Event";

const EVENT_TYPES = [
  "Бар-мицва",
  "Бат-мицва",
  "Благословение",
  "Болезнь",
  "Брак",
  "Воинская награда",
  "Воинская служба",
  "Выкидыш",
  "Выход на пенсию",
  "Гражданство, подданство",
  "Дворянский титул",
  "Документ на владение",
  "Завещание",
  "Земельная сделка",
  "Иммиграция",
  "Инициация в церкви LDS",
  "Иное событие",
  "Конфирмация",
  "Конфирмация в церкви LDS",
  "Кремация",
  "Крещение",
  "Крещение в церкви LDS",
  "Крещение взрослого",
  "Крещение ребёнка",
  "Место жительства",
  "Миссия",
  "Наследственное дело",
  "Натурализация",
  "Образование",
  "Обрезание",
  "Обучение",
  "Окончание учебного заведения",
  "Отлучение от церкви",
  "Первое причастие",
  "Перепись",
  "Погребение",
  "Посвящение в церкви LDS",
  "Похоронная церемония",
  "Призыв на воинскую службу",
  "Прозвище",
  "Религия",
  "Род занятий",
  "Рождение",
  "Роспись",
  "Рукоположение",
  "Смерть",
  "Соединение с родителями LDS",
  "Увольнение с воинской службы",
  "Усыновление",
  "Эмиграция",
];

export default function EventEditorDialog({
  open,
  onClose,
  initialEvent,
  onSave,
  onDelete,
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
      setType(initialEvent?.type ?? EVENT_TYPES[0]);
      setDate(initialEvent?.date ?? "");
      setDescription(initialEvent?.description ?? "");
      setNotes(initialEvent?.notes ?? "");
      setPlace(initialEvent?.place ?? "");
      setParticipants(initialEvent?.participants || []);
    }
  }, [open, initialEvent]);

  const handleSave = () => {
    onSave?.({ type, date, description, notes, place, participants });
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
        maxWidth="xs"
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
              value={type}
              onChange={(e) => setType(e.target.value)}
              size="small"
              fullWidth
            >
              {EVENT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  <EventIcon fontSize="small" sx={{ mr: 1 }} /> {t}
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
