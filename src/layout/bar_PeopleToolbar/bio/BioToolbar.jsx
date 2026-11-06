import React, { useEffect, useRef, useState } from "react";
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
import TocIcon from "@mui/icons-material/Toc";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import BioFormatMenu from "./BioFormatMenu";
import {
  PhotoBadgePlusIcon,
  LinkGlyphIcon,
  TableCellsIcon,
  SquareAndPencilIcon,
} from "./BioFormatIcons";
import { toolbarPillBg, toolbarPillHoverBg, toolbarPillSx } from "../../toolbarStyles";

const SEARCH_FIELD_WIDTH = 150;
const SEARCH_CONTROLS_GAP = 8;
const SEARCH_ANIMATION = "200ms cubic-bezier(0.23, 1, 0.32, 1)";

const ToolbarGroup = ({ children, style }) => (
  <Box
    style={style}
    sx={{
      ...toolbarPillSx,
      display: "inline-flex",
      alignItems: "center",
      gap: 1,
      fontSize: 20,
      color: "text.primary",
      "&:hover": { backgroundColor: toolbarPillBg },
      "& .MuiIconButton-root": {
        width: 36,
        height: 36,
        p: "3px",
        backgroundClip: "content-box",
      },
      // [data-accent] — кнопка красит фон сама, серая подсветка её не перекрывает
      "& .MuiIconButton-root:hover:not(.Mui-disabled):not([data-accent])": {
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const hasSearchValue = Boolean(searchQuery?.trim());

  // Ширина стрелок со счётчиком замеряется, чтобы при фокусе пустое поле
  // растягивалось ровно до длины поля с введённым значением.
  const searchControlsRef = useRef(null);
  const [searchControlsWidth, setSearchControlsWidth] = useState(0);
  useEffect(() => {
    const node = searchControlsRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSearchControlsWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const searchFieldWidth =
    !hasSearchValue && isSearchFocused
      ? SEARCH_FIELD_WIDTH + SEARCH_CONTROLS_GAP + searchControlsWidth
      : SEARCH_FIELD_WIDTH;
  const searchControlsSx = {
    width: hasSearchValue ? searchControlsWidth : 0,
    marginLeft: hasSearchValue ? 0 : -1,
    opacity: hasSearchValue ? 1 : 0,
    overflow: "hidden",
    transition: `width ${SEARCH_ANIMATION}, margin-left ${SEARCH_ANIMATION}, opacity 150ms ease-out`,
    "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  };

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
            aria-pressed={isEditing}
            data-accent={isEditing ? "" : undefined}
            sx={{
              color: isEditing ? "common.white" : "text.primary",
              bgcolor: isEditing ? "primary.main" : "transparent",
              p: "8px",
              transition:
                "background-color 160ms ease-out, color 160ms ease-out",
              ...(isEditing && { "&:hover": { bgcolor: "primary.dark" } }),
              "@media (prefers-reduced-motion: reduce)": {
                transition: "none",
              },
            }}
          >
            <SquareAndPencilIcon
              height={17}
              fillOpacity={isEditing ? 1 : 0.85}
            />
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
            <BioFormatMenu execRef={execRef} />

            <Tooltip title="Вставить фото в текст">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.insertImage()}
              >
                <PhotoBadgePlusIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить таблицу">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.insertTable()}
              >
                <TableCellsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить ссылку">
              <IconButton
                size="small"
                sx={{ color: "text.primary", p: 1 }}
                onClick={() => execRef.current?.insertLink?.()}
              >
                <LinkGlyphIcon />
              </IconButton>
            </Tooltip>
          </ToolbarGroup>
        </>
      )}

      <ToolbarGroup style={{ marginLeft: "auto" }}>
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
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
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
                width: searchFieldWidth,
                py: 0,
                transition: `width ${SEARCH_ANIMATION}`,
                "@media (prefers-reduced-motion: reduce)": {
                  transition: "none",
                },
                "& fieldset": { border: "none" },
              },
            },
          }}
        />
        <Box sx={searchControlsSx}>
          <Box
            ref={searchControlsRef}
            component="span"
            aria-hidden={!hasSearchValue}
            sx={{
              display: "inline-flex",
              width: "max-content",
              alignItems: "center",
              gap: 1,
            }}
          >
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
          </Box>
        </Box>
      </ToolbarGroup>
    </Stack>
  );
}
