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
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Typography,
} from "@mui/material";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

// ICON
import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import ManIcon from "@mui/icons-material/Man";
import InfoIcon from "@mui/icons-material/Info";
import FlagIcon from "@mui/icons-material/Flag";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FaceIcon from "@mui/icons-material/Face";

import nationalities from "./nationalities.json";

const FACT_TYPES = [
  "Рост",
  "Группа крови",
  // "Народность",
  "Национальность",
  "Физическое описание",
  "Цвет волос",
  "Цвет глаз",
  "Цвет кожи",
  "Email",
  "Номер телефона",
];

function getIcon(type) {
  // Возвращаем иконку для заданного типа; используем компактный размер
  switch (type) {
    case "Рост":
      return <ManIcon fontSize="small" />;
    case "Группа крови":
      return <BloodtypeIcon fontSize="small" />;
    // case "Народность":
    //   return <PublicIcon fontSize="small" />;
    case "Национальность":
      return <FlagIcon fontSize="small" />;
    case "Физическое описание":
      return <FaceIcon fontSize="small" />;
    case "Цвет волос":
      return <ColorLensIcon fontSize="small" />;
    case "Цвет глаз":
      return <VisibilityIcon fontSize="small" />;
    case "Цвет кожи":
      return <ColorLensIcon fontSize="small" />;
    case "Email":
      return <EmailIcon fontSize="small" />;
    case "Номер телефона":
      return <PhoneIcon fontSize="small" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
}

// Справочники для списков
const BLOOD_GROUPS = [
  { code: "A", roman: "II" },
  { code: "B", roman: "III" },
  { code: "AB", roman: "IV" },
  { code: "O", roman: "I" },
];
const BLOOD_RHESUS = ["Rh+", "Rh-"];
const HAIR_COLORS = [
  "Черный",
  "Темно-каштановый",
  "Темно-пепельный",
  "Шатен",
  "Светло-каштановый",
  "Темно-русый",
  "Русый",
  "Светло-русый",
  "Пепельный блондин",
  "Золотистый блондин",
  "Платиновый блондин",
  "Рыжий",
  "Медный",
  "Седой",
  "Соль с перцем",
  "Окрашенный/Яркий цвет",
  "Лысый / Брит наголо",
];
const EYE_COLORS = [
  "Черные",
  "Темно-карие",
  "Карие",
  "Светло-карие (Янтарные)",
  "Ореховые (Болотные)",
  "Зеленые",
  "Серо-зеленые",
  "Голубые",
  "Серо-голубые",
  "Серые",
  "Синие",
  "Гетерохромия (Разный цвет)",
];
const SKIN_COLORS = [
  "Очень светлая (Фарфоровая)",
  "Светлая (Европейская)",
  "Средняя (Бежевая)",
  "Оливковая",
  "Смуглая (Золотистая)",
  "Темно-коричневая",
  "Черная (Глубокая)",
];

function FactInput({ type, value, setValue, gender }) {
  switch (type) {
    case "Рост":
      return (
        <TextField
          label="Рост (см)"
          type="number"
          inputProps={{ step: 0.1, min: 10 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          placeholder="Напр., 175.5"
          fullWidth
        />
      );

    case "Группа крови": {
      // Разбираем строку вида "AB(IV) Rh+"
      const [groupPart, rhesusPart] = value.split(" "); // Извлекаем код группы до скобки
      const codeMatch = groupPart?.match(/^[A-Z]+/);
      const currentCode = codeMatch ? codeMatch[0] : "";
      return (
        <Stack direction="row" spacing={2}>
          {" "}
          <TextField
            select
            label="Группа крови"
            value={currentCode}
            onChange={(e) => {
              const g = BLOOD_GROUPS.find((x) => x.code === e.target.value);
              setValue(`${g.code}(${g.roman}) ${rhesusPart || ""}`);
            }}
            size="small"
            fullWidth
          >
            {" "}
            {BLOOD_GROUPS.map((g) => (
              <MenuItem key={g.code} value={g.code}>
                {" "}
                {g.code} ({g.roman}){" "}
              </MenuItem>
            ))}{" "}
          </TextField>{" "}
          <TextField
            select
            label="Резус"
            value={rhesusPart || ""}
            onChange={(e) => {
              const g =
                BLOOD_GROUPS.find((x) => x.code === currentCode) ||
                BLOOD_GROUPS[0];
              setValue(`${g.code}(${g.roman}) ${e.target.value}`);
            }}
            size="small"
            fullWidth
          >
            {" "}
            {BLOOD_RHESUS.map((r) => (
              <MenuItem key={r} value={r}>
                {" "}
                {r}{" "}
              </MenuItem>
            ))}{" "}
          </TextField>{" "}
        </Stack>
      );
    }

    case "Цвет волос":
      return (
        <Autocomplete
          freeSolo
          options={HAIR_COLORS}
          value={value}
          onChange={(e, newValue) => setValue(newValue || "")}
          onInputChange={(e, newInputValue) => setValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Цвет волос"
              size="small"
              placeholder="Введите или выберите цвет"
              fullWidth
            />
          )}
        />
      );

    case "Цвет глаз":
      return (
        <Autocomplete
          freeSolo
          options={EYE_COLORS}
          value={value}
          onChange={(e, newValue) => setValue(newValue || "")}
          onInputChange={(e, newInputValue) => setValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Цвет глаз"
              size="small"
              placeholder="Введите или выберите цвет"
              fullWidth
            />
          )}
        />
      );

    case "Цвет кожи":
      return (
        <TextField
          select
          label="Цвет кожи"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          fullWidth
        >
          {SKIN_COLORS.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
      );

    case "Национальность":
      return (
        <Autocomplete
          options={nationalities}
          getOptionLabel={(option) =>
            gender === "female" ? option.female : option.male
          }
          value={nationalities.find((n) => n.country === value) || null}
          onChange={(e, newValue) => {
            if (newValue) {
              setValue(newValue.country);
            } else {
              setValue("");
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Национальность"
              size="small"
              placeholder="Введите или выберите национальность"
              fullWidth
            />
          )}
        />
      );

    case "Email":
      return (
        <TextField
          label="Email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          placeholder="example@mail.com"
          fullWidth
        />
      );

    case "Номер телефона":
      return (
        <TextField
          label="Телефон"
          type="tel"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          placeholder="+380..."
          fullWidth
        />
      );

    default:
      return (
        <TextField
          label={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="small"
          placeholder={`Введите ${type.toLowerCase()}`}
          fullWidth
        />
      );
  }
}

export default function FactsEditorDialog({
  person,
  open,
  onClose,
  initialFact,
  onSave,
  onDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [type, setType] = useState(FACT_TYPES[0]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setType(initialFact?.type ?? FACT_TYPES[0]);
      setValue(initialFact?.value ?? "");
    }
  }, [open, initialFact]);

  const handleSave = () => {
    const v = value.trim();
    if (!v) return;

    onSave?.({ type, value: v });
    onClose?.();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          backgroundImage: "none", // Убираем стандартное наложение в темной теме
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.9) : "#fff",
          backdropFilter: "blur(10px)", // Эффект размытия фона за диалогом
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[20],
        },
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 1,
          fontWeight: 600,
        }}
      >
        {initialFact ? (
          <EditNoteIcon color="primary" fontSize="large" />
        ) : (
          <AddCircleOutlineIcon color="primary" fontSize="large" />
        )}
        {initialFact ? "Редактировать факт" : "Новый факт"}
      </DialogTitle>

      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={3}>
          {" "}
          {/* Увеличили расстояние для "воздуха" */}
          <TextField
            select
            label="Выберите категорию"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setValue("");
            }}
            size="small"
            fullWidth
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    borderRadius: "16px",
                    mt: 1,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                },
              },
              renderValue: (selected) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      p: 0.5,
                      borderRadius: "8px",
                    }}
                  >
                    {getIcon(selected)}
                  </Box>
                  <Typography variant="body2" fontWeight={500}>
                    {selected}
                  </Typography>
                </Box>
              ),
            }}
          >
            {FACT_TYPES.map((t) => (
              <MenuItem
                key={t}
                value={t}
                sx={{
                  mx: 1,
                  my: 0.5,
                  borderRadius: "8px",
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 38, color: theme.palette.primary.main }}
                >
                  {getIcon(t)}
                </ListItemIcon>
                <ListItemText primary={t} />
              </MenuItem>
            ))}
          </TextField>
          {/* Контейнер для FactInput, чтобы добавить ему легкий акцент */}
          <Box
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.action.hover, 0.04),
              border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
            }}
          >
            <FactInput
              type={type}
              value={value}
              setValue={setValue}
              gender={person.gender}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        {initialFact && (
          <Button
            variant="text"
            color="error"
            onClick={handleDelete}
            sx={{ mr: "auto", borderRadius: "10px" }}
          >
            Удалить
          </Button>
        )}
        <Button onClick={onClose} sx={{ borderRadius: "10px", px: 3 }}>
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
            boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
          }}
        >
          {initialFact ? "Обновить" : "Добавить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
