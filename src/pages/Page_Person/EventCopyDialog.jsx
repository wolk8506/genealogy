import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Typography,
  Stack,
  MenuItem,
  Box,
  Divider,
} from "@mui/material";

export default function EventCopyDialog({
  open,
  onClose,
  allPeople,
  eventData,
  onConfirmCopy,
}) {
  const [targetPerson, setTargetPerson] = useState(null);
  const [mode, setMode] = useState(null); // 'new' | 'replace'
  const [selectedEventIndex, setSelectedEventIndex] = useState("");

  const targetEvents = useMemo(() => {
    return targetPerson?.events || [];
  }, [targetPerson]);

  const handleClose = () => {
    setTargetPerson(null);
    setMode(null);
    setSelectedEventIndex("");
    onClose();
  };

  const handleExecute = () => {
    onConfirmCopy(targetPerson.id, mode, selectedEventIndex);
    handleClose();
  };

  const labelOf = (p) =>
    [`${p.id} :: `, p.firstName, p.lastName].filter(Boolean).join(" ");

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <DialogTitle>Скопировать событие человеку...</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Autocomplete
            options={allPeople}
            getOptionLabel={labelOf}
            value={targetPerson}
            onChange={(_, v) => {
              setTargetPerson(v);
              setMode(null);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Кому копируем?"
                variant="outlined"
              />
            )}
          />

          {targetPerson && (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant={mode === "new" ? "contained" : "outlined"}
                onClick={() => setMode("new")}
              >
                Как новое
              </Button>
              <Button
                variant={mode === "replace" ? "contained" : "outlined"}
                color="warning"
                disabled={targetEvents.length === 0}
                onClick={() => setMode("replace")}
              >
                Заменить существующее
              </Button>
            </Stack>
          )}

          {mode === "replace" && (
            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                Выберите событие для замены:
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedEventIndex}
                onChange={(e) => setSelectedEventIndex(e.target.value)}
              >
                {targetEvents.map((ev, idx) => (
                  <MenuItem key={idx} value={idx}>
                    {ev.type?.name || ev.type} — {ev.date || "Нет даты"}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>Отмена</Button>
        <Button
          variant="contained"
          disabled={!mode || (mode === "replace" && selectedEventIndex === "")}
          onClick={handleExecute}
        >
          {mode === "replace" ? "Заменить" : "Скопировать"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
