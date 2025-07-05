import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function ExportConfirmModal({
  open,
  people,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>📦 Подтвердите экспорт</DialogTitle>
      <DialogContent dividers>
        <List dense>
          {people.map((p) => (
            <ListItem key={p.id}>
              <ListItemText
                primary={
                  `${p.firstName || ""} ${p.lastName || ""}`.trim() ||
                  "Без имени"
                }
                secondary={`ID: ${p.id}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>❌ Отменить</Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          📦 Архивировать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
