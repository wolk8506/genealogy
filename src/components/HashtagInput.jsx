import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  alpha,
  useTheme,
  colors,
} from "@mui/material";

// Утилита для расчета координат (без изменений)
const getCaretCoordinates = (element, position) => {
  const div = document.createElement("div");
  const style = window.getComputedStyle(element);
  for (const prop of style) {
    div.style[prop] = style.getPropertyValue(prop);
  }
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.left = "0";
  div.style.top = "0";
  div.textContent = element.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const coords = {
    offsetLeft: span.offsetLeft,
    offsetTop: span.offsetTop - element.scrollTop,
  };
  document.body.removeChild(div);
  return coords;
};

const HashtagInput = ({ value, onChange, suggestions = [], placeholder }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const [filteredTags, setFilteredTags] = useState([]);
  const [showList, setShowList] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Сброс индекса при изменении списка
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredTags]);

  // Автоскролл к активному элементу в списке
  useEffect(() => {
    if (showList && listRef.current) {
      const activeElement = listRef.current.querySelector(
        `[data-idx="${activeIndex}"]`,
      );
      if (activeElement) activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showList]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 1];

    // ИЗМЕНЕНО: Открываем, если слово начинается с # (даже если это просто #)
    if (lastWord?.startsWith("#")) {
      const { offsetLeft, offsetTop } = getCaretCoordinates(e.target, cursor);
      setCaretPos({ top: offsetTop, left: offsetLeft });

      let match = [];
      if (lastWord === "#") {
        // Показываем все варианты, если введена только решетка
        match = suggestions;
      } else {
        // Фильтруем по введенному тексту
        const searchPattern = lastWord.toLowerCase();
        match = suggestions.filter((t) => {
          const tag = t.startsWith("#")
            ? t.toLowerCase()
            : `#${t.toLowerCase()}`;
          return tag.startsWith(searchPattern);
        });
      }

      setFilteredTags(match);
      setShowList(match.length > 0);
    } else {
      setShowList(false);
    }
  };

  const applyTag = (tag) => {
    const textArea = containerRef.current?.querySelector("textarea");
    if (!textArea) return;
    const cursor = textArea.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");

    if (lastHashIndex !== -1) {
      const formattedTag = tag.startsWith("#") ? tag : `#${tag}`;
      const newBefore = value.slice(0, lastHashIndex) + formattedTag + " ";
      const newAfter = value.slice(cursor);
      onChange(newBefore + newAfter);
      setShowList(false);

      setTimeout(() => {
        textArea.focus();
        const newPos = newBefore.length;
        textArea.setSelectionRange(newPos, newPos);
      }, 10);
    }
  };

  const handleKeyDown = (e) => {
    if (!showList || filteredTags.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 < filteredTags.length ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyTag(filteredTags[activeIndex]);
    } else if (e.key === "Escape") {
      setShowList(false);
    }
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative", width: "100%" }}>
      {/* //!!! Слой подсветки */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          p: "8.5px 14px", //!!! корректировать здесь!!!!
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "1rem",
          lineHeight: "1.4375em",
          pointerEvents: "none",
          color: "transparent",
          zIndex: 1,
          "& .h-tag": {
            bgcolor: isDark
              ? colors.blue[900] // "#0d47a1"
              : alpha(theme.palette.primary.main, 0.1),
            borderRadius: "4px",
            px: 0.5,
            mx: -0.5,
            color: isDark ? "#fff" : theme.palette.primary.main,
          },
        }}
      >
        {value.split(/(#[\p{L}\d_]+)/gu).map((part, i) =>
          part.startsWith("#") ? (
            <span key={i} className="h-tag">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </Box>

      <TextField
        label="Описание"
        multiline
        fullWidth
        rows={4}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown} // Добавлен обработчик
        variant="outlined"
        placeholder={placeholder}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            bgcolor: isDark ? alpha("#000", 0.1) : "transparent",
            zIndex: 2,
            "& fieldset": { borderColor: alpha(theme.palette.divider, 0.1) },
            "&.Mui-focused fieldset": {
              borderColor: theme.palette.primary.main,
              borderWidth: "1px",
            },
          },
          "& .MuiInputLabel-root": { zIndex: 3 },
        }}
      />

      {showList && (
        <Paper
          elevation={24}
          sx={{
            position: "absolute",
            zIndex: 5000,
            // Смещение, чтобы список не перекрывал курсор
            top: caretPos.top + 45,
            left: Math.min(
              caretPos.left,
              (containerRef.current?.clientWidth || 0) - 180,
            ),
            minWidth: 180,
            bgcolor: isDark ? "#252525" : "#fff",
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <List ref={listRef} sx={{ p: 0.5, maxHeight: 180, overflow: "auto" }}>
            {filteredTags.map((tag, idx) => {
              const isActive = idx === activeIndex;
              return (
                <ListItemButton
                  key={tag}
                  data-idx={idx}
                  selected={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyTag(tag);
                  }}
                  sx={{
                    borderRadius: "8px",
                    mb: 0.2,
                    "&.Mui-selected": {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.3),
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={tag.startsWith("#") ? tag : `#${tag}`}
                    primaryTypographyProps={{
                      fontSize: "0.85rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "primary.main" : "text.primary",
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default HashtagInput;
