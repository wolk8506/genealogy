import React from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Сайдбар настроек в духе macOS Settings: поиск + список разделов.
// Опасная зона отделена разделителем внизу.
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
    return (
      <ListItemButton
        key={section.id}
        selected={selected}
        onClick={() => onSelect(section.id)}
        sx={{
          borderRadius: 2,
          mb: 0.25,
          py: 1,
          "&.Mui-selected": {
            bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
            "&:hover": {
              bgcolor: (t) => alpha(t.palette.primary.main, 0.2),
            },
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <Icon
            fontSize="small"
            color={
              selected ? "primary" : section.danger ? "error" : "inherit"
            }
          />
        </ListItemIcon>
        <ListItemText
          primary={section.title}
          primaryTypographyProps={{
            fontSize: "0.875rem",
            fontWeight: selected ? 700 : 500,
            color: section.danger ? "error.main" : "text.primary",
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        width: 250,
        flexShrink: 0,
        borderRadius: 5,
        p: 1.5,
        position: "sticky",
        top: 8,
        maxHeight: "calc(100vh - 120px)",
        overflowY: "auto",
        bgcolor: (t) => alpha(t.palette.background.paper, 0.4),
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Поиск настроек"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 1,
          "& .MuiOutlinedInput-root": { borderRadius: "10px" },
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
          <Box key="danger-sep">
            <Divider sx={{ my: 1 }} />
            {dangerous.map(renderItem)}
          </Box>
        )}
      </List>
    </Paper>
  );
}
