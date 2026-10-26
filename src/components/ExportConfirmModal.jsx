import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import DialogActionButton, {
  DialogActionsBar,
} from "./Dialog/DialogActionButton";

export default function ExportConfirmModal({
  open,
  people = [],
  onConfirm,
  onCancel,
  allPeople = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      // br
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "15px",
        },
      }}
    >
      <DialogTitle gutterBottom sx={{ display: "flex", alignItems: "center" }}>
        <ArchiveIcon color="primary" sx={{ marginRight: 0.5 }} /> Подтвердите
        экспорт
      </DialogTitle>
      <DialogContent dividers>
        {allPeople ? (
          <Typography color="inherit">
            В бэкап будет включена вся база данных
          </Typography>
        ) : (
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
        )}
      </DialogContent>
      <DialogActionsBar>
        <DialogActionButton onClick={onCancel}>Отменить</DialogActionButton>
        <DialogActionButton tone="primary" onClick={onConfirm}>
          Экспортировать
        </DialogActionButton>
      </DialogActionsBar>
    </Dialog>
  );
}
