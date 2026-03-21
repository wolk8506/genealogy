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
          sx={{ color: "white", p: "8px" }}
          onClick={onToggle}
        >
          <AddPhotoAlternateIcon />
        </IconButton>
      </Tooltip>
    </ButtonConteiner>
  );
}
