// import React from "react";
// import "./ImportDecisionModal.css";

// export const ImportDecisionModal = ({
//   open,
//   summary,
//   toAdd,
//   toUpdate,
//   onSelect,
// }) => {
//   if (!open) return null;

//   return (
//     <div className="modal-backdrop">
//       <div className="modal">
//         <h2>Импорт архива</h2>

//         <div className="modal-section">
//           <strong>➕ Новые ({toAdd.length}):</strong>
//           <div className="id-list">{toAdd.map((p) => p.id).join(", ")}</div>
//         </div>

//         <div className="modal-section">
//           <strong>🔄 Обновить ({toUpdate.length}):</strong>
//           <div className="id-list">{toUpdate.map((p) => p.id).join(", ")}</div>
//         </div>

//         <div className="modal-summary">
//           <pre>{summary}</pre>
//         </div>

//         <div className="buttons">
//           <button onClick={() => onSelect("all")}>✅ Обновить всех</button>
//           <button onClick={() => onSelect("new")}>➕ Только новых</button>
//           <button onClick={() => onSelect("cancel")}>❌ Отменить</button>
//         </div>
//       </div>
//     </div>
//   );
// };
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Chip,
  Divider,
  Button,
  Paper,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CancelIcon from "@mui/icons-material/Cancel";

export function ImportDecisionModal({
  open,
  summary,
  toAdd = [],
  toUpdate = [],
  onSelect,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      onClose={() => onSelect("cancel")}
    >
      <DialogTitle>Импорт архива</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Новые */}
          <Stack spacing={1}>
            <Typography variant="subtitle1">
              ➕ Новые ({toAdd.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {toAdd.map((p) => (
                <Chip key={p.id} label={p.id} color="success" size="small" />
              ))}
              {toAdd.length === 0 && (
                <Typography color="text.secondary">Нет новых</Typography>
              )}
            </Stack>
          </Stack>

          <Divider />

          {/* Обновления */}
          <Stack spacing={1}>
            <Typography variant="subtitle1">
              🔄 Обновить ({toUpdate.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {toUpdate.map((p) => (
                <Chip key={p.id} label={p.id} color="primary" size="small" />
              ))}
              {toUpdate.length === 0 && (
                <Typography color="text.secondary">Нет обновлений</Typography>
              )}
            </Stack>
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
            {summary}
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          startIcon={<CheckCircleIcon />}
          onClick={() => onSelect("all")}
          color="primary"
          variant="contained"
        >
          Обновить всех
        </Button>
        <Button
          startIcon={<PersonAddIcon />}
          onClick={() => onSelect("new")}
          color="success"
          variant="outlined"
        >
          Только новых
        </Button>
        <Button
          startIcon={<CancelIcon />}
          onClick={() => onSelect("cancel")}
          color="inherit"
        >
          Отменить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
