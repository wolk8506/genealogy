import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  styled,
  Chip,
} from "@mui/material";
import { indigo } from "@mui/material/colors";
import GroupIcon from "@mui/icons-material/Group";
import CloseIcon from "@mui/icons-material/Close";

const SelectContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$expanded",
})(({ theme, $expanded }) => ({
  WebkitAppRegion: "no-drag",
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.standard,
  }),
  fontSize: 20,
  height: 34,
  width: $expanded ? 420 : 34, // Чуть увеличил ширину для чипов
  overflow: "hidden",
  cursor: "pointer",
}));

export default function ExpandingPeopleSelect({
  allPeople,
  selectedPeople,
  onChange,
  photos,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef(null);

  // 1. Умная сортировка: Выбранные сверху + Фильтр по фото
  const processedPeople = useMemo(() => {
    // Сначала фильтруем тех, у кого есть фото
    const idsInPhotos = new Set();
    photos?.forEach((p) => {
      if (p.owner) idsInPhotos.add(p.owner);
      if (p.people) p.people.forEach((id) => idsInPhotos.add(id));
    });

    const activePeople = allPeople.filter((p) => idsInPhotos.has(p.id));

    // Теперь сортируем: выбранные попадают наверх
    return [...activePeople].sort((a, b) => {
      const aSel = selectedPeople.some((p) => p.id === a.id);
      const bSel = selectedPeople.some((p) => p.id === b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [allPeople, photos, selectedPeople]);

  useEffect(() => {
    if (selectedPeople.length > 0) {
      setIsExpanded(true);
    } else if (!isMenuOpen) {
      // Если никто не выбран И меню закрыто — сворачиваем
      setIsExpanded(false);
    }
  }, [selectedPeople, isMenuOpen]);

  const handleContainerClick = (e) => {
    if (e.target.closest(".clear-button")) return;
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setIsMenuOpen(true);
    }
  };

  const getName = (p) =>
    `${p.firstName || ""} ${p.lastName || p.maidenName || ""}`.trim();

  return (
    <SelectContainer
      $expanded={isExpanded}
      onClick={handleContainerClick}
      sx={{
        border: "1px solid",
        borderColor: isMenuOpen ? "primary.main" : "divider",
        bgcolor: isMenuOpen ? "rgba(255,255,255,0.08)" : "transparent",
      }}
    >
      <IconButton size="small" sx={{ color: "white", p: 1 }}>
        <GroupIcon fontSize="inherit" />
      </IconButton>

      <Autocomplete
        multiple
        open={isMenuOpen}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        onOpen={() => setIsMenuOpen(true)}
        onClose={(event, reason) => {
          // 1. Если кликнули внутри инпута, не закрываем меню
          if (reason === "toggleInput") return;

          // 2. Закрываем само меню
          setIsMenuOpen(false);

          // 3. ЛОГИКА СВОРАЧИВАНИЯ:
          // Если после закрытия меню ничего не выбрано — схлопываем весь компонент
          if (selectedPeople.length === 0) {
            setIsExpanded(false);
          }
        }}
        disableCloseOnSelect
        options={processedPeople}
        // Группировка для визуального разделения выбранных и остальных
        groupBy={(option) =>
          selectedPeople.some((p) => p.id === option.id)
            ? "Выбранные"
            : "Остальные"
        }
        getOptionLabel={(u) => `${u.id} :: ${getName(u)}`}
        value={selectedPeople}
        onChange={onChange}
        limitTags={1}
        // КАСТОМНЫЕ ЧИПЫ
        renderTags={(value, getTagProps) => {
          if (value.length === 0) return null;

          const { key, ...tagProps } = getTagProps({ index: 0 });
          return (
            <Box
              sx={{ display: "flex", gap: 0.5, ml: 1, alignItems: "center" }}
            >
              <Chip
                key={key} // Передаем ключ явно, как того просит ошибка
                label={getName(value[0])}
                size="small"
                variant="filled"
                sx={{
                  // bgcolor: "primary.main",
                  color: "white",
                  height: 24,
                  fontSize: "0.75rem",
                  maxWidth: 150,
                }}
                {...tagProps} // Передаем всё остальное (onDelete и т.д.)
              />
              {value.length > 1 && (
                <Chip
                  label={`+${value.length - 1}`}
                  size="small"
                  sx={{
                    bgcolor: indigo[300],
                    color: "white",
                    height: 24,
                    fontSize: "0.75rem",
                  }}
                />
              )}
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            placeholder={
              selectedPeople.length === 0 && isExpanded ? "Кто на фото?" : ""
            }
            variant="standard"
            InputProps={{ ...params.InputProps, disableUnderline: true }}
            sx={{
              ml: 1,
              flex: 1,
              "& .MuiInputBase-input": {
                color: "white",
                fontSize: "0.875rem",
                width: isExpanded ? "auto" : 0,
                padding: 0,
              },
            }}
          />
        )}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 350,
              zIndex: (theme) => theme.zIndex.modal + 1,
              // Стили для заголовков групп (Выбранные / Остальные)
              "& .MuiAutocomplete-groupLabel": {
                bgcolor: "background.paper",
                color: "primary.main",
                fontWeight: "bold",
                lineHeight: "30px",
              },
            },
          },
        }}
        sx={{
          flex: isExpanded ? 1 : 0,
          "& .MuiAutocomplete-endAdornment": { display: "none" },
        }}
      />

      {isExpanded && (
        <IconButton
          className="clear-button"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null, []);
            setIsExpanded(false);
            setIsMenuOpen(false);
          }}
          sx={{ color: "white", p: "5px", mr: 0.5 }}
        >
          <CloseIcon fontSize="inherit" style={{ fontSize: "14px" }} />
        </IconButton>
      )}
    </SelectContainer>
  );
}
