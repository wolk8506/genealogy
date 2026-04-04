import React, { useState, useEffect, useRef } from "react";
import { useSnackbar } from "notistack";
import {
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  alpha,
  Box,
  Grid,
  CircularProgress,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
// import { AddBanner } from "./AddBanner";
import NumberField from "../NumberField";
import { useNotificationStore } from "../../store/useNotificationStore";

// Теперь это не Page, а Modal
export default function AddPersonModal({ open, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
  // const [success, setSuccess] = useState(false);
  const idPrefixRef = useRef("");
  // const [newPerson, setNewPerson] = useState(null);

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
    setSaving(true);
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
        type: "error",
      });
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md" // Немного увеличим для удобства двух колонок
        scroll="paper"
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
            justifyContent: "space-between",
            fontWeight: 600,
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <PersonAddIcon color="primary" />
            Добавить человека
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ pt: "20px !important", borderBottom: "none" }}
        >
          <Stack spacing={4}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            {/* Секция 1: Личные данные (2 колонки) */}
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
                <PersonAddIcon sx={{ fontSize: 18 }} /> Личные данные
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Фамилия"
                    size="small"
                    fullWidth
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Имя"
                    size="small"
                    fullWidth
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Отчество"
                    size="small"
                    fullWidth
                    value={patronymic}
                    onChange={(e) => setPatronymic(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Пол"
                    select
                    size="small"
                    fullWidth
                    sx={{ width: "200px" }}
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Девичья фамилия"
                    size="small"
                    fullWidth
                    disabled={gender !== "female"}
                    value={maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                    placeholder="Без скобок"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Секция 2: Даты и поколение (Стиль карточки) */}
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
              <Grid container spacing={2}>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Рождение"
                    size="small"
                    fullWidth
                    value={birthday}
                    onClick={() => setBirthdayPickerOpen(true)}
                    InputProps={{
                      readOnly: true,
                      sx: { borderRadius: "10px" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Смерть"
                    size="small"
                    fullWidth
                    value={died}
                    onClick={() => setDiedPickerOpen(true)}
                    InputProps={{
                      readOnly: true,
                      sx: { borderRadius: "10px" },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  {/* <TextField
                    label="Поколение"
                    size="small"
                    fullWidth
                    type="number"
                    inputProps={{ min: 1 }}
                    value={generation}
                    onChange={(e) => setGeneration(e.target.value)}
                  /> */}
                  <NumberField
                    label="Поколение"
                    size="small"
                    fullWidth
                    min={1}
                    max={20}
                    value={generation}
                    // Попробуйте оба варианта, если один не сработает:
                    // onValueChange={(val) => setGeneration(val)}
                    // onChange={(val) => setGeneration(val)}
                    onValueChange={handleGenerationChange}
                    onChange={handleGenerationChange}
                  />
                </Grid>
              </Grid>
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
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      sx={{ width: "416px" }}
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
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      sx={{ width: "416px" }}
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
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={onClose}
            sx={{ borderRadius: "10px", fontWeight: 600 }}
          >
            Отмена
          </Button>
          {/* <Button
            onClick={handleSave}
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
          </Button> */}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            disableElevation
            sx={{
              borderRadius: "12px",
              px: 4,
              // py: 1.2,
              textTransform: "none",
              fontWeight: 700,
              boxShadow: `0 8px 20px -6px ${alpha(theme.palette.primary.main, 0.5)}`,
              "&:hover": {
                boxShadow: `0 12px 25px -6px ${alpha(theme.palette.primary.main, 0.6)}`,
              },
            }}
          >
            {saving ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Сохранить"
            )}
          </Button>
        </DialogActions>
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
