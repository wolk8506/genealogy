import React from "react";
import { Stack, Box, IconButton, Tooltip, Divider } from "@mui/material";
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
import TableChartIcon from "@mui/icons-material/TableChart";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";

// Вспомогательный компонент для группировки кнопок в рамку
const ToolbarGroup = ({ children }) => (
  <Box
    sx={{
      WebkitAppRegion: "no-drag",
      display: "inline-flex",
      alignItems: "center",
      gap: 1,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 7,
      height: 34,
      fontSize: 20,
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
              <EditOffIcon size="small" fontSize="inherit" />
            ) : (
              <EditIcon size="inherit" fontSize="inherit" />
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
              sx={{ color: "white", p: 1 }}
              onClick={() => execRef.current?.exec("Undo")}
            >
              <UndoIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: "white", p: 1 }}
              onClick={() => execRef.current?.exec("Redo")}
            >
              <RedoIcon fontSize="inherit" />
            </IconButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Заголовок 1">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 1)}
              >
                <b style={{ fontSize: "16px" }}>H1</b>
              </IconButton>
            </Tooltip>
            <Tooltip title="Заголовок 2">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 2)}
              >
                <b style={{ fontSize: "16px" }}>H2</b>
              </IconButton>
            </Tooltip>
            <Tooltip title="Заголовок 3">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 3)}
              >
                <b style={{ fontSize: "16px" }}>H3</b>
              </IconButton>
            </Tooltip>
            <Tooltip title="Обычный текст">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 0)}
              >
                <TextFieldsIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Жирный">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleStrong")}
              >
                <FormatBoldIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Курсив">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleEmphasis")}
              >
                <FormatItalicIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Зачеркнутый">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleStrikeThrough")}
              >
                <FormatStrikethroughIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Вставить таблицу">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.insertTable()}
              >
                <TableChartIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Список">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInBulletList")}
              >
                <FormatListBulletedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Нумерованный список">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInOrderedList")}
              >
                <FormatListNumberedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Цитата">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInBlockquote")}
              >
                <FormatQuoteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить фото в текст">
              <IconButton
                size="small"
                // color="primary"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.insertImage()}
              >
                <AddPhotoAlternateIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>
        </Stack>
      )}
    </Stack>
  );
}
