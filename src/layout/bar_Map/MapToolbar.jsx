import React from "react";
import { Box, Stack, IconButton, Typography, styled } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import RefreshIcon from "@mui/icons-material/Refresh";

const Pill = styled(Box)(({ theme }) => ({
  WebkitAppRegion: "no-drag",
  display: "flex",
  alignItems: "center",
  borderRadius: 20,
  height: 34,
  border: "1px solid",
  borderColor: theme.palette.divider,
  overflow: "hidden",
  backgroundColor: "rgba(255,255,255,0.05)",
  "&:hover": {
    borderColor: theme.palette.primary.main,
  },
}));

function FilterToggle({ active, onClick, icon, label, title }) {
  return (
    <Box
      onClick={onClick}
      title={title}
      sx={{
        px: 1.5,
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        cursor: "pointer",
        color: "white",
        opacity: active ? 1 : 0.45,
        fontSize: "0.78rem",
        fontWeight: 600,
        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
      }}
    >
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function MapToolbar({
  showPhotos,
  showEvents,
  onTogglePhotos,
  onToggleEvents,
  onRefresh,
  loading,
}) {
  return (
    <Stack direction="row" spacing={2} ml="auto">
      <Pill>
        <FilterToggle
          active={showPhotos}
          onClick={onTogglePhotos}
          title="Показать/скрыть фото"
          icon={<PhotoLibraryIcon sx={{ fontSize: 17 }} />}
          label="Фото"
        />
        <FilterToggle
          active={showEvents}
          onClick={onToggleEvents}
          title="Показать/скрыть события"
          icon={<EventIcon sx={{ fontSize: 17 }} />}
          label="События"
        />
      </Pill>

      <IconButton
        size="small"
        title="Обновить точки"
        onClick={onRefresh}
        disabled={loading}
        sx={{ color: "white", border: "1px solid", borderColor: "divider", width: 34, height: 34 }}
      >
        <RefreshIcon fontSize="inherit" />
      </IconButton>
    </Stack>
  );
}
