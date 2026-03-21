import React from "react";
import { Stack, Button, Divider, IconButton, Tooltip } from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

import ButtonConteiner from "../../../components/ButtonConteiner";
import StarIcon from "@mui/icons-material/Star";
import InfoIcon from "@mui/icons-material/Info";

const InfoToolbar = ({ personRef }) => {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flexGrow: 1, justifyContent: "center" }}
    >
      <ButtonConteiner>
        <Tooltip title="Редактировать профиль">
          <IconButton
            onClick={() => personRef.current?.handleEditProfile()}
            size="small"
            sx={{ color: "white", p: "8px" }}
          >
            <CreateIcon />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
      <ButtonConteiner>
        <Tooltip title="Добавить событие">
          <IconButton
            onClick={() => personRef.current?.handleAddEvent()}
            size="small"
            sx={{ color: "white", p: "8px" }}
          >
            <StarIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Добавить факт">
          <IconButton
            onClick={() => personRef.current?.handleAddFact()}
            size="small"
            sx={{ color: "white", p: "8px" }}
          >
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
    </Stack>
  );
};

export default InfoToolbar;
