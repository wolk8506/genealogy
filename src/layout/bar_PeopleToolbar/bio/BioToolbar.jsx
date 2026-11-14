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
import ButtonConteiner from "../../../components/ButtonConteiner";
import ToolbarButtonGroup from "../../../components/ToolbarButtonGroup";
import { TOOLBAR_CAPSULE } from "../../toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../../appBarToolbarLayout";

const SEARCH_FIELD_WIDTH = 150;
const SEARCH_CONTROLS_GAP = 8;
const SEARCH_ANIMATION = "200ms cubic-bezier(0.23, 1, 0.32, 1)";

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
  <Stack direction="row" sx={toolbarRowSx}>
    <Box
      sx={{
        ...toolbarClusterSx,
        flexWrap: "wrap",
        rowGap: 1,
        minWidth: 0,
      }}
    >
      <ButtonConteiner>
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
              color: isEditing ? "common.white" : "inherit",
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
            sx={{ color: "inherit", p: 0 }}
          >
            <TocIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>

      {!isEditing && (
        <ButtonConteiner>
          <Tooltip title="Печать">
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0 }}
              onClick={onPrint}
            >
              <PrintIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Экспорт в PDF">
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0 }}
              onClick={onExportPdf}
            >
              <PictureAsPdfIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </ButtonConteiner>
      )}

      {isEditing && (
        <>
          <ButtonConteiner>
            <Tooltip title={isDirty ? "Сохранить (Ctrl+S)" : "Нет изменений"}>
              <span>
                <IconButton
                  size="small"
                  sx={{ color: isDirty ? "#ffd54f" : "inherit", p: 0 }}
                  onClick={onSave}
                  disabled={!isDirty}
                >
                  <SaveIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
          </ButtonConteiner>

          <ButtonConteiner>
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0 }}
              onClick={() => execRef.current?.exec("Undo")}
            >
              <UndoIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0 }}
              onClick={() => execRef.current?.exec("Redo")}
            >
              <RedoIcon fontSize="inherit" />
            </IconButton>
          </ButtonConteiner>

          <ButtonConteiner>
            <BioFormatMenu execRef={execRef} />

            <Tooltip title="Вставить фото в текст">
              <IconButton
                size="small"
                sx={{ color: "inherit", p: 0 }}
                onClick={() => execRef.current?.insertImage()}
              >
                <PhotoBadgePlusIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить таблицу">
              <IconButton
                size="small"
                sx={{ color: "inherit", p: 0 }}
                onClick={() => execRef.current?.insertTable()}
              >
                <TableCellsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Вставить ссылку">
              <IconButton
                size="small"
                sx={{ color: "inherit", p: 0 }}
                onClick={() => execRef.current?.insertLink?.()}
              >
                <LinkGlyphIcon />
              </IconButton>
            </Tooltip>
          </ButtonConteiner>
        </>
      )}
    </Box>

    <Box sx={toolbarDragSpacerSx} />

    <Box sx={toolbarClusterSx}>
      <ToolbarButtonGroup
        gap={TOOLBAR_CAPSULE.gapSegmentsPx}
        contentSx={{ alignItems: "center" }}
      >
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
                color: "inherit",
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
              sx={{ color: "inherit", p: 0.5 }}
              onClick={() => goSearchMatch(-1)}
              disabled={matchCount === 0}
            >
              <NavigateBeforeIcon fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              sx={{ color: "inherit", minWidth: 36, textAlign: "center" }}
            >
              {matchCount > 0
                ? `${(searchMatchIndex % matchCount) + 1}/${matchCount}`
                : "0/0"}
            </Typography>
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0.5 }}
              onClick={() => goSearchMatch(1)}
              disabled={matchCount === 0}
            >
              <NavigateNextIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </ToolbarButtonGroup>
    </Box>
  </Stack>
  );
}
