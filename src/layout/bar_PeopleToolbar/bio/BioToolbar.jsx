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
import SvgIcon from "@mui/material/SvgIcon";
import { toolbarPillBg, toolbarPillHoverBg, toolbarPillSx } from "../../toolbarStyles";

const HEADER_ICON_PATHS = {
  1: "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M14,18V16H16V6.31L13.5,7.75V5.44L16,4H18V16H20V18H14Z",
  2: "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M21,18H15A2,2 0 0,1 13,16C13,15.47 13.2,15 13.54,14.64L18.41,9.41C18.78,9.05 19,8.55 19,8A2,2 0 0,0 17,6A2,2 0 0,0 15,8H13A4,4 0 0,1 17,4A4,4 0 0,1 21,8C21,9.1 20.55,10.1 19.83,10.83L15,16H21V18Z",
  3: "M3,4H5V10H9V4H11V18H9V12H5V18H3V4M15,4H19A2,2 0 0,1 21,6V16A2,2 0 0,1 19,18H15A2,2 0 0,1 13,16V15H15V16H19V12H15V10H19V6H15V7H13V6A2,2 0 0,1 15,4Z",
};

function HeaderIcon({ level }) {
  return (
    <SvgIcon viewBox="0 0 24 24" fontSize="inherit">
      <path d={HEADER_ICON_PATHS[level]} />
    </SvgIcon>
  );
}

const ToolbarGroup = ({ children }) => (
  <Box
    sx={{
      ...toolbarPillSx,
      display: "inline-flex",
      alignItems: "center",
      gap: 1,
      fontSize: 20,
      color: "text.primary",
      "&:hover": { backgroundColor: toolbarPillBg },
      "& > .MuiIconButton-root, & > span > .MuiIconButton-root": {
        width: 36,
        height: 36,
        p: "3px",
        backgroundClip: "content-box",
      },
      "& > .MuiIconButton-root:hover:not(.Mui-disabled), & > span > .MuiIconButton-root:hover:not(.Mui-disabled)": {
        backgroundColor: toolbarPillHoverBg,
      },
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
            sx={{ color: "text.primary", p: "8px" }}
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
            sx={{ color: "text.primary", p: "8px" }}
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
                    color: "text.primary",
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
                  sx={{ color: "text.primary", p: 0.5 }}
                  onClick={() => goSearchMatch(-1)}
                  disabled={matchCount === 0}
                >
                  <NavigateBeforeIcon fontSize="small" />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ color: "text.primary", minWidth: 36, textAlign: "center" }}
                >
                  {matchCount > 0
                    ? `${(searchMatchIndex % matchCount) + 1}/${matchCount}`
                    : "0/0"}
                </Typography>
                <IconButton
                  size="small"
                  sx={{ color: "text.primary", p: 0.5 }}
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
                sx={{ color: "text.primary", p: 1 }}
                onClick={onPrint}
              >
                <PrintIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Экспорт в PDF">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
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
                  sx={{ color: isDirty ? "#ffd54f" : "text.primary", p: 1 }}
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
              sx={{ color: "text.primary", p: 1 }}
              onClick={() => execRef.current?.exec("Undo")}
            >
              <UndoIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: "text.primary", p: 1 }}
              onClick={() => execRef.current?.exec("Redo")}
            >
              <RedoIcon fontSize="inherit" />
            </IconButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <Tooltip title="Заголовок 1">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 1)}
              >
                <HeaderIcon level={1} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Заголовок 2">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 2)}
              >
                <HeaderIcon level={2} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Заголовок 3">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInHeading", 3)}
              >
                <HeaderIcon level={3} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Обычный текст">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
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
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleStrong")}
              >
                <FormatBoldIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Курсив">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleEmphasis")}
              >
                <FormatItalicIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Зачеркнутый">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("ToggleStrikeThrough")}
              >
                <FormatStrikethroughIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить ссылку">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
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
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.insertTable()}
              >
                <TableChartIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Список">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInBulletList")}
              >
                <FormatListBulletedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Нумерованный список">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInOrderedList")}
              >
                <FormatListNumberedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Цитата">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.exec("WrapInBlockquote")}
              >
                <FormatQuoteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить фото в текст">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
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
