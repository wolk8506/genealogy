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
} from "@mui/material";
import { Box } from "@mui/material";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import ManIcon from "@mui/icons-material/Man";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoIcon from "@mui/icons-material/Info";
// import PersonIcon from "@mui/icons-material/Person";
import FlagIcon from "@mui/icons-material/Flag";
import PublicIcon from "@mui/icons-material/Public";
import ColorLensIcon from "@mui/icons-material/ColorLens";
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
          borderRadius: "15px",
        },
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {initialFact ? "Редактировать факт" : "Добавить факт"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Тип"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setValue("");
            }}
            size="small"
            sx={{ width: "395px" }} // ширина поля, подбери по вкусу
            SelectProps={{
              // меню (Paper) и рендер выбранного значения
              MenuProps: {
                PaperProps: {
                  sx: { borderRadius: "12px", minWidth: 240 },
                },
              },
              renderValue: (selected) => (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {getIcon(selected)}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected}
                  </Box>
                </Box>
              ),
            }}
          >
            {FACT_TYPES.map((t) => (
              <MenuItem
                key={t}
                value={t}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{getIcon(t)}</ListItemIcon>
                <ListItemText
                  primary={t}
                  primaryTypographyProps={{ noWrap: true }} // запрет переноса в пункте меню
                />
              </MenuItem>
            ))}
          </TextField>
          <FactInput
            type={type}
            value={value}
            setValue={setValue}
            gender={person.gender}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px" }}>
        {initialFact && (
          <Button color="error" onClick={handleDelete} sx={{ mr: "auto" }}>
            Удалить
          </Button>
        )}
        <Button onClick={onClose}>Отмена</Button>

        <Button onClick={handleSave} variant="contained">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
