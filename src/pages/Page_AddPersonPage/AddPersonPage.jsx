import React, { useState, useEffect, useRef } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Button,
  Snackbar,
  Alert,
  Autocomplete,
} from "@mui/material";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";

export default function AddPersonPage() {
  const [allPeople, setAllPeople] = useState([]);
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [diedPickerOpen, setDiedPickerOpen] = useState(false);

  // form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [died, setDied] = useState("");
  const [generation, setGeneration] = useState("");
  const [father, setFather] = useState(null);
  const [mother, setMother] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [spouse, setSpouse] = useState([]);
  const [children, setChildren] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const idPrefixRef = useRef("");

  useEffect(() => {
    window.peopleAPI.getAll().then(setAllPeople);
  }, []);

  // метка в списках
  const getLabel = (p) =>
    [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  // фильтр по поколению
  const genNum = Number(generation) || 1;
  const byGen = (g) =>
    allPeople.filter(
      (p) => (p.generation ?? 0) === g && String(p.id).startsWith(String(g))
    );

  // сгенерировать уникальный ID
  const generateId = (gen) => {
    const prefix = String(gen || "");
    idPrefixRef.current = prefix;
    const existing = allPeople
      .map((p) => p.id)
      .filter((id) => String(id).startsWith(prefix))
      .map(Number);
    const max = existing.length
      ? Math.max(...existing)
      : Number(prefix + "0000");
    return max + 1;
  };

  // сохранить вместе с «навороченной» логикой связей
  const handleSave = async () => {
    setError("");
    setSuccess(false);

    // валидация
    if (!gender) {
      setError("Пол обязателен");
      return;
    }
    if (!generation || isNaN(genNum) || genNum < 1) {
      setError("Поколение должно быть числом ≥ 1");
      return;
    }
    const hasName =
      firstName.trim() ||
      lastName.trim() ||
      patronymic.trim() ||
      maidenName.trim();
    if (!hasName) {
      setError("Укажите хотя бы имя, фамилию, отчество или девичью фамилию");
      return;
    }

    // формируем новый объект человека
    const newId = generateId(genNum);
    const newPerson = {
      id: newId,
      gender,
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      maidenName:
        gender === "female" && maidenName.trim()
          ? `(${maidenName.trim()})`
          : null,
      patronymic: patronymic.trim() || null,
      birthday: birthday.trim() || null,
      died: died.trim() || null,
      generation: genNum,
      father: father?.id || null,
      mother: mother?.id || null,
      siblings: siblings.map((p) => p.id),
      spouse: spouse.map((p) => p.id),
      children: children.map((p) => p.id),
      about: [],
    };

    // клонируем всех, добавляем нового
    const all = allPeople.map((p) => ({ ...p }));
    all.push(newPerson);

    // 1) родители ← добавляем ребёнка
    if (newPerson.father) {
      const par = all.find((p) => p.id === newPerson.father);
      if (par && !(par.children || []).includes(newId)) {
        par.children = [...(par.children || []), newId];
      }
    }
    if (newPerson.mother) {
      const par = all.find((p) => p.id === newPerson.mother);
      if (par && !(par.children || []).includes(newId)) {
        par.children = [...(par.children || []), newId];
      }
    }

    // 2) дети → назначаем parent
    newPerson.children.forEach((cid) => {
      const ch = all.find((p) => p.id === cid);
      if (ch) {
        if (gender === "male") ch.father = newId;
        if (gender === "female") ch.mother = newId;
      }
    });

    // 3) супруги ↔ взаимно
    newPerson.spouse.forEach((sid) => {
      const sp = all.find((p) => p.id === sid);
      if (sp && !(sp.spouse || []).includes(newId)) {
        sp.spouse = [...(sp.spouse || []), newId];
      }
    });

    // 4) братья/сёстры ↔ взаимно
    newPerson.siblings.forEach((bid) => {
      const sib = all.find((p) => p.id === bid);
      if (sib && !(sib.siblings || []).includes(newId)) {
        sib.siblings = [...(sib.siblings || []), newId];
      }
    });

    // сохраняем весь массив
    await window.peopleAPI.saveAll(all);
    setSuccess(true);
    setAllPeople(all);

    // сброс формы
    setFirstName("");
    setLastName("");
    setMaidenName("");
    setPatronymic("");
    setGender("");
    setBirthday("");
    setDied("");
    setGeneration("");
    setFather(null);
    setMother(null);
    setSiblings([]);
    setSpouse([]);
    setChildren([]);
  };

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          maxWidth: 600,
          mx: "auto",
          mt: 4,
          p: 3,
          bgcolor: "background.paper",
          borderRadius: "15px",
        }}
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success">Человек успешно добавлен</Alert>
          )}

          {/* <Divider /> */}

          {/* Personal info */}
          <Typography variant="subtitle1">Личные данные</Typography>
          <Stack spacing={2}>
            <TextField
              label="Имя"
              fullWidth
              size="small"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <TextField
              label="Фамилия"
              fullWidth
              size="small"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <TextField
              label="Девичья фамилия"
              fullWidth
              size="small"
              disabled={gender !== "female"}
              value={maidenName}
              onChange={(e) => setMaidenName(e.target.value)}
            />
            <TextField
              label="Отчество"
              fullWidth
              size="small"
              value={patronymic}
              onChange={(e) => setPatronymic(e.target.value)}
            />
            <TextField
              label="Пол"
              select
              fullWidth
              size="small"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <MenuItem value="male">Мужской</MenuItem>
              <MenuItem value="female">Женский</MenuItem>
            </TextField>
          </Stack>

          <Divider />

          {/* Date & generation */}
          <Typography variant="subtitle1">Дата и поколение</Typography>
          <Stack spacing={2}>
            <TextField
              label="Дата рождения"
              fullWidth
              size="small"
              value={birthday}
              onClick={() => setBirthdayPickerOpen(true)}
              InputProps={{ readOnly: true }}
              placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ / неизвестно"
            />
            <TextField
              label="Дата смерти"
              fullWidth
              size="small"
              value={died}
              onClick={() => setDiedPickerOpen(true)}
              InputProps={{ readOnly: true }}
              placeholder="ДД.ММ.ГГГГ / ММ.ГГГГ / ГГГГ / неизвестно"
            />
            <TextField
              label="Поколение"
              type="number"
              fullWidth
              size="small"
              inputProps={{ min: 1 }}
              value={generation}
              onChange={(e) => setGeneration(e.target.value)}
            />
          </Stack>

          {/* модалки */}
          <CustomDatePickerDialog
            open={birthdayPickerOpen}
            onClose={() => setBirthdayPickerOpen(false)}
            initialDate={birthday}
            format="DD.MM.YYYY"
            showTime={true}
            onSave={(newDate) => {
              setBirthday(newDate);
              setBirthdayPickerOpen(false);
            }}
          />

          <CustomDatePickerDialog
            open={diedPickerOpen}
            onClose={() => setDiedPickerOpen(false)}
            initialDate={died}
            format="DD.MM.YYYY"
            showTime={true}
            onSave={(newDate) => {
              setDied(newDate);
              setDiedPickerOpen(false);
            }}
          />

          <Divider />

          {/* Relationships */}
          <Typography variant="subtitle1">Родственные связи</Typography>
          <Stack spacing={2}>
            <Autocomplete
              size="small"
              options={byGen(genNum - 1).filter((p) => p.gender === "male")}
              getOptionLabel={getLabel}
              value={father}
              onChange={(_, v) => setFather(v)}
              renderInput={(params) => (
                <TextField {...params} label="Отец" fullWidth />
              )}
            />
            <Autocomplete
              size="small"
              options={byGen(genNum - 1).filter((p) => p.gender === "female")}
              getOptionLabel={getLabel}
              value={mother}
              onChange={(_, v) => setMother(v)}
              renderInput={(params) => (
                <TextField {...params} label="Мать" fullWidth />
              )}
            />
            <Autocomplete
              size="small"
              multiple
              options={byGen(genNum)}
              getOptionLabel={getLabel}
              value={siblings}
              onChange={(_, v) => setSiblings(v)}
              renderInput={(params) => (
                <TextField {...params} label="Братья/сестры" fullWidth />
              )}
            />
            <Autocomplete
              size="small"
              multiple
              options={byGen(genNum).filter(
                (p) => p.gender && p.gender !== gender
              )}
              getOptionLabel={getLabel}
              value={spouse}
              onChange={(_, v) => setSpouse(v)}
              renderInput={(params) => (
                <TextField {...params} label="Супруг(а)" fullWidth />
              )}
            />
            <Autocomplete
              size="small"
              multiple
              options={byGen(genNum + 1)}
              getOptionLabel={getLabel}
              value={children}
              onChange={(_, v) => setChildren(v)}
              renderInput={(params) => (
                <TextField {...params} label="Дети" fullWidth />
              )}
            />
          </Stack>

          <Divider />

          {/* Save */}
          <Button variant="contained" size="large" onClick={handleSave}>
            Сохранить
          </Button>
        </Stack>
      </Paper>
    </>
  );
}
