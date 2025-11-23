import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
  Autocomplete,
  Typography,
  Snackbar,
  Alert,
  Paper,
  Divider,
} from "@mui/material";

export default function PersonEditDialog({
  open,
  onClose,
  person,
  onSave,
  allPeople = [],
}) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const prevGen = useRef();

  // Заполняем форму и запоминаем старое поколение
  useEffect(() => {
    if (person) {
      setForm(person);
      prevGen.current = person.generation;
    }
  }, [person]);

  // Универсальные контролы
  const handleChange = (field) => (e) => {
    let v = e.target.value;
    if (field === "generation") {
      v = Math.max(1, Number(v)); // минимум 1
      if (prevGen.current != null && v !== prevGen.current) {
        alert("Изменение поколения может нарушить связи.");
        prevGen.current = v;
      }
    }
    setForm((f) => ({ ...f, [field]: v }));
  };
  const handleSelect = (field) => (_, v) =>
    setForm((f) => ({ ...f, [field]: v?.id || null }));
  const handleMulti = (field) => (_, vs) =>
    setForm((f) => ({ ...f, [field]: vs.map((p) => p.id) }));

  // Утилиты автокомплита
  const findById = (id) => allPeople.find((p) => p.id === id) || null;
  const labelOf = (p) =>
    [`${p.id} ::`, p.firstName, p.patronymic, p.lastName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  const gen = form.generation ?? person.generation ?? 1;
  const filterGen = (g) =>
    allPeople.filter((p) => p.id !== person.id && (p.generation ?? -999) === g);

  // Полная логика диффа связей
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    // валидация имени
    const hasName =
      form.firstName?.trim() ||
      form.lastName?.trim() ||
      form.patronymic?.trim() ||
      form.maidenName?.trim();
    if (!hasName) {
      setError("Укажите хотя бы имя, фамилию, отчество или девичью фамилию");
      return;
    }

    // Клонируем массив всех людей
    const all = allPeople.map((p) => ({ ...p }));
    const updated = { ...form };

    // Старые связи
    const oldFather = person.father ?? null;
    const oldMother = person.mother ?? null;
    const oldChildren = person.children || [];
    const oldSpouse = person.spouse || [];
    const oldSiblings = person.siblings || [];

    // Новые связи
    const newFather = form.father ?? null;
    const newMother = form.mother ?? null;
    const newChildren = form.children || [];
    const newSpouse = form.spouse || [];
    const newSiblings = form.siblings || [];

    // === РОДИТЕЛИ ===
    // Удаляем из oldFather.children связь
    if (oldFather && oldFather !== newFather) {
      const par = all.find((x) => x.id === oldFather);
      if (par)
        par.children = (par.children || []).filter((id) => id !== person.id);
    }
    // Добавляем в newFather.children
    if (newFather && newFather !== oldFather) {
      const par = all.find((x) => x.id === newFather);
      if (par && !(par.children || []).includes(person.id)) {
        par.children = [...(par.children || []), person.id];
      }
    }

    // Аналогично для матери
    if (oldMother && oldMother !== newMother) {
      const par = all.find((x) => x.id === oldMother);
      if (par)
        par.children = (par.children || []).filter((id) => id !== person.id);
    }
    if (newMother && newMother !== oldMother) {
      const par = all.find((x) => x.id === newMother);
      if (par && !(par.children || []).includes(person.id)) {
        par.children = [...(par.children || []), person.id];
      }
    }

    // === ДЕТИ ===
    // Удаленные дети
    oldChildren
      .filter((cid) => !newChildren.includes(cid))
      .forEach((cid) => {
        const ch = all.find((x) => x.id === cid);
        if (ch) {
          if (ch.father === person.id) ch.father = null;
          if (ch.mother === person.id) ch.mother = null;
        }
      });
    // Добавленные дети
    newChildren
      .filter((cid) => !oldChildren.includes(cid))
      .forEach((cid) => {
        const ch = all.find((x) => x.id === cid);
        if (ch) {
          if (form.gender === "male") ch.father = person.id;
          if (form.gender === "female") ch.mother = person.id;
        }
      });

    // === СУПРУГИ ===
    // Удаленные
    oldSpouse
      .filter((sid) => !newSpouse.includes(sid))
      .forEach((sid) => {
        const sp = all.find((x) => x.id === sid);
        if (sp) sp.spouse = (sp.spouse || []).filter((id) => id !== person.id);
      });
    // Добавленные
    newSpouse
      .filter((sid) => !oldSpouse.includes(sid))
      .forEach((sid) => {
        const sp = all.find((x) => x.id === sid);
        if (sp && !(sp.spouse || []).includes(person.id)) {
          sp.spouse = [...(sp.spouse || []), person.id];
        }
      });

    // === БРАТЬЯ/СЁСТРЫ ===
    oldSiblings
      .filter((sid) => !newSiblings.includes(sid))
      .forEach((sid) => {
        const sib = all.find((x) => x.id === sid);
        if (sib)
          sib.siblings = (sib.siblings || []).filter((id) => id !== person.id);
      });
    newSiblings
      .filter((sid) => !oldSiblings.includes(sid))
      .forEach((sid) => {
        const sib = all.find((x) => x.id === sid);
        if (sib && !(sib.siblings || []).includes(person.id)) {
          sib.siblings = [...(sib.siblings || []), person.id];
        }
      });

    // === Обновляем сам объект ===
    const idx = all.findIndex((x) => x.id === person.id);
    if (idx !== -1) all[idx] = updated;

    // Сохраняем всё
    await window.peopleAPI.saveAll(all);
    setSaved(true);
    onSave?.();
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Редактировать человека</DialogTitle>
        <DialogContent>
          <Paper elevation={1} sx={{ p: 2, bgcolor: "background.paper" }}>
            <Typography variant="subtitle1">Личные данные</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Имя"
                size="small"
                fullWidth
                value={form.firstName || ""}
                onChange={handleChange("firstName")}
              />
              <TextField
                label="Фамилия"
                size="small"
                fullWidth
                value={form.lastName || ""}
                onChange={handleChange("lastName")}
              />
              <TextField
                label="Отчество"
                size="small"
                fullWidth
                value={form.patronymic || ""}
                onChange={handleChange("patronymic")}
              />
              <TextField
                label="Девичья фамилия"
                size="small"
                fullWidth
                disabled={form.gender === "male"}
                value={form.maidenName || ""}
                onChange={handleChange("maidenName")}
              />
              <TextField
                label="Пол"
                size="small"
                fullWidth
                select
                value={form.gender || ""}
                onChange={handleChange("gender")}
              >
                <MenuItem value="male">Мужской</MenuItem>
                <MenuItem value="female">Женский</MenuItem>
              </TextField>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">Дата и поколение</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Дата рождения"
                size="small"
                fullWidth
                value={form.birthday || ""}
                onChange={handleChange("birthday")}
              />
              <TextField
                label="Дата смерти"
                size="small"
                fullWidth
                value={form.died || ""}
                onChange={handleChange("died")}
              />
              <TextField
                label="Поколение"
                size="small"
                fullWidth
                type="number"
                inputProps={{ min: 1 }}
                value={gen}
                onChange={handleChange("generation")}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1">Родственные связи</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Autocomplete
                size="small"
                options={filterGen(gen - 1).filter((p) => p.gender === "male")}
                getOptionLabel={labelOf}
                value={findById(form.father)}
                onChange={handleSelect("father")}
                renderInput={(params) => (
                  <TextField {...params} label="Отец" fullWidth />
                )}
              />
              <Autocomplete
                size="small"
                options={filterGen(gen - 1).filter(
                  (p) => p.gender === "female"
                )}
                getOptionLabel={labelOf}
                value={findById(form.mother)}
                onChange={handleSelect("mother")}
                renderInput={(params) => (
                  <TextField {...params} label="Мать" fullWidth />
                )}
              />
              <Autocomplete
                size="small"
                multiple
                options={filterGen(gen)}
                getOptionLabel={labelOf}
                value={(form.siblings || []).map(findById).filter(Boolean)}
                onChange={handleMulti("siblings")}
                renderInput={(params) => (
                  <TextField {...params} label="Братья/сестры" fullWidth />
                )}
              />
              <Autocomplete
                size="small"
                multiple
                options={filterGen(gen).filter(
                  (p) => p.gender && p.gender !== form.gender
                )}
                getOptionLabel={labelOf}
                value={(form.spouse || []).map(findById).filter(Boolean)}
                onChange={handleMulti("spouse")}
                renderInput={(params) => (
                  <TextField {...params} label="Супруг(и)" fullWidth />
                )}
              />
              <Autocomplete
                size="small"
                multiple
                options={filterGen(gen + 1)}
                getOptionLabel={labelOf}
                value={(form.children || []).map(findById).filter(Boolean)}
                onChange={handleMulti("children")}
                renderInput={(params) => (
                  <TextField {...params} label="Дети" fullWidth />
                )}
              />
            </Stack>
          </Paper>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success">Данные сохранены</Alert>
      </Snackbar>
    </>
  );
}
