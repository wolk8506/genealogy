import React from "react";
import { Dialog, Stack, Typography, Chip, Box, Divider } from "@mui/material";
import DialogActionButton, {
  DialogActionsBar,
} from "../../components/Dialog/DialogActionButton";

const sectionLabelSx = {
  display: "block",
  mb: 1,
  fontWeight: 700,
  color: "text.secondary",
};

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
          {isExternal ? event.label : event.type || "Событие"}
        </Typography>

        <Stack spacing={2} divider={<Divider flexItem />}>
          {isExternal && event.entityType && (
            <Chip
              size="small"
              label={event.entityType}
              sx={{ alignSelf: "flex-start" }}
            />
          )}

          {(event.date || (!isExternal && event.label)) && (
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Дата
              </Typography>
              <Typography variant="body2">
                {[event.date, isExternal ? null : event.label]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            </Box>
          )}

          {event.description && (
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Описание
              </Typography>
              <Typography variant="body2">{event.description}</Typography>
            </Box>
          )}

          {event.notes && (
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Заметки
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {event.notes}
              </Typography>
            </Box>
          )}

          {hasPlace && (
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
                Место
              </Typography>
              <Typography variant="body2">{event.place}</Typography>
            </Box>
          )}

          {participants.length > 0 && (
            <Box>
              <Typography variant="overline" sx={sectionLabelSx}>
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
      </Box>

      <DialogActionsBar sx={{ flexWrap: "wrap" }}>
        {hasPlace && onShowMap && (
          <DialogActionButton onClick={() => onShowMap(event)}>
            На карте
          </DialogActionButton>
        )}
        {isExternal && onOpenExternal && (
          <DialogActionButton onClick={() => onOpenExternal(event.externalId)}>
            Справочник
          </DialogActionButton>
        )}
        <DialogActionButton onClick={onClose}>Закрыть</DialogActionButton>
        {!isExternal && onEdit && (
          <DialogActionButton tone="primary" onClick={() => onEdit(event)}>
            Редактировать
          </DialogActionButton>
        )}
      </DialogActionsBar>
    </Dialog>
  );
}
