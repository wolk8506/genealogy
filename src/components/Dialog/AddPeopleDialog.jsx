import React, { useState, useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import {
  Stack,
  Typography,
  TextField,
  MenuItem,
  Alert,
  Autocomplete,
  Dialog,
  Box,
  Grid,
  CircularProgress,
} from "@mui/material";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import NumberField from "../NumberField";
import DialogActionButton, {
  DialogActionsBar,
} from "./DialogActionButton";
import { useNotificationStore } from "../../store/useNotificationStore";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
};

const sectionLabelSx = {
  display: "block",
  mb: 1,
  fontWeight: 700,
  color: "text.secondary",
};

export default function AddPersonModal({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
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
  const [generation, setGeneration] = useState(null);
  const [father, setFather] = useState(null);
  const [mother, setMother] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [spouse, setSpouse] = useState([]);
  const [children, setChildren] = useState([]);
  const [saving, setSaving] = useState(false); // Состояние загрузки

  const [error, setError] = useState("");
  const idPrefixRef = useRef("");

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const resetFields = () => {
    // Сброс полей
    setFirstName("");
    setLastName("");
    setMaidenName("");
    setPatronymic("");
    setGender("");
    setBirthday("");
    setDied("");
    setGeneration(null);
    setFather(null);
    setMother(null);
    setSiblings([]);
    setSpouse([]);
    setChildren([]);
  };

  // Загружаем данные при открытии модалки
  useEffect(() => {
    if (open) {
      window.peopleAPI.getAll().then(setAllPeople);
      // setSuccess(false);
      setError("");
      resetFields(); // Очищаем данные по открытию модалки
    }
  }, [open]);

  const getLabel = (p) =>
    [`${p.id} ::`, p.firstName, p.patronymic, p.lastName || p.maidenName]
      .filter(Boolean)
      .join(" ") || `ID ${p.id}`;

  const genNum = Number(generation) || 1;
  const byGen = (g) =>
    allPeople.filter(
      (p) => (p.generation ?? 0) === g && String(p.id).startsWith(String(g)),
    );

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

  // ТОЧЕЧНЫЙ СБРОС СВЯЗЕЙ ПРИ ИЗМЕНЕНИИ ПОКОЛЕНИЯ
  const handleGenerationChange = (val) => {
    if (val !== generation) {
      setGeneration(val);
      // Сбрасываем только родственные связи, так как они зависят от поколения
      setFather(null);
      setMother(null);
      setSpouse([]);
      setChildren([]);
      setSiblings([]);
    }
  };

  const handleSave = async () => {
    setError("");
    // ... (Вся ваша логика handleSave остается идентичной)
    if (!gender) {
      setError("Пол обязателен");
      enqueueSnackbar("Пол обязателен", {
        variant: "error",
      });
      return;
    }
    if (!generation || isNaN(genNum) || genNum < 1) {
      setError("Поколение должно быть числом ≥ 1");
      enqueueSnackbar("Поколение должно быть числом ≥ 1", {
        variant: "error",
      });
      return;
    }
    const hasName =
      firstName.trim() ||
      lastName.trim() ||
      patronymic.trim() ||
      maidenName.trim();
    if (!hasName) {
      setError("Укажите хотя бы имя, фамилию, отчество или девичью фамилию");
      enqueueSnackbar(
        "Укажите хотя бы имя, фамилию, отчество или девичью фамилию",
        {
          variant: "error",
        },
      );
      return;
    }

    const newId = generateId(genNum);
    const now = new Date().toISOString();
    setSaving(true);

    const newPersonObj = {
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
      createdAt: now,
      editedAt: now,
    };

    const all = allPeople.map((p) => ({ ...p }));
    all.push(newPersonObj);
    // setNewPerson(newPersonObj);

    // 1.1) родители ← добавляем ребёнка
    if (newPersonObj.father) {
      const par = all.find((p) => p.id === newPersonObj.father);
      if (par && !(par.children || []).includes(newId)) {
        par.children = [...(par.children || []), newId];
        par.editedAt = now;
      }
    }

    // 1.2) родители ← добавляем ребёнка
    if (newPersonObj.mother) {
      const par = all.find((p) => p.id === newPersonObj.mother);
      if (par && !(par.children || []).includes(newId)) {
        par.children = [...(par.children || []), newId];
        par.editedAt = now;
      }
    }

    // 2) дети → назначаем parent
    newPersonObj.children.forEach((cid) => {
      const ch = all.find((p) => p.id === cid);
      if (ch) {
        if (gender === "male") ch.father = newId;
        if (gender === "female") ch.mother = newId;
        ch.editedAt = now;
      }
    });

    // 3) супруги ↔ взаимно
    newPersonObj.spouse.forEach((sid) => {
      const sp = all.find((p) => p.id === sid);
      if (sp && !(sp.spouse || []).includes(newId)) {
        sp.spouse = [...(sp.spouse || []), newId];
        sp.editedAt = now;
      }
    });

    // 4) братья/сёстры ↔ взаимно
    newPersonObj.siblings.forEach((bid) => {
      const sib = all.find((p) => p.id === bid);
      if (sib && !(sib.siblings || []).includes(newId)) {
        sib.siblings = [...(sib.siblings || []), newId];
        sib.editedAt = now;
      }
    });

    try {
      await window.peopleAPI.saveAll(all);
      addNotification({
        timestamp: now,
        title: "Человек добавлен",
        message: `В дерево успешно добавлен: ${firstName.trim()} ${lastName.trim()}`,
        type: "success",
        category: "people",
        // Если у вас есть роутинг, можно передать линк на карточку:
        link: `/person/${newId}`,
      });
      enqueueSnackbar(
        `Человек успешно добавлен: ${firstName.trim()} ${lastName.trim()}`,
        {
          variant: "success",
        },
      );
      // setSuccess(true);
      setAllPeople(all);

      // Сброс полей
      resetFields();

      // Закрываем модалку через небольшую паузу или сразу
      onClose();
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError("Ошибка при сохранении данных");
      enqueueSnackbar("Ошибка при сохранении данных", {
        variant: "error",
      });

      // Опционально: уведомление об ошибке
      addNotification({
        timestamp: now,
        title: "Ошибка сохранения",
        message: "не удалось обновить базу данных",
        category: "people",
        type: "error",
      });
      setSaving(false);
    }
  };

  useDialogSaveHotkey({ open, onSave: handleSave, disabled: saving });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        transitionDuration={{ enter: 180, exit: 140 }}
        PaperProps={{
          sx: {
            borderRadius: "24px",
            backgroundImage: "none",
            width: 600,
            maxWidth: "94vw",
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography
            variant="h6"
            sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
          >
            Добавить человека
          </Typography>

          {error && (
            <Alert severity="error" sx={{ borderRadius: "12px", mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            {/* Секция 1: Личные данные */}
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Личные данные
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Фамилия"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Имя"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Отчество"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={patronymic}
                    onChange={(e) => setPatronymic(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Пол"
                    select
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    InputProps={{
                      startAdornment: gender && (
                        <Box
                          sx={{
                            mr: 1,
                            display: "flex",
                            color: "action.active",
                          }}
                        >
                          {gender === "male" ? (
                            <MaleIcon fontSize="small" />
                          ) : (
                            <FemaleIcon fontSize="small" />
                          )}
                        </Box>
                      ),
                    }}
                  >
                    <MenuItem value="male">Мужской</MenuItem>
                    <MenuItem value="female">Женский</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Девичья фамилия"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    disabled={gender !== "female"}
                    value={maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                    placeholder="Без скобок"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Секция 2: Даты и поколение */}
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Даты и поколение
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4.4 }}>
                  <TextField
                    label="Рождение"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={birthday}
                    onClick={() => setBirthdayPickerOpen(true)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4.4 }}>
                  <TextField
                    label="Смерть"
                    size="small"
                    fullWidth
                    sx={fieldSx}
                    value={died}
                    onClick={() => setDiedPickerOpen(true)}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3.2 }}>
                  <NumberField
                    label="Поколение"
                    size="small"
                    fullWidth
                    min={1}
                    max={20}
                    value={generation}
                    onValueChange={handleGenerationChange}
                    onChange={handleGenerationChange}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Секция 3: Родственные связи */}
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Родственные связи
              </Typography>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      sx={fieldSx}
                      size="small"
                      options={byGen(genNum - 1).filter(
                        (p) => p.gender === "male",
                      )}
                      getOptionLabel={getLabel}
                      value={father}
                      onChange={(_, v) => setFather(v)}
                      renderInput={(params) => (
                        <TextField {...params} label="Отец" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Autocomplete
                      sx={fieldSx}
                      size="small"
                      options={byGen(genNum - 1).filter(
                        (p) => p.gender === "female",
                      )}
                      getOptionLabel={getLabel}
                      value={mother}
                      onChange={(_, v) => setMother(v)}
                      renderInput={(params) => (
                        <TextField {...params} label="Мать" />
                      )}
                    />
                  </Grid>
                </Grid>
                {/* <Autocomplete
                  size="small"
                  multiple
                  options={byGen(genNum)}
                  getOptionLabel={getLabel}
                  value={siblings}
                  onChange={(_, v) => setSiblings(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Братья / сестры" />
                  )}
                /> */}
                <Autocomplete
                  size="small"
                  multiple
                  sx={fieldSx}
                  options={byGen(genNum).filter(
                    (p) => p.gender && p.gender !== gender,
                  )}
                  getOptionLabel={getLabel}
                  value={spouse}
                  onChange={(_, v) => setSpouse(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Супруг(а)" />
                  )}
                />
                <Autocomplete
                  size="small"
                  multiple
                  sx={fieldSx}
                  options={byGen(genNum + 1).filter((p) => {
                    if (gender === "male") return !p.father;
                    if (gender === "female") return !p.mother;
                    return true; // Пока пол не выбран, показываем всех из поколения
                  })}
                  getOptionLabel={getLabel}
                  value={children}
                  onChange={(_, v) => setChildren(v)}
                  renderInput={(params) => (
                    <TextField {...params} label="Дети" />
                  )}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>

        <DialogActionsBar>
          <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
          <DialogActionButton
            tone="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Сохранить"
            )}
          </DialogActionButton>
        </DialogActionsBar>
      </Dialog>

      {/* Пикеры дат вынесены из Dialog для корректного отображения слоев */}
      <CustomDatePickerDialog
        open={birthdayPickerOpen}
        onClose={() => setBirthdayPickerOpen(false)}
        initialDate={birthday}
        onSave={(newDate) => {
          setBirthday(newDate);
          setBirthdayPickerOpen(false);
        }}
      />
      <CustomDatePickerDialog
        open={diedPickerOpen}
        onClose={() => setDiedPickerOpen(false)}
        initialDate={died}
        onSave={(newDate) => {
          setDied(newDate);
          setDiedPickerOpen(false);
        }}
      />

      {/* <AddBanner isOpen={success} newPerson={newPerson} /> */}
    </>
  );
}
