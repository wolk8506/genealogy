import React from "react";
import { Stack, IconButton, Tooltip } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { usePersonStore } from "../../../store/usePersonStore";
import ButtonConteiner from "../../../components/ButtonConteiner";

export default function FileToolbar() {
  const executeUpload = usePersonStore((state) => state.executeUpload);
  const openFilesFolder = usePersonStore((state) => state.openFilesFolder);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end" }}
    >
      <Tooltip title="Открыть папку файлов">
        <ButtonConteiner>
          <IconButton
            onClick={() => openFilesFolder?.()}
            disabled={!openFilesFolder}
            sx={{ color: "white", p: 1 }}
          >
            <FolderOpenIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </ButtonConteiner>
      </Tooltip>
      <Tooltip title="Загрузить файлы">
        <ButtonConteiner>
          <IconButton
            onClick={() => executeUpload?.()}
            disabled={!executeUpload}
            sx={{ color: "white", p: 1 }}
          >
            <UploadFileIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </ButtonConteiner>
      </Tooltip>
    </Stack>
  );
}
