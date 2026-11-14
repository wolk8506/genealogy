import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Box,
  InputBase,
  IconButton,
  alpha,
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
import { useSelector, useDispatch } from "react-redux";
import { setSearchQuery } from "../store/searchSlice";
import ToolbarButtonGroup from "./ToolbarButtonGroup";
import { useToolbarButtonGroupHitSx } from "./ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../layout/toolbarTokens";

const SEARCH_EXPANDED_WIDTH = 250;
/** Иконка лупы в развёрнутом поле (app bar). */
const SEARCH_FIELD_ICON_SIZE = 18;
/** Кнопка очистки: белый кружок 12×12. */
const SEARCH_CLEAR_SIZE = 12;
const SEARCH_CLEAR_ICON_SIZE = 8;
const SEARCH_FONT_SIZE = 13;
const SEARCH_LINE_HEIGHT = 16;

function SearchCapsuleContent({
  isExpanded,
  isFocused,
  value,
  placeholder,
  ghostText,
  theme,
  inputRef,
  onFocus,
  onKeyDown,
  onChange,
  onClear,
}) {
  const hitSx = useToolbarButtonGroupHitSx(isFocused);
  const iconSize = isExpanded ? SEARCH_FIELD_ICON_SIZE : TOOLBAR_HIT.iconSize;

  const focusSearch = () => inputRef.current?.focus();

  return (
    <Box
      onClick={!isExpanded ? focusSearch : undefined}
      sx={{
        ...hitSx,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: isExpanded ? "flex-start" : "center",
        gap: isExpanded ? "6px" : 0,
        width: "100%",
        minWidth: 0,
        px: isExpanded ? "10px" : 0,
        cursor: isExpanded ? "text" : "pointer",
        "&:focus-within": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: "2px",
        },
      }}
    >
      <SearchIcon
        onClick={focusSearch}
        sx={{
          flex: "0 0 auto",
          width: iconSize,
          height: iconSize,
          fontSize: iconSize,
          color: "inherit",
          cursor: "pointer",
        }}
      />

      <Box
        sx={{
          position: "relative",
          flex: isExpanded ? 1 : "0 0 auto",
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          width: isExpanded ? undefined : 0,
          overflow: "hidden",
        }}
      >
        {ghostText && (
          <Typography
            sx={{
              position: "absolute",
              left: 0,
              color: alpha(theme.palette.text.primary, 0.3),
              fontSize: SEARCH_FONT_SIZE,
              lineHeight: `${SEARCH_LINE_HEIGHT}px`,
              pointerEvents: "none",
              whiteSpace: "pre",
            }}
          >
            {ghostText}
          </Typography>
        )}

        <InputBase
          inputRef={inputRef}
          inputProps={{ "data-app-search": "true" }}
          placeholder={isExpanded ? placeholder : ""}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          sx={{
            flex: 1,
            minWidth: 0,
            width: isExpanded ? "100%" : SEARCH_FIELD_ICON_SIZE,
            p: 0,
            fontFamily:
              '"SF Pro", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: SEARCH_FONT_SIZE,
            fontWeight: 500,
            lineHeight: `${SEARCH_LINE_HEIGHT}px`,
            letterSpacing: 0,
            color: "inherit",
            zIndex: 1,
            opacity: isExpanded ? 1 : 0,
            "& input": {
              p: 0,
              "&::placeholder": {
                color: "text.secondary",
                opacity: 1,
              },
            },
          }}
        />
      </Box>

      {value.length > 0 && (
        <IconButton
          size="small"
          onClick={onClear}
          aria-label="Очистить поиск"
          sx={{
            flexShrink: 0,
            p: 0,
            width: SEARCH_CLEAR_SIZE,
            height: SEARCH_CLEAR_SIZE,
            borderRadius: "50%",
            bgcolor: "#fff",
            color: (theme) =>
              theme.palette.mode === "dark" ? "#3a3a3a" : "#6e6e6e",
            "&:hover": {
              bgcolor: alpha("#fff", 0.92),
            },
          }}
        >
          <CloseIcon
            sx={{
              fontSize: SEARCH_CLEAR_ICON_SIZE,
              width: SEARCH_CLEAR_ICON_SIZE,
              height: SEARCH_CLEAR_ICON_SIZE,
            }}
          />
        </IconButton>
      )}
    </Box>
  );
}

export default function ExpandingSearch({
  value: propsValue,
  scope = "default",
  onChange,
  enableHashtags = false,
  placeholder = "Поиск...",
  tooltip = "Поиск… (Ctrl/⌘+K)",
  expandedWidth = SEARCH_EXPANDED_WIDTH,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const dispatch = useDispatch();

  const reduxValue = useSelector((state) => state.search.queries[scope]) || "";
  const value = reduxValue || propsValue || "";

  const isControlledByProps = propsValue !== undefined && !reduxValue;

  const handleValueChange = (newValue) => {
    if (isControlledByProps) {
      onChange?.(newValue);
    } else {
      dispatch(setSearchQuery({ scope, value: newValue }));
      onChange?.(newValue);
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

  useEffect(() => {
    if (isFocused && window.photoAPI?.getGlobalHashtags) {
      window.photoAPI.getGlobalHashtags().then((tags) => {
        const sorted = (tags || []).sort((a, b) => a.localeCompare(b));
        setUniqueTags(sorted);
      });
    }
  }, [isFocused]);

  const hashtagMatch = useMemo(() => {
    if (!enableHashtags || !isFocused || uniqueTags.length === 0) return null;

    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord === "#") {
      return uniqueTags;
    }

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

  const ghostText = useMemo(() => {
    if (!hashtagMatch || !isFocused || activeIndex >= hashtagMatch.length) {
      return "";
    }

    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

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

      handleValueChange(newBefore + newAfter);

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
      setIsFocused(false);
    }
  };

  const isExpanded = isFocused || value.length > 0;

  const handleClear = () => {
    handleValueChange("");
    setIsFocused(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setIsFocused(false)}>
      <Box
        ref={anchorRef}
        sx={{
          display: "inline-flex",
          flexShrink: 0,
          position: "relative",
          zIndex: 2,
          WebkitAppRegion: "no-drag",
        }}
      >
        <Tooltip title={!isExpanded ? tooltip : ""}>
          <ToolbarButtonGroup
            gap={0}
            sx={{
              width: isExpanded ? expandedWidth : TOOLBAR_CAPSULE.height,
              minWidth: isExpanded ? 130 : TOOLBAR_CAPSULE.height,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.shorter,
              }),
            }}
            contentSx={{ width: "100%", minWidth: 0 }}
          >
            <SearchCapsuleContent
              isExpanded={isExpanded}
              isFocused={isFocused}
              value={value}
              placeholder={placeholder}
              ghostText={ghostText}
              theme={theme}
              inputRef={inputRef}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              onChange={(e) => handleValueChange(e.target.value)}
              onClear={handleClear}
            />
          </ToolbarButtonGroup>
        </Tooltip>

        <Popper
          open={showList}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{
            zIndex: 99999,
            width: anchorRef.current?.clientWidth || expandedWidth,
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
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: "0.85rem",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive
                              ? theme.palette.primary.main
                              : "inherit",
                          },
                        },
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
