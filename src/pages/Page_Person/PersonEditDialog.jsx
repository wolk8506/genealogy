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
  Box,
  Grid,
} from "@mui/material";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import { alpha, useTheme } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";

export default function PersonEditDialog({
  open,
  onClose,
  person,
  onSave,
  allPeople = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const prevGen = useRef();
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [diedPickerOpen, setDiedPickerOpen] = useState(false);

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

    // 1) взять свежие данные
    let all = await window.peopleAPI.getAll();

    const updated = { ...form };
    const now = new Date().toISOString();

    // 2) найти текущего человека по свежим данным
    const personIdx = all.findIndex((x) => x.id === person.id);
    const current = personIdx !== -1 ? all[personIdx] : person;

    // Старые связи
    const oldFather = current.father ?? null;
    const oldMother = current.mother ?? null;
    const oldChildren = current.children || [];
    const oldSpouse = current.spouse || [];
    const oldSiblings = current.siblings || [];

    // Новые связи
    const newFather = form.father ?? null;
    const newMother = form.mother ?? null;
    const newChildren = form.children || [];
    const newSpouse = form.spouse || [];
    const newSiblings = form.siblings || [];

    // === РОДИТЕЛИ ===
    if (oldFather && oldFather !== newFather) {
      const par = all.find((x) => x.id === oldFather);
      if (par) {
        par.children = (par.children || []).filter((id) => id !== person.id);
        par.editedAt = now;
      }
    }
    if (newFather && newFather !== oldFather) {
      const par = all.find((x) => x.id === newFather);
      if (par && !(par.children || []).includes(person.id)) {
        par.children = [...(par.children || []), person.id];
        par.editedAt = now;
      }
    }

    if (oldMother && oldMother !== newMother) {
      const par = all.find((x) => x.id === oldMother);
      if (par) {
        par.children = (par.children || []).filter((id) => id !== person.id);
        par.editedAt = now;
      }
    }
    if (newMother && newMother !== oldMother) {
      const par = all.find((x) => x.id === newMother);
      if (par && !(par.children || []).includes(person.id)) {
        par.children = [...(par.children || []), person.id];
        par.editedAt = now;
      }
    }

    // === ДЕТИ ===
    oldChildren
      .filter((cid) => !newChildren.includes(cid))
      .forEach((cid) => {
        const ch = all.find((x) => x.id === cid);
        if (ch) {
          if (ch.father === person.id) ch.father = null;
          if (ch.mother === person.id) ch.mother = null;
          ch.editedAt = now;
        }
      });

    newChildren
      .filter((cid) => !oldChildren.includes(cid))
      .forEach((cid) => {
        const ch = all.find((x) => x.id === cid);
        if (ch) {
          if (form.gender === "male") ch.father = person.id;
          if (form.gender === "female") ch.mother = person.id;
          ch.editedAt = now;
        }
      });

    // === СУПРУГИ ===
    oldSpouse
      .filter((sid) => !newSpouse.includes(sid))
      .forEach((sid) => {
        const sp = all.find((x) => x.id === sid);
        if (sp) {
          sp.spouse = (sp.spouse || []).filter((id) => id !== person.id);
          sp.editedAt = now;
        }
      });

    newSpouse
      .filter((sid) => !oldSpouse.includes(sid))
      .forEach((sid) => {
        const sp = all.find((x) => x.id === sid);
        if (sp && !(sp.spouse || []).includes(person.id)) {
          sp.spouse = [...(sp.spouse || []), person.id];
          sp.editedAt = now;
        }
      });

    // === БРАТЬЯ/СЁСТРЫ ===
    oldSiblings
      .filter((sid) => !newSiblings.includes(sid))
      .forEach((sid) => {
        const sib = all.find((x) => x.id === sid);
        if (sib) {
          sib.siblings = (sib.siblings || []).filter((id) => id !== person.id);
          sib.editedAt = now;
        }
      });

    newSiblings
      .filter((sid) => !oldSiblings.includes(sid))
      .forEach((sid) => {
        const sib = all.find((x) => x.id === sid);
        if (sib && !(sib.siblings || []).includes(person.id)) {
          sib.siblings = [...(sib.siblings || []), person.id];
          sib.editedAt = now;
        }
      });

    // === Сам объект человека ===
    if (personIdx !== -1) {
      all[personIdx] = {
        ...all[personIdx], // сохраняем служебные поля
        ...updated, // накладываем изменения из формы
        editedAt: now, // обновляем дату редактирования
      };
    }

    // 3) сохранить и ре‑фетч
    await window.peopleAPI.saveAll(all);
    const fresh = await window.peopleAPI.getAll();
    setSaved(true);
    onSave?.(fresh); // можно передать свежие данные наверх
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            backgroundImage: "none",
            bgcolor: isDark
              ? alpha(theme.palette.background.paper, 0.85)
              : "#fff",
            backdropFilter: "blur(16px)",
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: theme.shadows[24],
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            fontWeight: 600,
          }}
        >
          <PersonIcon color="primary" />
          Редактировать профиль
        </DialogTitle>

        <DialogContent sx={{ pt: "10px !important" }}>
          <Stack spacing={4}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            {/* Секция 1: Личные данные */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 18 }} /> Личные данные
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Фамилия"
                    size="small"
                    fullWidth
                    value={form.lastName || ""}
                    onChange={handleChange("lastName")}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Имя"
                    size="small"
                    fullWidth
                    value={form.firstName || ""}
                    onChange={handleChange("firstName")}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Отчество"
                    size="small"
                    fullWidth
                    value={form.patronymic || ""}
                    onChange={handleChange("patronymic")}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Пол"
                    size="small"
                    fullWidth
                    select
                    value={form.gender || ""}
                    onChange={handleChange("gender")}
                    InputProps={{
                      startAdornment: form.gender ? (
                        <Box
                          sx={{
                            mr: 1,
                            display: "flex",
                            color: "action.active",
                          }}
                        >
                          {form.gender === "male" ? (
                            <MaleIcon fontSize="small" />
                          ) : (
                            <FemaleIcon fontSize="small" />
                          )}
                        </Box>
                      ) : null,
                    }}
                  >
                    <MenuItem value="male">Мужской</MenuItem>
                    <MenuItem value="female">Женский</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Девичья фамилия"
                    size="small"
                    fullWidth
                    disabled={form.gender === "male"}
                    value={form.maidenName || ""}
                    onChange={handleChange("maidenName")}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Секция 2: Даты и Поколение */}
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                bgcolor: alpha(theme.palette.action.hover, 0.04),
                border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                }}
              >
                <CalendarTodayIcon sx={{ fontSize: 18 }} /> Даты и поколение
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Рождение"
                  size="small"
                  fullWidth
                  value={form.birthday || ""}
                  onClick={() => setBirthdayPickerOpen(true)}
                  InputProps={{ readOnly: true, sx: { borderRadius: "10px" } }}
                />
                <TextField
                  label="Смерть"
                  size="small"
                  fullWidth
                  value={form.died || ""}
                  onClick={() => setDiedPickerOpen(true)}
                  InputProps={{ readOnly: true, sx: { borderRadius: "10px" } }}
                />
                <TextField
                  label="Поколение"
                  size="small"
                  sx={{ width: { sm: "120px" } }}
                  type="number"
                  inputProps={{ min: 1 }}
                  value={gen}
                  onChange={handleChange("generation")}
                />
              </Stack>
            </Box>

            {/* Секция 3: Родственные связи */}
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "text.secondary",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                }}
              >
                <AccountTreeIcon sx={{ fontSize: 18 }} /> Родственные связи
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={filterGen(gen - 1).filter(
                      (p) => p.gender === "male",
                    )}
                    getOptionLabel={labelOf}
                    value={findById(form.father)}
                    onChange={handleSelect("father")}
                    renderInput={(params) => (
                      <TextField {...params} label="Отец" />
                    )}
                  />
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={filterGen(gen - 1).filter(
                      (p) => p.gender === "female",
                    )}
                    getOptionLabel={labelOf}
                    value={findById(form.mother)}
                    onChange={handleSelect("mother")}
                    renderInput={(params) => (
                      <TextField {...params} label="Мать" />
                    )}
                  />
                </Stack>
                <Autocomplete
                  size="small"
                  multiple
                  options={filterGen(gen)}
                  getOptionLabel={labelOf}
                  value={(form.siblings || []).map(findById).filter(Boolean)}
                  onChange={handleMulti("siblings")}
                  renderInput={(params) => (
                    <TextField {...params} label="Братья / сестры" />
                  )}
                />
                <Autocomplete
                  size="small"
                  multiple
                  options={filterGen(gen).filter(
                    (p) => p.gender && p.gender !== form.gender,
                  )}
                  getOptionLabel={labelOf}
                  value={(form.spouse || []).map(findById).filter(Boolean)}
                  onChange={handleMulti("spouse")}
                  renderInput={(params) => (
                    <TextField {...params} label="Супруг(и)" />
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
                    <TextField {...params} label="Дети" />
                  )}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ borderRadius: "10px" }}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disableElevation
            sx={{
              borderRadius: "10px",
              px: 4,
              fontWeight: 600,
              boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Твои модалки и снекбар - оставляем как есть */}
      <CustomDatePickerDialog
        open={birthdayPickerOpen}
        onClose={() => setBirthdayPickerOpen(false)}
        initialDate={form.birthday}
        showTime={true} // включить выбор времени
        onSave={(newDate) =>
          handleChange("birthday")({ target: { value: newDate } })
        }
      />
      <CustomDatePickerDialog
        open={diedPickerOpen}
        onClose={() => setDiedPickerOpen(false)}
        initialDate={form.died}
        showTime={true} // включить выбор времени
        onSave={(newDate) =>
          handleChange("died")({ target: { value: newDate } })
        }
      />

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{ borderRadius: "10px" }}
        >
          Данные сохранены
        </Alert>
      </Snackbar>
    </>
  );
}
