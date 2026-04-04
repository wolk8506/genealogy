import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import ButtonConteiner from "../../components/ButtonConteiner";
import { useModalStore } from "../../store/useModalStore";

export default function ExpandingAddPhotoButton() {
  const openUpload = useModalStore((state) => state.openGlobalPhotoUpload);

  return (
    <ButtonConteiner>
      <Tooltip title="Добавить фото">
        <IconButton
          size="small"
          sx={{ color: "white", p: 1 }}
          onClick={openUpload}
        >
          <AddPhotoAlternateIcon />
        </IconButton>
      </Tooltip>
    </ButtonConteiner>
  );
}
