import React, { useCallback, useState } from "react";
import {
  Box,
  ButtonBase,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import FormatClearIcon from "@mui/icons-material/FormatClear";
import CheckIcon from "@mui/icons-material/Check";
import { popoverArrowSx } from "../../../theme/popoverArrow";
import {
  BIO_HIGHLIGHT_COLORS,
  DEFAULT_BIO_HIGHLIGHT_COLOR,
} from "../../../theme/bioHighlightColors";
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
  HighlighterIcon,
  TextFormatIcon,
} from "./BioFormatIcons";

const BLOCK_ITEMS = [
  {
    id: "h1",
    label: "Название",
    command: ["WrapInHeading", 1],
    sx: { fontSize: 21, fontWeight: 700, lineHeight: 1.2 },
  },
  {
    id: "h2",
    label: "Заголовок",
    command: ["WrapInHeading", 2],
    sx: { fontSize: 17, fontWeight: 700, lineHeight: 1.25 },
  },
  {
    id: "h3",
    label: "Подзаголовок",
    command: ["WrapInHeading", 3],
    sx: { fontSize: 15, fontWeight: 700, lineHeight: 1.3 },
  },
  {
    id: "paragraph",
    label: "Основной текст",
    command: ["WrapInHeading", 0],
    sx: { fontSize: 14, fontWeight: 400, lineHeight: 1.35 },
  },
  {
    id: "code",
    label: "Моноширинный шрифт",
    command: ["CreateCodeBlock"],
    sx: {
      fontSize: 12.5,
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      lineHeight: 1.4,
    },
  },
  {
    id: "bullet",
    label: "Маркированный список",
    command: ["WrapInBulletList"],
    prefix: "• ",
  },
  {
    id: "ordered",
    label: "Нумерованный список",
    command: ["WrapInOrderedList"],
    prefix: "1. ",
  },
];

const QUOTE_ITEM = {
  id: "quote",
  label: "Блок цитаты",
  command: ["WrapInBlockquote"],
  prefix: "│ ",
};

function MarkToggle({ title, active, onClick, children }) {
  return (
    <Tooltip title={title}>
      <IconButton
        size="small"
        aria-label={title}
        aria-pressed={active || undefined}
        onClick={onClick}
        sx={(theme) => {
          const activeBg =
            theme.palette.accents?.yellow || theme.palette.warning.main;
          return {
            width: 30,
            height: 24,
            borderRadius: "4px",
            color: active ? "#fff" : "text.primary",
            bgcolor: active ? activeBg : "transparent",
            "&:hover": {
              bgcolor: active ? activeBg : "action.hover",
            },
          };
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function BlockItem({ item, active, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 0.75,
        px: 1,
        py: 0.75,
        borderRadius: "12px",
        textAlign: "left",
        color: "text.secondary",
        transition: "color 160ms ease, background-color 160ms ease",
        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
      }}
    >
      <Box
        sx={{
          width: 18,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "inherit",
        }}
      >
        {active && <CheckIcon sx={{ fontSize: 17 }} />}
      </Box>
      <Typography
        component="span"
        sx={{
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.35,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          ...item.sx,
        }}
      >
        {item.prefix ? `${item.prefix}${item.label}` : item.label}
      </Typography>
    </ButtonBase>
  );
}

export default function BioFormatMenu({ execRef }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [paletteAnchor, setPaletteAnchor] = useState(null);
  const [activeBlock, setActiveBlock] = useState("paragraph");
  const [marks, setMarks] = useState({});
  const [activeHighlightColor, setActiveHighlightColor] = useState(
    DEFAULT_BIO_HIGHLIGHT_COLOR,
  );
  // Цвет маркера именно в текущем выделении: без него в палитре
  // не отмечен ни один оттенок.
  const [selectionHighlightColor, setSelectionHighlightColor] = useState(null);
  const open = Boolean(anchorEl);
  const paletteOpen = Boolean(paletteAnchor);

  const readState = useCallback(() => {
    const next = execRef.current?.getFormatState?.();
    if (!next) return;
    setActiveBlock(next.block || "paragraph");
    setMarks(next.marks || {});
    const highlightColor = next.marks?.highlight || null;
    setSelectionHighlightColor(highlightColor);
    if (highlightColor) {
      setActiveHighlightColor(highlightColor);
    }
  }, [execRef]);

  const handleOpen = (event) => {
    readState();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setPaletteAnchor(null);
    setAnchorEl(null);
  };

  const toggleMark = (command, payload) => {
    execRef.current?.exec(command, payload);
    window.setTimeout(readState, 0);
  };

  const clearFormatting = () => {
    execRef.current?.clearFormatting?.();
    window.setTimeout(readState, 0);
  };

  const openPalette = (event) => {
    readState();
    setPaletteAnchor(event.currentTarget);
  };

  const applyHighlightColor = (color) => {
    execRef.current?.exec("SetBioHighlight", color);
    setActiveHighlightColor(color);
    setPaletteAnchor(null);
    window.setTimeout(readState, 0);
  };

  const applyBlock = (item) => {
    if (item.id === "paragraph") {
      execRef.current?.setParagraph?.();
    } else {
      execRef.current?.exec(item.command[0], item.command[1]);
    }
    setActiveBlock(item.id);
    handleClose();
    window.setTimeout(() => {
      readState();
      execRef.current?.focus?.();
    }, 0);
  };

  return (
    <>
      <Tooltip title="Формат текста">
        <IconButton
          size="small"
          aria-label="Формат текста"
          aria-haspopup="menu"
          aria-expanded={open || undefined}
          onClick={handleOpen}
          sx={{
            width: 40,
            height: 36,
            borderRadius: "999px",
            color: "inherit",
            p: 0,
            width: "auto",
            height: "auto",
            borderRadius: 0,
            "&:hover": { bgcolor: "transparent" },
          }}
        >
          <TextFormatIcon height={15} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        transitionDuration={{ enter: 140, exit: 100 }}
        slotProps={{
          paper: {
            sx: (t) => {
              const dark = t.palette.mode === "dark";
              const borderColor = dark
                ? "rgba(255, 255, 255, 0.1)"
                : t.palette.divider;
              return {
                mt: 1.25,
                width: 222,
                maxWidth: "calc(100vw - 24px)",
                borderRadius: "20px",
                border: "1px solid",
                borderColor,
                bgcolor: dark ? "#1E1E1E" : "#FFFFFF",
                backgroundImage: "none",
                boxShadow: dark
                  ? "0 18px 44px rgba(0, 0, 0, 0.55)"
                  : "0 18px 44px rgba(0, 0, 0, 0.18)",
                overflow: "visible",
                "&::before": popoverArrowSx({ borderColor }),
              };
            },
          },

          list: { sx: { p: 0 } },
        }}
      >
        <Box sx={{ px: 1.25, py: 0.5 }}>
          <Box
            sx={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              alignItems: "center",
              justifyItems: "center",
            }}
          >
            <MarkToggle
              title="Жирный"
              active={Boolean(marks.strong)}
              onClick={() => toggleMark("ToggleStrong")}
            >
              <BoldIcon height={14} />
            </MarkToggle>
            <MarkToggle
              title="Курсив"
              active={Boolean(marks.emphasis)}
              onClick={() => toggleMark("ToggleEmphasis")}
            >
              <ItalicIcon height={14} />
            </MarkToggle>
            <MarkToggle
              title="Подчёркнутый"
              active={Boolean(marks.underline)}
              onClick={() => toggleMark("ToggleBioUnderline")}
            >
              <UnderlineIcon height={14} />
            </MarkToggle>
            <MarkToggle
              title="Зачеркнутый"
              active={Boolean(marks.strikethrough)}
              onClick={() => toggleMark("ToggleStrikeThrough")}
            >
              <StrikethroughIcon height={14} />
            </MarkToggle>
            <MarkToggle
              title="Маркер"
              active={Boolean(marks.highlight) || paletteOpen}
              onClick={() =>
                toggleMark("ToggleBioHighlight", activeHighlightColor)
              }
            >
              <HighlighterIcon height={14} />
            </MarkToggle>
            <Tooltip title="Цвет маркера">
              <IconButton
                size="small"
                aria-label="Цвет маркера"
                aria-haspopup="menu"
                aria-expanded={paletteOpen || undefined}
                onClick={openPalette}
                sx={(theme) => {
                  const activeBg =
                    theme.palette.accents?.yellow ||
                    theme.palette.warning.main;
                  return {
                    width: 26,
                    height: 24,
                    p: 0,
                    borderRadius: "4px",
                    bgcolor: paletteOpen ? activeBg : "transparent",
                    "&:hover": {
                      bgcolor: paletteOpen ? activeBg : "action.hover",
                    },
                  };
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor:
                      BIO_HIGHLIGHT_COLORS.find(
                        (color) => color.id === activeHighlightColor,
                      )?.hex || "#FFA92E",
                  }}
                />
              </IconButton>
            </Tooltip>
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                left: "66.666%",
                top: "50%",
                width: "1px",
                height: 14,
                bgcolor: "divider",
                transform: "translate(-50%, -50%)",
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ mx: 1.5 }} />

        <Box sx={{ p: 0.75 }}>
          {BLOCK_ITEMS.map((item) => (
            <BlockItem
              key={item.id}
              item={item}
              active={activeBlock === item.id}
              onClick={() => applyBlock(item)}
            />
          ))}
        </Box>

        <Divider sx={{ mx: 1.5 }} />

        <Box sx={{ p: 0.75 }}>
          <BlockItem
            item={QUOTE_ITEM}
            active={activeBlock === QUOTE_ITEM.id}
            onClick={() => applyBlock(QUOTE_ITEM)}
          />
        </Box>

        <Divider sx={{ mx: 1.5 }} />

        <Box sx={{ p: 0.75 }}>
          <ButtonBase
            onClick={clearFormatting}
            sx={{
              width: "100%",
              justifyContent: "flex-start",
              gap: 0.75,
              px: 1,
              py: 0.75,
              borderRadius: "12px",
              textAlign: "left",
              color: "text.secondary",
              transition: "color 160ms ease, background-color 160ms ease",
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            }}
          >
            <Box
              sx={{
                width: 18,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FormatClearIcon sx={{ fontSize: 17 }} />
            </Box>
            <Typography
              component="span"
              sx={{
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.35,
                whiteSpace: "nowrap",
              }}
            >
              Очистить форматирование
            </Typography>
          </ButtonBase>
        </Box>
      </Menu>

      <Menu
        anchorEl={paletteAnchor}
        open={paletteOpen}
        onClose={() => setPaletteAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        transitionDuration={{ enter: 120, exit: 90 }}
        slotProps={{
          paper: {
            sx: (theme) => {
              const dark = theme.palette.mode === "dark";
              return {
                mt: 0,
                minWidth: 164,
                borderRadius: "16px",
                border: "1px solid",
                borderColor: dark ? "rgba(255, 255, 255, 0.1)" : "divider",
                bgcolor: dark ? "#2A2A2A" : "#FFFFFF",
                backgroundImage: "none",
                boxShadow: dark
                  ? "0 16px 36px rgba(0, 0, 0, 0.5)"
                  : "0 16px 36px rgba(0, 0, 0, 0.16)",
                overflow: "hidden",
              };
            },
          },

          list: { sx: { p: 0.5 } },
        }}
      >
        {BIO_HIGHLIGHT_COLORS.map((color) => (
          <MenuItem
            key={color.id}
            onClick={() => applyHighlightColor(color.id)}
            sx={{
              borderRadius: "10px",
              gap: 1.25,
              pl: 1,
              pr: 1.25,
              py: 0.65,
              fontSize: 13.5,
            }}
          >
            <Box
              sx={{
                width: 18,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "inherit",
              }}
            >
              {selectionHighlightColor === color.id && (
                <CheckIcon sx={{ fontSize: 17 }} />
              )}
            </Box>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                flexShrink: 0,
                bgcolor: color.hex,
              }}
            />
            <Typography
              component="span"
              sx={{ fontSize: 13.5, lineHeight: 1.3 }}
            >
              {color.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
