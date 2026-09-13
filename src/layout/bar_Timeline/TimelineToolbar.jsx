import React from "react";
import { Box, Stack, Typography, styled } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";

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

function SegButton({ active, onClick, children }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.75,
        height: "100%",
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        color: active ? "primary.main" : "white",
        fontWeight: active ? 700 : 500,
        fontSize: "0.78rem",
        bgcolor: active ? "rgba(255,255,255,0.08)" : "transparent",
        "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
      }}
    >
      {children}
    </Box>
  );
}

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

export default function TimelineToolbar({
  level,
  onLevelChange,
  showPhotos,
  showEvents,
  onTogglePhotos,
  onToggleEvents,
  year,
  month,
  onGoYears,
  onGoMonths,
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1, ml: 2 }}>
      <Pill>
        <SegButton onClick={onGoYears}>Лента</SegButton>
        {year && (
          <>
            <Typography variant="caption" color="text.secondary">
              /
            </Typography>
            <SegButton onClick={onGoMonths}>{year}</SegButton>
          </>
        )}
        {month && (
          <>
            <Typography variant="caption" color="text.secondary">
              /
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, px: 1.5, color: "white" }}
            >
              {month}
            </Typography>
          </>
        )}
      </Pill>

      <Box sx={{ flexGrow: 1 }} />
      <Pill>
        <SegButton active={level === "years"} onClick={() => onLevelChange("years")}>
          Годы
        </SegButton>
        <SegButton active={level === "months"} onClick={() => onLevelChange("months")}>
          Месяцы
        </SegButton>
        <SegButton active={level === "days"} onClick={() => onLevelChange("days")}>
          Дни
        </SegButton>
      </Pill>

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
    </Stack>
  );
}
