import React from "react";
import { Typography, IconButton, Box, List, ListItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import ManIcon from "@mui/icons-material/Man";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoIcon from "@mui/icons-material/Info";
import FlagIcon from "@mui/icons-material/Flag";
import PublicIcon from "@mui/icons-material/Public";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FaceIcon from "@mui/icons-material/Face";
import nationalities from "./nationalities.json";

import EditIcon from "@mui/icons-material/Edit";
import { alpha, Stack } from "@mui/material";

function getIcon(type) {
  switch (type) {
    case "Рост":
      return <ManIcon />;
    case "Группа крови":
      return <BloodtypeIcon />;
    case "Народность":
      return <PublicIcon />;
    case "Национальность":
      return <FlagIcon />;
    case "Физическое описание":
      return <FaceIcon />;
    case "Цвет волос":
      return <ColorLensIcon />;
    case "Цвет глаз":
      return <VisibilityIcon />;
    case "Цвет кожи":
      return <ColorLensIcon />;
    case "Email":
      return <EmailIcon />;
    case "Номер телефона":
      return <PhoneIcon />;
    default:
      return <InfoIcon />;
  }
}

function getValue(type, value, person) {
  switch (type) {
    case "Рост":
      return value + " см";

    case "Национальность":
      return (
        nationalities.find((n) => n.country === value)[person.gender] || null
      );

    default:
      return value;
  }
}

export default function PersonFacts({ person, facts = [], onAdd, onEdit }) {
  return (
    <Box
      sx={{
        border: "solid 1px",
        borderColor: "divider",
        borderRadius: "15px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      {/* ФОНОВАЯ ИКОНКА (Стиль как в Событиях) */}
      <InfoOutlineIcon
        sx={{
          position: "absolute",
          bottom: -10,
          right: -10,
          fontSize: "150px",
          color: "secondary.main", // Можно использовать цвет secondary для отличия
          opacity: 0.03,
          pointerEvents: "none",
        }}
      />

      {/* ШАПКА БЛОКА */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: "12px 16px",
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.02)"
              : "rgba(0,0,0,0.01)",
          zIndex: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <InfoOutlineIcon sx={{ color: "secondary.main", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Факты ({facts.length})
          </Typography>
        </Stack>

        {onAdd && (
          <IconButton
            onClick={onAdd}
            size="small"
            sx={{ color: "secondary.main" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* СПИСОК ФАКТОВ */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          position: "relative",
          zIndex: 1,
          scrollbarGutter: "stable",
        }}
      >
        {facts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", opacity: 0.5 }}>
            <Typography variant="body2">Фактов пока нет</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {facts.map((fact, index) => (
              <ListItem
                key={index}
                disablePadding
                divider={index !== facts.length - 1}
                sx={{
                  "&:hover .edit-fact-button": {
                    opacity: 1,
                    visibility: "visible",
                  },
                  "&:hover": { bgcolor: "action.hover" },
                  transition: "background 0.2s",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    width: "100%",
                    p: "10px 16px",
                    alignItems: "center", // Факты обычно однострочные, центрируем по вертикали
                    position: "relative",
                  }}
                >
                  {/* ИКОНКА ТИПА ФАКТА */}
                  <Box
                    sx={{
                      mr: 2,
                      display: "flex",
                      p: 0.8,
                      borderRadius: "8px",
                      bgcolor: (theme) =>
                        alpha(theme.palette.secondary.main, 0.05),
                      color: "secondary.main",
                    }}
                  >
                    {getIcon(fact.type)}
                  </Box>

                  {/* КОНТЕНТ ФАКТА */}
                  <Box sx={{ flex: 1, pr: 4 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: "secondary.main",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        display: "block",
                        fontSize: "0.65rem",
                        mb: 0.2,
                      }}
                    >
                      {fact.type}
                    </Typography>

                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ fontWeight: 500, lineHeight: 1.3 }}
                    >
                      {getValue(fact.type, fact.value, person)}
                    </Typography>
                  </Box>

                  {/* КНОПКА РЕДАКТИРОВАНИЯ */}
                  <IconButton
                    className="edit-fact-button"
                    size="small"
                    onClick={() => onEdit(index)}
                    sx={{
                      position: "absolute",
                      right: 8,
                      opacity: 0,
                      visibility: "hidden",
                      transition: "all 0.2s",
                      bgcolor: "background.paper",
                      boxShadow: 1,
                      "&:hover": { bgcolor: "secondary.main", color: "white" },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
