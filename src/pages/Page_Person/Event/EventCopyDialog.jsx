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
  Fade,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import SwapHorizontalCircleIcon from "@mui/icons-material/SwapHorizontalCircle";
import AddCircleIcon from "@mui/icons-material/AddCircle";

export default function EventCopyDialog({
  open,
  onClose,
  allPeople,
  eventData,
  onConfirmCopy,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
      maxWidth="xs" // Уменьшил до xs, так как контента тут меньше, будет аккуратнее
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          backgroundImage: "none",
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.9) : "#fff",
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: theme.shadows[24],
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pb: 1,
          fontWeight: 600,
        }}
      >
        <ContentCopyIcon color="primary" />
        Копирование события
      </DialogTitle>

      <DialogContent sx={{ pt: "16px !important" }}>
        <Stack spacing={3}>
          {/* Поиск человека */}
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
                placeholder="Выберите родственника..."
                variant="outlined"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <PersonAddAlt1Icon
                        sx={{ color: "action.active", mr: 1, fontSize: 20 }}
                      />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  sx: { borderRadius: "12px" },
                }}
              />
            )}
          />

          {targetPerson && (
            <Box
              sx={{
                p: 0.5,
                borderRadius: "14px",
                bgcolor: alpha(theme.palette.action.hover, 0.05),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Stack direction="row" spacing={1}>
                {/* Кнопка "Как новое" */}
                <Button
                  fullWidth
                  variant={mode === "new" ? "contained" : "text"}
                  onClick={() => setMode("new")}
                  startIcon={<AddCircleIcon />}
                  sx={{
                    borderRadius: "10px",
                    py: 1,
                    transition: "0.3s",
                    ...(mode === "new" && { boxShadow: theme.shadows[4] }),
                  }}
                >
                  Новое
                </Button>

                {/* Кнопка "Заменить" */}
                <Button
                  fullWidth
                  variant={mode === "replace" ? "contained" : "text"}
                  color="warning"
                  disabled={targetEvents.length === 0}
                  onClick={() => setMode("replace")}
                  startIcon={<SwapHorizontalCircleIcon />}
                  sx={{
                    borderRadius: "10px",
                    py: 1,
                    transition: "0.3s",
                    ...(mode === "replace" && { boxShadow: theme.shadows[4] }),
                  }}
                >
                  Заменить
                </Button>
              </Stack>
            </Box>
          )}

          {/* Выбор события для замены */}
          {mode === "replace" && (
            <Fade in={mode === "replace"}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: alpha(theme.palette.warning.main, 0.05),
                  border: `1px dashed ${alpha(theme.palette.warning.main, 0.3)}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "warning.dark",
                    fontWeight: 600,
                  }}
                >
                  <SwapHorizontalCircleIcon sx={{ fontSize: 16 }} /> ВЫБЕРИТЕ
                  СОБЫТИЕ:
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedEventIndex}
                  onChange={(e) => setSelectedEventIndex(e.target.value)}
                  SelectProps={{
                    sx: { borderRadius: "8px", bgcolor: "background.paper" },
                  }}
                >
                  {targetEvents.map((ev, idx) => (
                    <MenuItem key={idx} value={idx} sx={{ fontSize: "0.9rem" }}>
                      <Typography variant="body2" noWrap>
                        {ev.type?.name || ev.type} —{" "}
                        <Box component="span" sx={{ opacity: 0.7 }}>
                          {ev.date || "Нет даты"}
                        </Box>
                      </Typography>
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Fade>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={handleClose}
          sx={{
            height: 24,
            borderRadius: "6px",
            py: 1.2,
            px: 3,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "text.primary",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.05)",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
            },
          }}
        >
          Отменить
        </Button>
        <Button
          variant="contained"
          disabled={!mode || (mode === "replace" && selectedEventIndex === "")}
          onClick={handleExecute}
          disableElevation
          sx={{
            height: 24,
            borderRadius: "6px",
            px: 2,
            fontWeight: 600,
            boxShadow: mode
              ? `0 4px 14px 0 ${alpha(mode === "replace" ? theme.palette.warning.main : theme.palette.primary.main, 0.35)}`
              : "none",
          }}
        >
          {mode === "replace" ? "Заменить" : "Подтвердить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
