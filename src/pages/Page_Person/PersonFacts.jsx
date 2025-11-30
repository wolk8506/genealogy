import React from "react";
import {
  Typography,
  IconButton,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import ManIcon from "@mui/icons-material/Man";
import VisibilityIcon from "@mui/icons-material/Visibility";
import InfoIcon from "@mui/icons-material/Info";
import PersonIcon from "@mui/icons-material/Person";
import FlagIcon from "@mui/icons-material/Flag";
import PublicIcon from "@mui/icons-material/Public";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import FaceIcon from "@mui/icons-material/Face";

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

export default function PersonFacts({ facts = [], onAdd, onEdit }) {
  return (
    <Box sx={{ minWidth: 300 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <Typography variant="subtitle1">Факты</Typography>
        {onAdd && (
          <IconButton onClick={onAdd}>
            <AddIcon />
          </IconButton>
        )}
      </Box>

      {facts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Фактов пока нет
        </Typography>
      ) : (
        <List
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            maxHeight: 230, // фиксируем высоту
            overflowY: "auto", // включаем вертикальный скролл
            borderRadius: "15px",
          }}
        >
          {facts.map((fact, index) => (
            <React.Fragment key={index}>
              <ListItem
                alignItems="center"
                button="true"
                onClick={() => onEdit(index)}
                sx={{
                  borderRadius: "8px",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                  pt: 0,
                  pb: 0,
                }}
              >
                <ListItemAvatar>{getIcon(fact.type)}</ListItemAvatar>
                <ListItemText
                  primary={fact.type}
                  secondary={fact.value}
                  primaryTypographyProps={{ fontWeight: "bold" }}
                />
              </ListItem>
              {index < facts.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
}
