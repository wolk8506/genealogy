import React from "react";
import { Stack, Box, IconButton, Tooltip } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import EditIcon from "@mui/icons-material/Edit";
import EditOffIcon from "@mui/icons-material/EditOff";

// Вспомогательный компонент для группировки кнопок в рамку
const ToolbarGroup = ({ children }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 1,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 7,
      height: 40,
      color: "text.secondary",
    }}
  >
    {children}
  </Box>
);

export default function BioToolbar({ isEditing, requestToggleEdit, execRef }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flexGrow: 1 }}
    >
      <ToolbarGroup>
        <Tooltip
          title={isEditing ? "Закрыть редактирование" : "Править биографию"}
        >
          <IconButton
            size="small"
            onClick={requestToggleEdit}
            sx={{ color: "white", p: "8px" }}
          >
            {isEditing ? (
              <EditOffIcon size="small" />
            ) : (
              <EditIcon size="inherit" />
            )}
          </IconButton>
        </Tooltip>
      </ToolbarGroup>

      {isEditing && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexGrow: 1, justifyContent: "center" }}
        >
          <ToolbarGroup>
            <IconButton
              size="small"
              sx={{ color: "white", p: "8px" }}
              onClick={() => execRef.current?.exec("Undo")}
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: "white", p: "8px" }}
              onClick={() => execRef.current?.exec("Redo")}
            >
              <RedoIcon />
            </IconButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Заголовок 1">
              <IconButton
                size="small"
                sx={{ color: "white", p: "10px" }}
                onClick={() => execRef.current?.exec("WrapInHeading", 1)}
              >
                <b style={{ fontSize: "16px" }}>H1</b>
              </IconButton>
            </Tooltip>
            <Tooltip title="Заголовок 2">
              <IconButton
                size="small"
                sx={{ color: "white", p: "10px" }}
                onClick={() => execRef.current?.exec("WrapInHeading", 2)}
              >
                <b style={{ fontSize: "16px" }}>H2</b>
              </IconButton>
            </Tooltip>
            <Tooltip title="Обычный текст">
              <IconButton
                size="small"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.exec("WrapInHeading", 0)}
              >
                <TextFieldsIcon />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Жирный">
              <IconButton
                size="small"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.exec("ToggleStrong")}
              >
                <FormatBoldIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Курсив">
              <IconButton
                size="small"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.exec("ToggleEmphasis")}
              >
                <FormatItalicIcon />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Список">
              <IconButton
                size="small"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.exec("WrapInBulletList")}
              >
                <FormatListBulletedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Цитата">
              <IconButton
                size="small"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.exec("WrapInBlockquote")}
              >
                <FormatQuoteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить фото в текст">
              <IconButton
                size="small"
                // color="primary"
                sx={{ color: "white", p: "8px" }}
                onClick={() => execRef.current?.insertImage()}
              >
                <AddPhotoAlternateIcon />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>
        </Stack>
      )}
    </Stack>
  );
}
