import React from "react";
import {
  Stack,
  Box,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
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
import TocIcon from "@mui/icons-material/Toc";
import TableChartIcon from "@mui/icons-material/TableChart";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import SaveIcon from "@mui/icons-material/Save";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

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

export default function BioToolbar({
  isEditing,
  isDirty,
  requestToggleEdit,
  onSave,
  onPrint,
  onExportPdf,
  execRef,
  isNavVisible,
  onToggleNav,
  searchQuery,
  onSearchQueryChange,
  searchMatchIndex,
  onSearchMatchIndexChange,
  searchMatchCount = 0,
}) {
  const matchCount = searchMatchCount;

  const goSearchMatch = (delta) => {
    if (matchCount === 0) return;
    onSearchMatchIndexChange?.(
      (prev) => (prev + delta + matchCount) % matchCount,
    );
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        flex: 1,
        minWidth: 0,
        flexWrap: "wrap",
        rowGap: 1,
      }}
    >
      <ToolbarGroup>
        <Tooltip
          title={
            isEditing
              ? isDirty
                ? "Закрыть (есть несохранённые изменения)"
                : "Закрыть редактирование"
              : "Править биографию"
          }
        >
          <IconButton
            size="small"
            onClick={requestToggleEdit}
            sx={{ color: "white", p: "8px" }}
          >
            {isEditing ? (
              <EditOffIcon size="small" fontSize="inherit" />
            ) : (
              <EditIcon fontSize="inherit" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip
          title={isNavVisible ? "Скрыть навигацию" : "Показать навигацию"}
        >
          <IconButton
            size="small"
            onClick={onToggleNav}
            sx={{ color: "white", p: "8px" }}
          >
            <TocIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </ToolbarGroup>

      {!isEditing && (
        <>
          <ToolbarGroup>
            <TextField
              size="small"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange?.(e.target.value);
                onSearchMatchIndexChange?.(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") goSearchMatch(e.shiftKey ? -1 : 1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    color: "white",
                    fontSize: "0.85rem",
                    width: 160,
                    py: 0,
                    "& fieldset": { border: "none" },
                  },
                },
              }}
            />
            {searchQuery?.trim() && (
              <>
                <IconButton
                  size="small"
                  sx={{ color: "white", p: 0.5 }}
                  onClick={() => goSearchMatch(-1)}
                  disabled={matchCount === 0}
                >
                  <NavigateBeforeIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ color: "white", minWidth: 36, textAlign: "center" }}
                >
                  {matchCount > 0
                    ? `${(searchMatchIndex % matchCount) + 1}/${matchCount}`
                    : "0/0"}
                </Typography>
                <IconButton
                  size="small"
                  sx={{ color: "white", p: 0.5 }}
                  onClick={() => goSearchMatch(1)}
                  disabled={matchCount === 0}
                >
                  <NavigateNextIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Печать">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={onPrint}
              >
                <PrintIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Экспорт в PDF">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={onExportPdf}
              >
                <PictureAsPdfIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>
        </>
      )}

      {isEditing && (
        <>
          <ToolbarGroup>
            <Tooltip title={isDirty ? "Сохранить (Ctrl+S)" : "Нет изменений"}>
              <span>
                <IconButton
                  size="small"
                  sx={{ color: isDirty ? "#ffd54f" : "white", p: 1 }}
                  onClick={onSave}
                  disabled={!isDirty}
                >
                  <SaveIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
          </ToolbarGroup>

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
            <Tooltip title="Вставить ссылку">
              <IconButton
                size="small"
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.insertLink?.()}
              >
                <LinkIcon fontSize="inherit" />
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
                sx={{ color: "white", p: 1 }}
                onClick={() => execRef.current?.insertImage()}
              >
                <AddPhotoAlternateIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>
        </>
      )}
    </Stack>
  );
}
