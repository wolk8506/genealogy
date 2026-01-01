// src/components/UpdateBanner.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Snackbar, Alert, Button, Box } from "@mui/material";

export function AddBanner({ isOpen, newPerson }) {
  const [open, setOpen] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  const handleSettings = () => {
    setOpen(false);
    navigate(`/person/${newPerson?.id}
  `);
  };

  const personName =
    newPerson &&
    ([
      newPerson?.firstName,
      newPerson?.patronymic,
      newPerson?.lastName || newPerson?.maidenName,
    ]
      .filter(Boolean)
      .join(" ") ||
      `ID ${newPerson?.id}`);

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        severity="success"
        onClose={handleClose}
        action={
          <Box>
            <Button color="inherit" size="small" onClick={handleClose}>
              Закрыть
            </Button>
            <Button color="inherit" size="small" onClick={handleSettings}>
              Перейти к человеку
            </Button>
          </Box>
        }
        sx={{
          alignItems: "center",
          borderRadius: "15px",
          gap: "10px",
        }}
      >
        Добавлен <strong>{personName}</strong> с id{" "}
        <strong>{newPerson?.id}</strong>.
        <br /> Перейти к персональной странице.
      </Alert>
    </Snackbar>
  );
}
