import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ButtonConteiner from "../../../components/ButtonConteiner";
import PhotoBadgePlusIcon from "../../../components/svg/PhotoBadgePlusIcon";

export default function ExpandingAddPhotoButton({ onToggle }) {
  return (
    <ButtonConteiner>
      <Tooltip title="Добавить фото">
        <IconButton
          size="small"
          sx={{ color: "white", p: 0.5 }}
          onClick={onToggle}
        >
          <PhotoBadgePlusIcon />
        </IconButton>
      </Tooltip>
    </ButtonConteiner>
  );
}
