import React from "react";
import { Stack, IconButton, Box, Tooltip } from "@mui/material";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import { useTheme, alpha } from "@mui/material/styles";

import { usePersonStore } from "../../../store/usePersonStore";
import ButtonConteiner from "../../../components/ButtonConteiner";

export default function FileToolbar() {
  const executeUpload = usePersonStore((state) => state.executeUpload);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", width: "100%", justifyContent: "flex-end" }}
    >
      <Tooltip title="Загрузить">
        <ButtonConteiner>
          <IconButton
            onClick={() => executeUpload?.()} // Просто дергаем за ниточку
            disabled={!executeUpload} // Кнопка неактивна, если обработчик не готов
            sx={{ color: "white", p: 1 }}
          >
            <UploadFileIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </ButtonConteiner>
      </Tooltip>
    </Stack>
  );
}
