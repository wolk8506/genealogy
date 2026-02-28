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

import PlaceIcon from "@mui/icons-material/Place";
import DescriptionIcon from "@mui/icons-material/Description";
import NotesIcon from "@mui/icons-material/Notes";

import { EVENT_TYPES } from "./EventTypesList";

import { ageAtEvent } from "./Function_ageAtEvent";
import PersonAvatar from "../../components/PersonAvatar";

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
                {/* {console.log(EVENT_TYPES.filter((i) => i.name === ev.type))} */}
                <ListItemAvatar>
                  {EVENT_TYPES.find((i) => i.name === ev.type)?.icon}
                </ListItemAvatar>

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
