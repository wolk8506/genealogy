import React from "react";
import { Box, Stack, Typography, styled } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import CloseIcon from "@mui/icons-material/Close";
import { toolbarPillSx } from "../toolbarStyles";

const Pill = styled(Box)(({ theme }) => ({
  ...toolbarPillSx,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
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
        color: active ? "primary.main" : "text.primary",
        fontWeight: active ? 700 : 500,
        fontSize: "0.78rem",
        bgcolor: active ? "action.hover" : "transparent",
        "&:hover": { bgcolor: "action.selected" },
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
        color: "text.primary",
        opacity: active ? 1 : 0.45,
        fontSize: "0.78rem",
        fontWeight: 600,
        "&:hover": { bgcolor: "action.selected" },
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
  showExternal,
  onTogglePhotos,
  onToggleEvents,
  onToggleExternal,
  filterPerson,
  onClearPersonFilter,
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
              sx={{ fontWeight: 700, px: 1.5, color: "text.primary" }}
            >
              {month}
            </Typography>
          </>
        )}
      </Pill>

      {filterPerson && (
        <Pill>
          <Typography
            variant="caption"
            sx={{ px: 1.5, color: "text.primary", fontWeight: 600, maxWidth: 180 }}
            noWrap
          >
            {[filterPerson.firstName, filterPerson.lastName || filterPerson.maidenName]
              .filter(Boolean)
              .join(" ")}
          </Typography>
          <Box
            onClick={onClearPersonFilter}
            title="Показать всю ленту"
            sx={{
              px: 1,
              height: "100%",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              opacity: 0.7,
              "&:hover": { opacity: 1, bgcolor: "action.selected" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16, color: "text.primary" }} />
          </Box>
        </Pill>
      )}

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
        <FilterToggle
          active={showExternal}
          onClick={onToggleExternal}
          title="Показать/скрыть справочник"
          icon={<ContactsIcon sx={{ fontSize: 17 }} />}
          label="Спр."
        />
      </Pill>
    </Stack>
  );
}
