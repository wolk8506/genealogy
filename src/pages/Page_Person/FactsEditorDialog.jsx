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

const FACT_TYPES = [
  "Рост",
  "Группа крови",
  "Народность",
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
    case "Народность":
      return <PublicIcon fontSize="small" />;
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

export default function FactsEditorDialog({
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
            onChange={(e) => setType(e.target.value)}
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
          <TextField
            label="Значение"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            size="small"
            placeholder="Напр., O+, blue, 5,9 ft"
            fullWidth
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
