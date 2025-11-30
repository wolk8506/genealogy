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
  Typography,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import ArchiveIcon from "@mui/icons-material/Archive";

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
      br
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
            В архив будет добавлена вся база данных
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
      <DialogActions sx={{ pr: "24px", pl: "24px", pb: "16px", pt: "16px" }}>
        <Button onClick={onCancel} startIcon={<BlockIcon />}>
          Отменить
        </Button>
        <Button
          onClick={onConfirm}
          startIcon={<ArchiveIcon />}
          variant="contained"
          color="primary"
        >
          Архивировать
        </Button>
      </DialogActions>
    </Dialog>
  );
}
