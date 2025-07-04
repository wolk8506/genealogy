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
} from "@mui/material";
import { useState, useEffect, useRef } from "react";

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
  const prevGeneration = useRef(form.generation);

  useEffect(() => {
    if (person) setForm(person);
  }, [person]);

  useEffect(() => {
    if (person?.generation !== undefined) {
      prevGeneration.current = person.generation;
    }
  }, [person]);

  const handleChange = (field) => (e) => {
    let value = e.target.value;

    if (field === "generation") {
      value = Number(value);
      if (
        prevGeneration.current !== undefined &&
        value !== prevGeneration.current
      ) {
        alert(
          "Вы изменили поколение. Это может нарушить связи с родителями, детьми и супругами, так как они зависят от поколения."
        );
        prevGeneration.current = value;
      }
    }

    setForm({ ...form, [field]: value });
  };

  const handleSelect = (field) => (_, value) => {
    setForm({ ...form, [field]: value?.id || null });
  };

  const handleMultiSelect = (field) => (_, values) => {
    setForm({ ...form, [field]: values.map((v) => v.id) });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    const hasName =
      form.firstName?.trim() ||
      form.lastName?.trim() ||
      form.patronymic?.trim() ||
      form.maidenName?.trim();

    if (!hasName) {
      setError(
        "Укажите хотя бы одно из полей: имя, фамилия, отчество или девичья фамилия"
      );
      return;
    }

    const all = [...allPeople];
    const updated = { ...form };

    // Обновляем связи у родителей
    for (const parentId of [form.father, form.mother]) {
      const parent = all.find((p) => p.id === parentId);
      if (parent && !parent.children?.includes(person.id)) {
        parent.children = [...(parent.children || []), person.id];
      }
    }

    // Обновляем связи у детей
    for (const childId of form.children || []) {
      const child = all.find((p) => p.id === childId);
      if (child) {
        if (form.gender === "male") child.father = person.id;
        if (form.gender === "female") child.mother = person.id;
      }
    }

    // Обновляем связи у супругов
    for (const spouseId of form.spouse || []) {
      const spouse = all.find((p) => p.id === spouseId);
      if (spouse && !spouse.spouse?.includes(person.id)) {
        spouse.spouse = [...(spouse.spouse || []), person.id];
      }
    }

    // Обновляем связи у братьев и сестёр
    for (const siblingId of form.siblings || []) {
      const sibling = all.find((p) => p.id === siblingId);
      if (sibling && !sibling.siblings?.includes(person.id)) {
        sibling.siblings = [...(sibling.siblings || []), person.id];
      }
    }

    // Обновляем текущего человека
    const index = all.findIndex((p) => p.id === person.id);
    if (index !== -1) {
      all[index] = updated;
    }

    await window.peopleAPI.saveAll(all);
    setSaved(true);
    onSave?.();
    onClose();
  };

  const getPersonById = (id) => allPeople.find((p) => p.id === id);
  const getLabel = (p) =>
    [p.firstName, p.patronymic, p.lastName].filter(Boolean).join(" ") ||
    `ID ${p.id}`;

  const generation = form.generation ?? person.generation ?? 0;

  const filterByGeneration = (targetGen) =>
    allPeople.filter(
      (p) => p.id !== person.id && (p.generation ?? -999) === targetGen
    );

  const filterSpouses = () =>
    allPeople.filter(
      (p) =>
        p.id !== person.id &&
        (p.generation ?? -999) === generation &&
        p.gender &&
        p.gender !== form.gender
    );
  const filterFathers = () =>
    allPeople.filter(
      (p) =>
        p.id !== person.id &&
        (p.generation ?? -999) === generation - 1 &&
        p.gender === "male"
    );

  const filterMothers = () =>
    allPeople.filter(
      (p) =>
        p.id !== person.id &&
        (p.generation ?? -999) === generation - 1 &&
        p.gender === "female"
    );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать данные</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && <Typography color="error">{error}</Typography>}

            <TextField
              label="Имя"
              value={form.firstName || ""}
              onChange={handleChange("firstName")}
            />
            <TextField
              label="Фамилия"
              value={form.lastName || ""}
              onChange={handleChange("lastName")}
            />
            <TextField
              label="Отчество"
              value={form.patronymic || ""}
              onChange={handleChange("patronymic")}
            />
            <TextField
              label="Девичья фамилия"
              value={form.maidenName || ""}
              onChange={handleChange("maidenName")}
              disabled={form.gender === "male"}
            />
            <TextField
              label="Пол"
              select
              value={form.gender || ""}
              onChange={handleChange("gender")}
            >
              <MenuItem value="male">Мужской</MenuItem>
              <MenuItem value="female">Женский</MenuItem>
            </TextField>

            <TextField
              label="Дата рождения"
              value={form.birthday || ""}
              onChange={handleChange("birthday")}
            />
            <TextField
              label="Дата смерти"
              value={form.died || ""}
              onChange={handleChange("died")}
            />
            <TextField
              label="Поколение"
              type="number"
              value={form.generation || ""}
              onChange={handleChange("generation")}
            />

            <Autocomplete
              options={filterFathers()}
              getOptionLabel={getLabel}
              value={getPersonById(form.father) || null}
              onChange={handleSelect("father")}
              renderInput={(params) => <TextField {...params} label="Отец" />}
            />

            <Autocomplete
              options={filterMothers()}
              getOptionLabel={getLabel}
              value={getPersonById(form.mother) || null}
              onChange={handleSelect("mother")}
              renderInput={(params) => <TextField {...params} label="Мать" />}
            />

            <Autocomplete
              multiple
              options={filterByGeneration(generation).filter(
                (p) => p.id !== person.id
              )}
              getOptionLabel={getLabel}
              value={(form.siblings || []).map(getPersonById).filter(Boolean)}
              onChange={handleMultiSelect("siblings")}
              renderInput={(params) => (
                <TextField {...params} label="Братья и сёстры" />
              )}
            />

            <Autocomplete
              multiple
              options={filterSpouses()}
              getOptionLabel={getLabel}
              value={(form.spouse || []).map(getPersonById).filter(Boolean)}
              onChange={handleMultiSelect("spouse")}
              renderInput={(params) => (
                <TextField {...params} label="Супруг(и)" />
              )}
            />

            <Autocomplete
              multiple
              options={filterByGeneration(generation + 1)}
              getOptionLabel={getLabel}
              value={(form.children || []).map(getPersonById).filter(Boolean)}
              onChange={handleMultiSelect("children")}
              renderInput={(params) => <TextField {...params} label="Дети" />}
            />
          </Stack>
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
        <Alert severity="success" onClose={() => setSaved(false)}>
          Данные сохранены
        </Alert>
      </Snackbar>
    </>
  );
}
