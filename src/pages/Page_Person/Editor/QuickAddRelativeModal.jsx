import React, { useState, useEffect } from "react";
import {
  Dialog,
  TextField,
  MenuItem,
  Grid,
  Box,
  alpha,
  useTheme,
  Typography,
  Stack,
} from "@mui/material";
import FemaleIcon from "@mui/icons-material/Female";
import MaleIcon from "@mui/icons-material/Male";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import useDialogSaveHotkey from "../../../hooks/useDialogSaveHotkey";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
};

export default function QuickAddRelativeModal({
  open,
  onClose,
  onAdded, // Функция коллбэк, которая передаст созданного человека обратно в Editor
  currentPerson, // Текущий редактируемый человек
  role, // 'father', 'mother', 'spouse', 'child'
  allPeople,
}) {
  const theme = useTheme();

  // Состояния формы
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [maidenName, setMaidenName] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [died, setDied] = useState("");
  const [generation, setGeneration] = useState(1);

  // Инициализация полей на основе таблицы (table.md)
  useEffect(() => {
    if (open && currentPerson && role) {
      // 1. Поколение (всегда скрыто)
      const curGen = Number(currentPerson.generation) || 1;
      let targetGen = curGen;
      if (role === "father" || role === "mother") targetGen = curGen - 1;
      if (role === "child") targetGen = curGen + 1;
      setGeneration(targetGen);

      // 2. Пол (Скрыт для родителей и супругов, открыт для детей)
      let targetGender = "";
      if (role === "father") targetGender = "male";
      if (role === "mother") targetGender = "female";
      if (role === "spouse")
        targetGender = currentPerson.gender === "male" ? "female" : "male";
      setGender(targetGender);

      // 3. Фамилия (Предзаполнена для всех)
      // Обычно берем фамилию текущего человека как базовую
      setLastName(currentPerson.lastName || "");

      // 4. Отчество (Для ребенка, если отец известен)
      if (
        role === "child" &&
        currentPerson.gender === "male" &&
        currentPerson.firstName
      ) {
        // Подсказка, которую пользователь сможет стереть или дописать
        setPatronymic(currentPerson.firstName);
      } else {
        setPatronymic("");
      }

      // Сброс остальных полей
      setFirstName("");
      setMaidenName("");
      setBirthday("");
      setDied("");
    }
  }, [open, currentPerson, role]);

  // Генерация нового ID
  const generateId = (gen) => {
    const prefix = String(gen || "");
    const existing = allPeople
      .map((p) => p.id)
      .filter((id) => String(id).startsWith(prefix))
      .map(Number);
    const max = existing.length
      ? Math.max(...existing)
      : Number(prefix + "0000");
    return max + 1;
  };

  const handleSave = async () => {
    if (!firstName.trim() && !lastName.trim()) {
      alert("Укажите хотя бы Имя или Фамилию");
      return;
    }
    if (!gender) {
      alert("Укажите пол");
      return;
    }

    const newId = generateId(generation);
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
      generation: Number(generation),
      father: null,
      mother: null,
      siblings: [],
      spouse: [],
      children: [],
      createdAt: now,
      editedAt: now,
    };

    // ВАЖНО: Запрашиваем свежую базу перед сохранением, чтобы не затереть другие изменения!
    const freshPeople = await window.peopleAPI.getAll();
    const updatedPeople = [...freshPeople, newPersonObj];
    await window.peopleAPI.saveAll(updatedPeople);

    // Передаем созданного человека в Editor для авто-привязки
    onAdded(newPersonObj);
    onClose();
  };

  useDialogSaveHotkey({ open, onSave: handleSave });

  // Вычисляем видимость полей на основе role
  const isGenderHidden = ["father", "mother", "spouse"].includes(role);
  const isMaidenNameHidden =
    role === "father" || (role === "spouse" && gender === "male");

  const getRoleTitle = () => {
    switch (role) {
      case "father":
        return "Добавить отца";
      case "mother":
        return "Добавить мать";
      case "spouse":
        return currentPerson.gender === "male"
          ? "Добавить супругу"
          : "Добавить супруга";
      case "child":
        return "Добавить ребенка";
      default:
        return "Добавить родственника";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 600,
          maxWidth: "94vw",
          maxHeight: "calc(100vh - 64px)",
          borderRadius: "24px",
          backgroundImage: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2, overflowY: "auto" }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 3 }}
        >
          {getRoleTitle()}
        </Typography>

        <Stack spacing={2}>
          {/* Акцентный контейнер для основных данных */}
          <Box
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: alpha(theme.palette.action.hover, 0.04),
              border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            <Grid container spacing={2}>
              {/* ФАМИЛИЯ */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Фамилия"
                  fullWidth
                  sx={fieldSx}
                  size="small"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Grid>

              {/* ИМЯ */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Имя"
                  fullWidth
                  sx={fieldSx}
                  size="small"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </Grid>

              {/* ОТЧЕСТВО */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Отчество"
                  fullWidth
                  sx={fieldSx}
                  size="small"
                  value={patronymic}
                  onChange={(e) => setPatronymic(e.target.value)}
                />
              </Grid>

              {/* ДЕВИЧЬЯ ФАМИЛИЯ (если не скрыта) */}
              {!isMaidenNameHidden && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Девичья фамилия"
                    fullWidth
                    sx={fieldSx}
                    size="small"
                    disabled={gender === "male"}
                    value={gender === "male" ? "" : maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                  />
                </Grid>
              )}

              {/* ПОЛ (если не скрыт) */}
              {!isGenderHidden && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    label="Пол"
                    fullWidth
                    sx={fieldSx}
                    size="small"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    SelectProps={{
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
                    <MenuItem
                      value="male"
                      sx={{ mx: 1, my: 0.5, borderRadius: "8px" }}
                    >
                      Мужской
                    </MenuItem>
                    <MenuItem
                      value="female"
                      sx={{ mx: 1, my: 0.5, borderRadius: "8px" }}
                    >
                      Женский
                    </MenuItem>
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            * Новый человек будет создан с автоматическим расчетом поколения на
            основе текущего профиля.
          </Typography>
        </Stack>
      </Box>

      <DialogActionsBar>
        <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
        <DialogActionButton tone="primary" onClick={handleSave}>
          Создать
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
