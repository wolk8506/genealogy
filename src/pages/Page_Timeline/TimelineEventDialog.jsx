import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Chip,
  Box,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import EditIcon from "@mui/icons-material/Edit";
import ContactsIcon from "@mui/icons-material/Contacts";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function TimelineEventDialog({
  open,
  event,
  allPeople = [],
  onClose,
  onShowMap,
  onEdit,
  onOpenExternal,
  onOpenPerson,
}) {
  if (!event) return null;

  const isExternal = event.kind === "external";
  const participants = isExternal
    ? []
    : (event.personIds?.length
        ? event.personIds
        : [event.personId].filter((id) => id != null)
      ).map((id) => {
        const p = allPeople.find((x) => x.id === id);
        const name = p
          ? `${p.lastName || p.maidenName || ""} ${p.firstName || ""}`.trim()
          : `ID ${id}`;
        return { id, name };
      });

  const hasPlace = Boolean(event.place?.trim());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {isExternal ? event.label : event.type || "Событие"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {isExternal && event.entityType && (
            <Chip size="small" label={event.entityType} sx={{ alignSelf: "flex-start" }} />
          )}
          {(event.date || event.label) && (
            <Typography variant="body2" color="text.secondary">
              {[event.date, isExternal ? null : event.label]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
          {event.description && (
            <Typography variant="body2">{event.description}</Typography>
          )}
          {event.notes && (
            <Typography variant="body2" color="text.secondary">
              {event.notes}
            </Typography>
          )}
          {hasPlace && (
            <Typography variant="body2">
              <Box component="span" sx={{ color: "text.secondary" }}>
                Место:{" "}
              </Box>
              {event.place}
            </Typography>
          )}
          {participants.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700, display: "block", mb: 0.75 }}
              >
                Участники
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {participants.map((p) => (
                  <Chip
                    key={p.id}
                    size="small"
                    label={p.name}
                    onClick={() => onOpenPerson?.(p.id)}
                    sx={{ cursor: onOpenPerson ? "pointer" : "default" }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 0.5 }}>
        {hasPlace && onShowMap && (
          <Button
            size="small"
            startIcon={<MapIcon />}
            onClick={() => onShowMap(event)}
          >
            На карте
          </Button>
        )}
        {!isExternal && onEdit && (
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => onEdit(event)}
          >
            Редактировать
          </Button>
        )}
        {isExternal && onOpenExternal && (
          <Button
            size="small"
            startIcon={<ContactsIcon />}
            onClick={() => onOpenExternal(event.externalId)}
          >
            Справочник
          </Button>
        )}
        <Button size="small" startIcon={<OpenInNewIcon />} onClick={onClose}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
