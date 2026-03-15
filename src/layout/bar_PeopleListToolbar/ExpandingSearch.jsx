import React, { useState, useRef } from "react";
import { Box, InputBase, IconButton, alpha, styled } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

const SearchContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  display: "flex",
  alignItems: "center",

  bgcolor: "inherit",
  borderRadius: 20,
  padding: 0,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.shorter,
  }),
  width: $expanded ? 220 : 40,
  overflow: "hidden",
}));

export default function ExpandingSearch({
  value,
  onChange,
  placeholder = "Поиск...",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Состояние "развернуто": когда есть фокус ИЛИ когда поле не пустое
  const isExpanded = isFocused || value.length > 0;

  const handleIconClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = () => {
    onChange(""); // Очищаем через пропс родителя
    setIsFocused(false);
  };

  return (
    <SearchContainer
      $expanded={isExpanded}
      sx={{
        // alignItems: "center",
        border: "1px solid",
        borderColor: "divider",

        // p: 0,
        color: "text.secondary",
      }}
    >
      <IconButton
        size="small"
        onClick={handleIconClick}
        sx={{ color: "white", p: "9px" }}
      >
        <SearchIcon fontSize="small" />
      </IconButton>

      <InputBase
        inputRef={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        sx={{
          ml: 1,
          flex: 1,
          color: "white",
          fontSize: "0.875rem",
          // Скрываем инпут, когда свернуто
          opacity: isExpanded ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      />

      {value.length > 0 && (
        <IconButton
          size="small"
          onClick={handleClear}
          sx={{ color: "white", p: "5px" }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      )}
    </SearchContainer>
  );
}
