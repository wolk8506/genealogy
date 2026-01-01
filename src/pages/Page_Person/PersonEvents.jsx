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
import StarIcon from "@mui/icons-material/Star";

import AddIcon from "@mui/icons-material/Add";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import DescriptionIcon from "@mui/icons-material/Description";
import NotesIcon from "@mui/icons-material/Notes";

import CelebrationIcon from "@mui/icons-material/Celebration";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import ElderlyIcon from "@mui/icons-material/Elderly";
import PublicIcon from "@mui/icons-material/Public";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GavelIcon from "@mui/icons-material/Gavel";
import LoginIcon from "@mui/icons-material/Login";
import ChurchIcon from "@mui/icons-material/Church";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AirlineSeatIndividualSuiteIcon from "@mui/icons-material/AirlineSeatIndividualSuite";
import EmojiFlagsIcon from "@mui/icons-material/EmojiFlags";
import HomeIcon from "@mui/icons-material/Home";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SchoolIcon from "@mui/icons-material/School";
import BookmarkRemoveIcon from "@mui/icons-material/BookmarkRemove";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import WorkIcon from "@mui/icons-material/Work";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
// import EventIcon from "@mui/icons-material/Event";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";

import { ageAtEvent } from "./Function_ageAtEvent";
import PersonAvatar from "../../components/PersonAvatar";
function getEventIcon(type) {
  switch (type) {
    case "Бар-мицва":
    case "Бат-мицва":
      return <CelebrationIcon />;
    case "Благословение":
      return <VolunteerActivismIcon />;
    case "Болезнь":
      return <LocalHospitalIcon />;

    // ИСПРАВЛЕНО: Добавлен return и отдельная иконка (Сердце)
    case "Брак":
      return <FavoriteIcon />;

    // ИСПРАВЛЕНО: Добавлен return
    case "Воинская награда":
      return <MilitaryTechIcon />;
    case "Воинская служба":
    case "Призыв на воинскую службу":
      return <MilitaryTechIcon />;

    case "Выкидыш":
      return <HealthAndSafetyIcon color="error" />;
    case "Выход на пенсию":
      return <ElderlyIcon />;
    case "Гражданство, подданство":
      return <PublicIcon />;
    case "Дворянский титул":
      return <WorkspacePremiumIcon />;
    case "Документ на владение":
      return <ReceiptLongIcon />;
    case "Завещание":
    case "Перепись":
      return <AssignmentIcon />;
    case "Земельная сделка":
      return <GavelIcon />;
    case "Иммиграция":
    case "Эмиграция":
      return <LoginIcon />;
    case "Инициация в церкви LDS":
    case "Посвящение в церкви LDS":
      return <ChurchIcon />;
    case "Иное событие":
      return <AutoAwesomeIcon />;
    case "Конфирмация":
    case "Конфирмация в церкви LDS":
      return <VerifiedUserIcon />;
    case "Кремация":
      return <AirlineSeatIndividualSuiteIcon />;
    case "Крещение":
      return <ChurchIcon />;
    case "Крещение в церкви LDS":
      return <ChurchIcon />;
    case "Крещение взрослого":
      return <ChurchIcon />;
    case "Крещение ребёнка":
      return <ChurchIcon />;
    case "Миссия":
      return <EmojiFlagsIcon />;
    case "Место жительства":
      return <HomeIcon />;
    case "Наследственное дело":
      return <AssignmentTurnedInIcon />;
    case "Натурализация":
    case "Рукоположение":
      return <HowToRegIcon />;
    case "Образование":
    case "Обучение":
    case "Окончание учебного заведения":
      return <SchoolIcon />;
    case "Обрезание":
      return <HealthAndSafetyIcon />;
    case "Отлучение от церкви":
      return <BookmarkRemoveIcon color="error" />;
    case "Первое причастие":
      return <BookmarkAddedIcon />;
    case "Погребение":
    case "Похоронная церемония":
      return <Inventory2Icon />;
    case "Прозвище":
      return <AccountCircleIcon />;
    case "Религия":
      return <ChurchIcon />;
    case "Род занятий":
      return <WorkIcon />;
    case "Рождение":
      return <ChildCareIcon />;

    // ДОБАВЛЕНО: Иконка подписи/пера для регистрации брака
    case "Роспись":
      return <HistoryEduIcon />;

    case "Смерть":
      return <HealthAndSafetyIcon color="error" />;
    case "Соединение с родителями LDS":
    case "Усыновление":
      return <PersonAddIcon />;
    case "Увольнение с воинской службы":
      return <PersonRemoveIcon />;
    default:
      return <EventIcon />;
  }
}

export default function PersonEvents({
  birthday,
  events = [],
  onAdd,
  onEdit,
  allPeople,
}) {
  const findById = (id) => allPeople?.find((p) => p.id === id) || null;
  const labelOf = (p) =>
    [p.firstName, p.patronymic, p.lastName].filter(Boolean).join(" ") ||
    `ID ${p.id}`;

  function parseDDMMYYYY(str) {
    if (!str) return null;
    const [day, month, year] = str.split(".");
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const sortedEvents = events
    .map((ev, i) => ({ ...ev, originalIndex: i }))
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      const da = parseDDMMYYYY(a.date);
      const db = parseDDMMYYYY(b.date);
      return da - db;
    });

  return (
    <Box
      // sx={{ minWidth: 260 }}
      sx={{
        border: "solid 1px",
        borderColor: "divider",
        p: 1,
        minWidth: "400px",
        borderRadius: "15px",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="flex-start"
          gap={1}
        >
          <StarIcon />
          <Typography variant="subtitle1">События</Typography>
          <Typography variant="subtitle1">({sortedEvents.length})</Typography>
        </Box>

        {onAdd && (
          <IconButton onClick={onAdd}>
            <AddIcon />
          </IconButton>
        )}
      </Box>

      {sortedEvents.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Событий пока нет
        </Typography>
      ) : (
        <List
          sx={{
            width: "100%",
            bgcolor: "background.paper",
            // bgcolor: "divider",
            maxHeight: 230,
            overflowY: "auto",
            borderRadius: "10px",
          }}
        >
          {sortedEvents.map((ev, index) => (
            <React.Fragment key={index}>
              <ListItem
                button="true"
                onClick={() => onEdit(ev.originalIndex)}
                sx={{
                  borderRadius: "8px",
                  "&:hover": { bgcolor: "action.hover" },
                  pt: 0,
                  pb: 0,
                }}
              >
                <ListItemAvatar>{getEventIcon(ev.type)}</ListItemAvatar>

                <ListItemText
                  primary={
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <span>
                        {ev.type}
                        {ev.date ? ` — ${ev.date}` : ""}
                      </span>
                      {birthday && ev.date && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          {ageAtEvent(birthday, ev.date)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {ev.description && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 0.25,
                          }}
                        >
                          <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {ev.description}
                          </Typography>
                        </Box>
                      )}

                      {ev.notes && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 0.25,
                          }}
                        >
                          <NotesIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {ev.notes}
                          </Typography>
                        </Box>
                      )}

                      {ev.place && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mt: 0.25,
                          }}
                        >
                          <PlaceIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {ev.place}
                          </Typography>
                        </Box>
                      )}

                      {ev.participants?.length > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          {ev.participants.map((pid) => {
                            const person = findById(pid);
                            if (!person) return null;
                            return (
                              <Box
                                key={pid}
                                display="flex"
                                alignItems="center"
                                sx={{ mt: 0.25 }}
                              >
                                <PersonAvatar personId={person.id} size={20} />
                                <Typography
                                  component="span"
                                  ml={2}
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {labelOf(person)}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{
                    component: "div",
                    fontWeight: "bold",
                  }}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>

              {index < sortedEvents.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
}
