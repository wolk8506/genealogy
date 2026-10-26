import React from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Typography,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import appIcon from "../../img/app_icon.png";

// Сайдбар настроек в духе macOS: поиск и список разделов
// с цветными плитками иконок и синей пилюлей выбранного пункта.
export default function SettingsSidebar({
  sections,
  activeId,
  query,
  onQueryChange,
  onSelect,
}) {
  const regular = sections.filter((s) => !s.danger);
  const dangerous = sections.filter((s) => s.danger);

  const renderItem = (section) => {
    const Icon = section.icon;
    const selected = section.id === activeId;
    const accent = section.danger ? "error.main" : "primary.main";

    return (
      <ListItemButton
        key={section.id}
        selected={selected}
        onClick={() => onSelect(section.id)}
        sx={{
          borderRadius: "10px",
          mb: "2px",
          minHeight: 32,
          height: 32,
          px: "8px",
          py: 0,
          color: selected ? "#fff" : "text.primary",
          "&.Mui-selected": {
            bgcolor: accent,
            color: "#fff",
            "&:hover": {
              bgcolor: accent,
            },
          },
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "5px",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            mr: 1.25,
            bgcolor: selected
              ? "rgba(255,255,255,0.22)"
              : (t) => t.palette.accents?.[section.color] || section.color,
            color: "#fff",
            "& svg": { fontSize: 13 },
          }}
        >
          <Icon />
        </Box>
        <ListItemText
          primary={section.title}
          primaryTypographyProps={{
            fontSize: "0.85rem",
            lineHeight: 1.1,
            fontWeight: selected ? 600 : 500,
            color: "inherit",
            noWrap: true,
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        position: "sticky",
        // 50px фиксированный тулбар + 6px отступ, чтобы панель
        // не уезжала под шапку при прокрутке страницы.
        top: 56,
        height: "calc(100vh - 64px)",
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
        borderRadius: "14px",
        border: "1px solid",
        borderColor: "divider",
        p: 1,
        bgcolor: (t) => t.palette.glass.surface,
        backdropFilter: "blur(20px)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1,
          pt: 1,
          pb: 1.5,
        }}
      >
        <Box
          component="img"
          src={appIcon}
          alt="Genealogy"
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontSize="0.95rem" fontWeight={700} lineHeight={1.2} noWrap>
            Genealogy
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
          >
            Настройки
          </Typography>
        </Box>
      </Box>
      <TextField
        fullWidth
        size="small"
        placeholder="Поиск настроек"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 17, color: "text.secondary" }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1,
          "& .MuiOutlinedInput-root": {
            height: 34,
            fontSize: "0.8rem",
            borderRadius: "9px",
            bgcolor: (t) =>
              alpha(
                t.palette.mode === "dark" ? "#ffffff" : "#000000",
                0.05,
              ),
            "& fieldset": { border: "none" },
          },
          "& .MuiInputBase-input": { py: 0 },
        }}
      />
      {sections.length === 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", px: 1, py: 2, textAlign: "center" }}
        >
          Ничего не найдено
        </Typography>
      )}
      <List disablePadding>
        {regular.map(renderItem)}
        {dangerous.length > 0 && (
          <Box key="danger-sep" sx={{ mt: 1, pt: 1 }}>
            {dangerous.map(renderItem)}
          </Box>
        )}
      </List>
    </Box>
  );
}
