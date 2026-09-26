import React, { useMemo } from "react";
import { Box, Stack, IconButton, Typography, styled } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import RefreshIcon from "@mui/icons-material/Refresh";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import ButtonConteiner from "../../components/ButtonConteiner";
import ExpandingPeopleSelect from "../bar_GlobalPhotoGallery/ExpandingPeopleSelect";

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
  allPeople = [],
  mapPeopleOptions = [],
  selectedPeople = [],
  onPeopleChange,
  showPhotos,
  showEvents,
  showExternal,
  onTogglePhotos,
  onToggleEvents,
  onToggleExternal,
  onRefresh,
  onFitBounds,
  loading,
  visiblePhotoCount = 0,
  visibleEventCount = 0,
  visibleExternalCount = 0,
}) {
  const peopleOptions = useMemo(() => {
    if (mapPeopleOptions.length > 0) return mapPeopleOptions;
    return allPeople;
  }, [allPeople, mapPeopleOptions]);

  const totalVisible =
    visiblePhotoCount + visibleEventCount + visibleExternalCount;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      ml="auto"
      alignItems="center"
      sx={{ WebkitAppRegion: "no-drag" }}
    >
      <ExpandingPeopleSelect
        allPeople={allPeople}
        selectedPeople={selectedPeople}
        onChange={onPeopleChange}
        options={peopleOptions}
        placeholder="Кто на карте?"
      />

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
        <FilterToggle
          active={showExternal}
          onClick={onToggleExternal}
          title="Показать/скрыть справочник"
          icon={<ContactsIcon sx={{ fontSize: 17 }} />}
          label="Справ."
        />
      </Pill>

      <Typography
        variant="caption"
        sx={{ color: "white", opacity: 0.75, whiteSpace: "nowrap" }}
      >
        {loading
          ? "…"
          : `Ф:${visiblePhotoCount} · С:${visibleEventCount} · Спр:${visibleExternalCount}`}
      </Typography>

      <ButtonConteiner>
        <IconButton
          size="small"
          title="Показать все точки"
          onClick={onFitBounds}
          disabled={loading || totalVisible === 0}
          sx={{ color: "white", p: 0.9 }}
        >
          <FitScreenIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </ButtonConteiner>

      <ButtonConteiner>
        <IconButton
          size="small"
          title="Обновить (Shift — перегеокодировать)"
          onClick={(e) => onRefresh?.(e)}
          disabled={loading}
          sx={{ color: "white", p: 0.9 }}
        >
          <RefreshIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </ButtonConteiner>
    </Stack>
  );
}
