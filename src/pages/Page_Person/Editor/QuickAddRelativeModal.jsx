import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  IconButton,
  alpha,
  useTheme,
  Typography,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

export default function QuickAddRelativeModal({
  open,
  onClose,
  onAdded, // Функция коллбэк, которая передаст созданного человека обратно в Editor
  currentPerson, // Текущий редактируемый человек
  role, // 'father', 'mother', 'spouse', 'child'
  allPeople,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "20px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.8) : "#fff",
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
          fontWeight: 700,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <PersonAddIcon color="primary" fontSize="large" />
          <Typography variant="h6" fontWeight={700}>
            {getRoleTitle()}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            bgcolor: alpha(theme.palette.action.hover, 0.05),
            borderRadius: "10px",
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={3}>
          {/* Акцентный контейнер для основных данных */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: "16px",
              bgcolor: alpha(theme.palette.action.hover, 0.04),
              border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            <Grid container spacing={2.5}>
              {/* ФАМИЛИЯ */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Фамилия"
                  fullWidth
                  size="small"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: "10px" } }}
                />
              </Grid>

              {/* ИМЯ */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Имя"
                  fullWidth
                  size="small"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  InputProps={{ sx: { borderRadius: "10px" } }}
                />
              </Grid>

              {/* ОТЧЕСТВО */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Отчество"
                  fullWidth
                  size="small"
                  value={patronymic}
                  onChange={(e) => setPatronymic(e.target.value)}
                  InputProps={{ sx: { borderRadius: "10px" } }}
                />
              </Grid>

              {/* ДЕВИЧЬЯ ФАМИЛИЯ (если не скрыта) */}
              {!isMaidenNameHidden && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Девичья фамилия"
                    fullWidth
                    size="small"
                    disabled={gender === "male"}
                    value={gender === "male" ? "" : maidenName}
                    onChange={(e) => setMaidenName(e.target.value)}
                    InputProps={{ sx: { borderRadius: "10px" } }}
                  />
                </Grid>
              )}

              {/* ПОЛ (если не скрыт) */}
              {!isGenderHidden && (
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Пол"
                    fullWidth
                    size="small"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    InputProps={{ sx: { borderRadius: "10px" } }}
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            borderRadius: "12px",
                            mt: 1,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                          },
                        },
                      },
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
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: "10px",
            px: 3,
            fontWeight: 600,
            color: "text.secondary",
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disableElevation
          sx={{
            borderRadius: "10px",
            px: 4,
            fontWeight: 600,
            boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.35)}`,
            textTransform: "none",
            fontSize: "0.95rem",
          }}
        >
          Создать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
