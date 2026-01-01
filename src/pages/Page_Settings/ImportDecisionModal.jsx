import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Divider,
  Button,
  Paper,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Box,
  FormControlLabel,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CancelIcon from "@mui/icons-material/Cancel";

/**
 * onSelect receives an object:
 * { action: 'all'|'new'|'cancel'|'selected', selected: string[] }
 */
export function ImportDecisionModal({
  open,
  summary = "",
  toAdd = [],
  toUpdate = [],
  onSelect = () => {},
}) {
  const theme = useTheme();

  // flattened unique list of ids for manual selection
  const allIds = useMemo(
    () =>
      Array.from(
        new Map(
          [...toAdd, ...toUpdate].map((p) => [String(p.id), String(p.id)])
        ).values()
      ),
    [toAdd, toUpdate]
  );

  const [mode, setMode] = useState("default"); // 'default' | 'manual'
  const [selectedIds, setSelectedIds] = useState(() => allIds.slice());
  const [masterChecked, setMasterChecked] = useState(false);
  const [masterIndeterminate, setMasterIndeterminate] = useState(false);

  useEffect(() => {
    // reset selection when lists change or modal opens
    setSelectedIds(allIds.slice());
    setMode("default");
  }, [allIds, open]);

  // keep master checkbox state in sync with selectedIds
  useEffect(() => {
    if (allIds.length === 0) {
      setMasterChecked(false);
      setMasterIndeterminate(false);
      return;
    }
    if (selectedIds.length === 0) {
      setMasterChecked(false);
      setMasterIndeterminate(false);
    } else if (selectedIds.length === allIds.length) {
      setMasterChecked(true);
      setMasterIndeterminate(false);
    } else {
      setMasterChecked(false);
      setMasterIndeterminate(true);
    }
  }, [selectedIds, allIds]);

  const toggleId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === allIds.length) {
      // all selected -> clear
      setSelectedIds([]);
    } else {
      // not all -> select all
      setSelectedIds(allIds.slice());
    }
  };

  const handleClose = () => {
    try {
      onSelect({ action: "cancel", selected: [] });
    } catch (e) {
      // noop
    }
  };

  const handleAll = () => onSelect({ action: "all", selected: allIds.slice() });
  const handleNew = () => {
    const ids = (toAdd || []).map((p) => String(p.id));
    onSelect({ action: "new", selected: ids });
  };
  const handleManual = () =>
    onSelect({ action: "selected", selected: selectedIds.slice() });

  const safeSummary =
    typeof summary === "string" ? summary : JSON.stringify(summary, null, 2);

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      onClose={handleClose}
      aria-labelledby="import-dialog-title"
      PaperProps={{ sx: { borderRadius: "15px" } }}
    >
      <DialogTitle id="import-dialog-title">Импорт архива</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Новые */}
          <Stack spacing={1}>
            <Typography variant="subtitle1">
              ➕ Новые ({toAdd.length})
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {toAdd.length > 0 ? (
                toAdd.slice(0, 20).map((p) => (
                  <Paper key={p.id} variant="outlined" sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="caption">{String(p.id)}</Typography>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">Нет новых</Typography>
              )}
              {toAdd.length > 20 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ alignSelf: "center" }}
                >
                  и ещё {toAdd.length - 20}...
                </Typography>
              )}
            </Box>
          </Stack>

          <Divider />

          {/* Обновления */}
          <Stack spacing={1}>
            <Typography variant="subtitle1">
              🔄 Обновить ({toUpdate.length})
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {toUpdate.length > 0 ? (
                toUpdate.slice(0, 20).map((p) => (
                  <Paper key={p.id} variant="outlined" sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="caption">{String(p.id)}</Typography>
                  </Paper>
                ))
              ) : (
                <Typography color="text.secondary">Нет обновлений</Typography>
              )}
              {toUpdate.length > 20 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ alignSelf: "center" }}
                >
                  и ещё {toUpdate.length - 20}...
                </Typography>
              )}
            </Box>
          </Stack>

          <Divider />

          {/* Manual selection area */}
          <Stack spacing={1}>
            <Typography variant="subtitle1">Выбор вручную</Typography>
            <Typography variant="body2" color="text.secondary">
              Переключитесь в режим «Выбрать вручную», чтобы отметить конкретных
              людей для восстановления.
            </Typography>

            <Button
              size="small"
              onClick={() =>
                setMode((m) => (m === "manual" ? "default" : "manual"))
              }
              sx={{ alignSelf: "flex-start", mt: 1 }}
            >
              {mode === "manual"
                ? "Выйти из ручного режима"
                : "Выбрать вручную"}
            </Button>

            {mode === "manual" && (
              <Paper
                variant="outlined"
                sx={{ maxHeight: 240, overflow: "auto", mt: 1, p: 1 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={masterChecked}
                        indeterminate={masterIndeterminate}
                        onChange={toggleAll}
                        inputProps={{ "aria-label": "Выбрать все" }}
                      />
                    }
                    label={`Выбрать все (${allIds.length})`}
                  />
                </Box>

                <List dense>
                  {allIds.length === 0 && (
                    <ListItem>
                      <ListItemText primary="Нет доступных персон для выбора" />
                    </ListItem>
                  )}
                  {allIds.map((id) => (
                    <ListItem key={id} button onClick={() => toggleId(id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedIds.includes(id)}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ "aria-labelledby": `chk-${id}` }}
                        />
                      </ListItemIcon>
                      <ListItemText id={`chk-${id}`} primary={id} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Stack>

          <Divider />

          {/* Сводка */}
          <Typography variant="subtitle1">Сводка</Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: theme.palette.background.paper,
              whiteSpace: "pre-wrap",
              fontFamily: "Monospace",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {safeSummary || "Нет дополнительной информации"}
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          startIcon={<CheckCircleIcon />}
          onClick={handleAll}
          color="primary"
          variant="contained"
        >
          Обновить всех
        </Button>

        <Button
          startIcon={<PersonAddIcon />}
          onClick={handleNew}
          color="success"
          variant="outlined"
        >
          Только новых
        </Button>

        <Button
          startIcon={<PersonAddIcon />}
          onClick={handleManual}
          color="primary"
          variant="outlined"
          disabled={mode !== "manual" || selectedIds.length === 0}
        >
          Импортировать выбранных ({selectedIds.length})
        </Button>

        <Button
          startIcon={<CancelIcon />}
          onClick={handleClose}
          color="inherit"
        >
          Отменить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
