import React, { useEffect, useState } from "react";
import {
  Dialog,
  Stack,
  TextField,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Autocomplete,
  Typography,
  Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

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
import NumberField from "../../../components/NumberField";
import DialogActionButton, {
  DialogActionsBar,
} from "../../../components/Dialog/DialogActionButton";
import useDialogSaveHotkey from "../../../hooks/useDialogSaveHotkey";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "12px" },
};

const sectionLabelSx = {
  display: "block",
  mb: 1,
  fontWeight: 700,
  color: "text.secondary",
};

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
        // <TextField
        //   label="Рост (см)"
        //   type="number"
        //   inputProps={{ step: 0.1, min: 45, max: 300 }}
        //   value={value}
        //   onChange={(e) => setValue(e.target.value)}
        //   size="small"
        //   placeholder="Напр., 175.5"
        //   fullWidth
        // />
        <NumberField
          label="Рост (см)"
          // type="number"
          step={0.1}
          min={45}
          max={300}
          value={value}
          onValueChange={(val) => setValue(val)}
          onChange={(val) => setValue(val)}
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
    const v = value;
    if (!v) return;

    onSave?.({ type, value: v });
    onClose?.();
  };

  useDialogSaveHotkey({ open, onSave: handleSave });

  const handleDelete = () => {
    onDelete?.();
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 440,
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
          {initialFact ? "Редактировать факт" : "Новый факт"}
        </Typography>

        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" sx={sectionLabelSx}>
              Категория
            </Typography>
            <TextField
              select
              label="Категория"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setValue("");
              }}
              size="small"
              fullWidth
              sx={fieldSx}
              SelectProps={{
                renderValue: (selected) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        color: "primary.main",
                        bgcolor: "action.selected",
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
                    gap: 1,
                    mx: 1,
                    my: 0.5,
                    borderRadius: "8px",
                    "&.Mui-selected": { bgcolor: "action.selected" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: "primary.main" }}>
                    {getIcon(t)}
                  </ListItemIcon>
                  <ListItemText primary={t} />
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography variant="overline" sx={sectionLabelSx}>
              Значение
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: (t) => alpha(t.palette.action.hover, 0.04),
                border: (t) => `1px dashed ${alpha(t.palette.divider, 0.2)}`,
              }}
            >
              <FactInput
                type={type}
                value={value}
                setValue={setValue}
                gender={person.gender}
              />
            </Box>
          </Box>
        </Stack>
      </Box>

      <DialogActionsBar>
        {initialFact && (
          <DialogActionButton tone="danger" onClick={handleDelete}>
            Удалить
          </DialogActionButton>
        )}
        <DialogActionButton onClick={onClose}>Отмена</DialogActionButton>
        <DialogActionButton tone="primary" onClick={handleSave}>
          {initialFact ? "Обновить" : "Сохранить"}
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
