import React from "react";
import {
  Typography,
  IconButton,
  Box,
  List,
  ListItem,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";

import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";

import { EVENT_TYPES } from "./EventTypesList";

import { ageAtEvent } from "../function/Function_ageAtEvent";
import PersonAvatar from "../../../components/PersonAvatar";

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
      {/* ФОНОВАЯ ИКОНКА */}
      <StarIcon
        sx={{
          position: "absolute",
          bottom: -10,
          right: -10,
          fontSize: "150px",
          color: "primary.main",
          opacity: 0.03,
          pointerEvents: "none",
        }}
      />

      {/* ШАПКА */}
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
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <StarIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            События ({sortedEvents.length})
          </Typography>
        </Stack>

        {onAdd && (
          <IconButton
            onClick={onAdd}
            size="small"
            sx={{ color: "primary.main" }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* СПИСОК */}
      <Box sx={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {sortedEvents.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", opacity: 0.5 }}>
            <Typography variant="body2">Событий пока нет</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {sortedEvents.map((ev, index) => (
              <ListItem
                key={index}
                disablePadding
                divider={index !== sortedEvents.length - 1} // Разделитель между всеми, кроме последнего
                sx={{
                  // Стили для появления кнопки карандаша
                  "&:hover .edit-button": { opacity: 1, visibility: "visible" },
                  "&:hover": { bgcolor: "action.hover" },
                  transition: "background 0.2s",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    width: "100%",
                    p: "10px 16px",
                    alignItems: "flex-start",
                    position: "relative",
                  }}
                >
                  {/* ИКОНКА ТИПА */}
                  <Box
                    sx={{
                      mr: 2,
                      display: "flex",
                      p: 0.8,
                      borderRadius: "8px",
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.05),
                      color: "primary.main",
                    }}
                  >
                    {EVENT_TYPES.find((i) => i.name === ev.type)?.icon}
                  </Box>

                  {/* КОНТЕНТ */}
                  <Box sx={{ flex: 1 }}>
                    {/* Заголовок: Тип и Дата в стиле "чипа" */}
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={0.5}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 800, color: "text.primary" }}
                        >
                          {ev.type}
                        </Typography>

                        {ev.date && (
                          <Typography
                            variant="caption"
                            sx={{
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255,255,255,0.08)"
                                  : "rgba(0,0,0,0.05)",
                              px: 1,
                              py: 0.2,
                              borderRadius: "6px",
                              fontWeight: 700,
                              color: "text.secondary",
                              fontSize: "0.7rem",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {ev.date}
                          </Typography>
                        )}
                      </Stack>

                      {/* Возраст (справа) */}
                      {birthday && ev.date && (
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{
                            fontWeight: 800,
                            mr: 5, // Отступ, чтобы не перекрывать кнопку карандаша
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.1),
                            px: 0.8,
                            borderRadius: "4px",
                          }}
                        >
                          {ageAtEvent(birthday, ev.date)}
                        </Typography>
                      )}
                    </Box>

                    {/* Описание и доп. поля */}
                    <Stack spacing={0.3}>
                      {ev.description && (
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography
                            variant="body2"
                            color="text.primary"
                            component="div"
                            sx={{ fontSize: "0.85rem" }}
                          >
                            {ev.description}
                          </Typography>
                        </Box>
                      )}

                      {(ev.place || ev.notes) && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{ display: "flex", gap: 1.5 }}
                        >
                          {ev.place && <span>📍 {ev.place}</span>}
                          {ev.notes && <span>📝 {ev.notes}</span>}
                        </Typography>
                      )}

                      {/* Участники */}
                      {ev.participants?.length > 0 && (
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                          {ev.participants.map((pid) => {
                            const p = findById(pid);
                            return p ? (
                              <Box
                                key={pid}
                                title={labelOf(p)}
                                display="flex"
                                alignItems="center"
                                sx={{
                                  mt: 0.25,
                                  // bgcolor: "divider",
                                  // }}
                                  // sx={{
                                  bgcolor: (theme) =>
                                    theme.palette.mode === "dark"
                                      ? "rgba(255,255,255,0.08)"
                                      : "rgba(0,0,0,0.05)",
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: "10px",
                                  fontWeight: 700,
                                  color: "text.secondary",
                                  fontSize: "0.7rem",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                <PersonAvatar personId={p.id} size={22} />
                                <Typography
                                  component="span"
                                  ml={2}
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {labelOf(p)}
                                </Typography>
                              </Box>
                            ) : null;
                          })}
                        </Box>
                      )}
                    </Stack>
                  </Box>

                  {/* КНОПКА РЕДАКТИРОВАНИЯ (Появляется при наведении) */}
                  <IconButton
                    className="edit-button"
                    size="small"
                    onClick={() => onEdit(ev.originalIndex)}
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: 0,
                      visibility: "hidden",
                      transition: "all 0.2s",
                      bgcolor: "background.paper",
                      boxShadow: 1,
                      "&:hover": { bgcolor: "primary.main", color: "white" },
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
