import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Stack,
  MenuItem,
  Alert,
} from "@mui/material";

export default function AddPersonPage() {
  const [allPeople, setAllPeople] = useState([]);
  const [gender, setGender] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [birthday, setBirthday] = useState("");
  const [died, setDied] = useState("");
  const [generation, setGeneration] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    window.peopleAPI.getAll().then(setAllPeople);
  }, []);

  const generateId = (gen) => {
    const prefix = String(gen);
    const existing = allPeople
      .map((p) => p.id)
      .filter((id) => String(id).startsWith(prefix))
      .map((id) => Number(id));
    const max = existing.length
      ? Math.max(...existing)
      : Number(prefix + "0000");
    return max + 1;
  };

  const handleSave = async () => {
    setError("");
    setSuccess(false);

    if (!gender) {
      setError("Пол обязателен");
      return;
    }

    if (!generation || isNaN(Number(generation))) {
      setError("Поколение должно быть числом");
      return;
    }

    const hasName =
      firstName.trim() ||
      lastName.trim() ||
      patronymic.trim() ||
      maidenName.trim();

    if (!hasName) {
      setError(
        "Укажите хотя бы одно из полей: имя, фамилия, отчество или девичья фамилия"
      );
      return;
    }

    const id = generateId(generation);
    const person = {
      id,
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
      children: [],
      siblings: [],
      spouse: [],
      generation: Number(generation),
      father: null,
      mother: null,
      about: [],
    };

    await window.peopleAPI.savePerson(person);
    setSuccess(true);
    setFirstName("");
    setLastName("");
    setMaidenName("");
    setPatronymic("");
    setBirthday("");
    setDied("");
    setGender("");
    setGeneration("");
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 500, mx: "auto", mt: 4 }}>
      <Typography variant="h5">Добавить человека</Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">Человек успешно добавлен</Alert>}

      <TextField
        label="Имя"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />
      <TextField
        label="Фамилия"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <TextField
        label="Девичья фамилия"
        value={maidenName}
        onChange={(e) => setMaidenName(e.target.value)}
        disabled={gender !== "female"}
      />
      <TextField
        label="Отчество"
        value={patronymic}
        onChange={(e) => setPatronymic(e.target.value)}
      />

      <TextField
        label="Пол"
        select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      >
        <MenuItem value="">Не выбрано</MenuItem>
        <MenuItem value="male">Мужской</MenuItem>
        <MenuItem value="female">Женский</MenuItem>
      </TextField>

      <TextField
        label="Поколение"
        type="number"
        value={generation}
        onChange={(e) => setGeneration(e.target.value)}
      />

      <TextField
        label="Дата рождения"
        placeholder="например: 1985 или 1985-07 или 1985-07-12"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
      />
      <TextField
        label="Дата смерти"
        placeholder="например: 2020 или 2020-11"
        value={died}
        onChange={(e) => setDied(e.target.value)}
      />

      <Button variant="contained" onClick={handleSave}>
        Сохранить
      </Button>
    </Stack>
  );
}
