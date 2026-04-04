import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ButtonConteiner from "../../../components/ButtonConteiner";

export default function ExpandingAddPhotoButton({ onToggle }) {
  return (
    <ButtonConteiner>
      <Tooltip title="Добавить фото">
        <IconButton
          size="small"
          sx={{ color: "white", p: 1 }}
          onClick={onToggle}
        >
          <AddPhotoAlternateIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </ButtonConteiner>
  );
}
