import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Box,
  InputBase,
  IconButton,
  alpha,
  styled,
  Tooltip,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  useTheme,
  Popper,
  ClickAwayListener,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useSelector, useDispatch } from "react-redux"; // Добавить импорты
import { setSearchQuery } from "../store/searchSlice"; // Путь к вашему слайсу
// import { setSearchQuery } from "../../../store/searchSlice"; // Путь к вашему слайсу

const SearchContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  height: 34,
  padding: 0,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.shorter,
  }),
  width: $expanded ? 250 : 34,
  position: "relative",
  zIndex: 2,
}));

export default function ExpandingSearch({
  value: propsValue, // Возвращаем пропс
  scope = "default", // Ключ страницы
  onChange,
  enableHashtags = false,
  placeholder = "Поиск...",
  tooltip = "Поиск...",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const dispatch = useDispatch();

  // 1. ЛОГИКА ВЫБОРА ЗНАЧЕНИЯ:
  // Если пропс propsValue передан (не undefined), используем его.
  // Если не передан — берем из Redux для конкретной страницы (scope).
  const reduxValue = useSelector((state) => state.search.queries[scope]) || "";
  // 1. Если в Redux что-то есть — это приоритет (клик по тегу)
  // 2. Если в Redux пусто, берем из пропсов (старое поведение)
  const value = reduxValue || propsValue || "";

  // Режим управления теперь тоже зависит от наличия данных в Redux
  const isControlledByProps = propsValue !== undefined && !reduxValue;

  // 2. ФУНКЦИЯ ОБНОВЛЕНИЯ:
  const handleValueChange = (newValue) => {
    if (isControlledByProps) {
      // Если работаем через пропсы (старые страницы)
      onChange?.(newValue);
    } else {
      // Если работаем через Redux (Галерея)
      dispatch(setSearchQuery({ scope, value: newValue }));
      onChange?.(newValue); // На всякий случай вызываем и onChange
    }
  };
  const [isFocused, setIsFocused] = useState(false);
  const [uniqueTags, setUniqueTags] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const anchorRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isControlledByProps) {
      onChange?.(value);
    }
  }, [value, isControlledByProps, onChange]);

  // Загрузка тегов из API
  useEffect(() => {
    if (isFocused && window.photoAPI?.getGlobalHashtags) {
      window.photoAPI.getGlobalHashtags().then((tags) => {
        // Сортируем алфавитно для удобства
        const sorted = (tags || []).sort((a, b) => a.localeCompare(b));
        setUniqueTags(sorted);
      });
    }
  }, [isFocused]);

  // Логика поиска и отображения тегов
  const hashtagMatch = useMemo(() => {
    if (!enableHashtags || !isFocused || uniqueTags.length === 0) return null;

    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Если введена просто решетка — показываем ВСЕ теги
    if (lastWord === "#") {
      return uniqueTags;
    }

    // Если введено #что-то — фильтруем
    if (lastWord && lastWord.startsWith("#") && lastWord.length > 1) {
      const searchPattern = lastWord.toLowerCase();
      const matches = uniqueTags.filter((tag) => {
        const t = tag.startsWith("#")
          ? tag.toLowerCase()
          : `#${tag.toLowerCase()}`;
        return t.startsWith(searchPattern);
      });
      return matches.length > 0 ? matches : null;
    }

    return null;
  }, [value, uniqueTags, enableHashtags, isFocused]);

  const showList = Boolean(hashtagMatch);

  // Подсказка в строке (Ghost Text) — только если уже начали писать после #
  const ghostText = useMemo(() => {
    if (!hashtagMatch || !isFocused || activeIndex >= hashtagMatch.length)
      return "";

    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Не показываем ghost text, если введена только решетка (чтобы не путать)
    if (lastWord === "#") return "";

    const currentSuggestion = hashtagMatch[activeIndex];
    const formattedSuggestion = currentSuggestion.startsWith("#")
      ? currentSuggestion
      : `#${currentSuggestion}`;

    if (formattedSuggestion.toLowerCase().startsWith(lastWord.toLowerCase())) {
      const prefix = value.substring(0, value.length - lastWord.length);
      return prefix + formattedSuggestion;
    }
    return "";
  }, [value, hashtagMatch, activeIndex, isFocused]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (showList && listRef.current) {
      const activeElement = listRef.current.querySelector(
        `[data-idx="${activeIndex}"]`,
      );
      if (activeElement) activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showList]);

  const applyTag = (tag) => {
    if (!tag) return;
    const cursor = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");

    if (lastHashIndex !== -1) {
      const formattedTag = tag.startsWith("#") ? tag : `#${tag}`;
      const newBefore = value.slice(0, lastHashIndex) + formattedTag + " ";
      const newAfter = value.slice(cursor);

      handleValueChange(newBefore + newAfter); // Вызов Redux вместо onChange

      setTimeout(() => {
        inputRef.current?.focus();
        const pos = newBefore.length;
        inputRef.current?.setSelectionRange(pos, pos);
      }, 10);
    }
  };

  const handleKeyDown = (e) => {
    if (!showList || !hashtagMatch) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev + 1 < hashtagMatch.length ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (
      e.key === "Enter" ||
      e.key === "Tab" ||
      (e.key === "ArrowRight" &&
        inputRef.current?.selectionStart === value.length)
    ) {
      e.preventDefault();
      applyTag(hashtagMatch[activeIndex]);
    } else if (e.key === "Escape") {
      setIsFocused(false); // Закрыть список по Esc
    }
  };

  const isExpanded = isFocused || value.length > 0;

  return (
    <ClickAwayListener onClickAway={() => setIsFocused(false)}>
      <Box sx={{ display: "inline-block", WebkitAppRegion: "no-drag" }}>
        <Tooltip title={!isExpanded ? tooltip : ""}>
          <SearchContainer
            ref={anchorRef}
            $expanded={isExpanded}
            sx={{
              border: "1px solid",
              borderColor: isFocused
                ? "primary.main"
                : alpha(theme.palette.divider, 0.2),
              bgcolor: isFocused
                ? alpha(theme.palette.common.white, 0.05)
                : "transparent",
            }}
          >
            <IconButton
              size="small"
              onClick={() => inputRef.current?.focus()}
              sx={{ color: "white", p: 1 }}
            >
              <SearchIcon fontSize="inherit" />
            </IconButton>

            <Box
              sx={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              {ghostText && (
                <Typography
                  sx={{
                    position: "absolute",
                    left: 9,
                    color: alpha("#fff", 0.3),
                    fontSize: "0.875rem",
                    pointerEvents: "none",
                    whiteSpace: "pre",
                  }}
                >
                  {ghostText}
                </Typography>
              )}

              <InputBase
                inputRef={inputRef}
                placeholder={isExpanded ? placeholder : ""}
                value={value}
                onChange={(e) => handleValueChange(e.target.value)} // В Redux
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                sx={{
                  ml: 1,
                  flex: 1,
                  color: "white",
                  fontSize: "0.875rem",
                  zIndex: 1,
                  opacity: isExpanded ? 1 : 0,
                }}
              />
            </Box>

            {value.length > 0 && (
              <IconButton
                size="small"
                onClick={() => {
                  handleValueChange(""); // Очистка через Redux
                  setIsFocused(false);
                }}
                sx={{ color: "white", p: "5px", mr: 0.5 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </SearchContainer>
        </Tooltip>

        <Popper
          open={showList}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{
            zIndex: 99999,
            width: anchorRef.current?.clientWidth || 250,
            height: 34,
          }}
          modifiers={[{ name: "offset", options: { offset: [0, 8] } }]}
        >
          <Paper
            elevation={24}
            sx={{
              borderRadius: "12px",
              bgcolor: isDark ? "#252525" : "#fff",
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            <List
              ref={listRef}
              sx={{ p: 0.5, maxHeight: 250, overflow: "auto" }}
            >
              {hashtagMatch?.map((tag, idx) => {
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
                        bgcolor: alpha(theme.palette.primary.main, 0.25),
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.35),
                        },
                      },
                      outline: isActive
                        ? `1px solid ${theme.palette.primary.main}`
                        : "none",
                    }}
                  >
                    <ListItemText
                      primary={tag.startsWith("#") ? tag : `#${tag}`}
                      primaryTypographyProps={{
                        fontSize: "0.85rem",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive
                          ? theme.palette.primary.main
                          : "inherit",
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
