import React from "react";
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useNavigate } from "react-router-dom";
import ExpandingSearch from "../../components/ExpandingSearch";
import ButtonConteiner from "../../components/ButtonConteiner";
import PersonFillBadgePlusIcon from "../../components/svg/PersonFillBadgePlusIcon";
import TrashFillIcon from "../../components/svg/TrashFillIcon";
import { usePeopleListStore } from "../../store/usePeopleListStore";
import { toolbarPillSx } from "../toolbarStyles";

export default function ExternalToolbar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  const navigate = useNavigate();
  const hasArchived = usePeopleListStore((state) => state.hasArchived);
  const hasArchivedExternal = usePeopleListStore(
    (state) => state.hasArchivedExternal,
  );
  const trashHasItems = hasArchived || hasArchivedExternal;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      ml="auto"
      sx={{ WebkitAppRegion: "no-drag", justifyContent: "flex-end" }}
    >
      <ExpandingSearch
        value={search}
        onChange={setSearch}
        placeholder="Поиск по имени, ID, описанию…"
      />

      <Box sx={{ display: "flex", alignItems: "center" }}>
        <ToggleButtonGroup
          size="small"
          value={typeFilter}
          exclusive
          onChange={(_, value) => value && setTypeFilter(value)}
          sx={{
            ...toolbarPillSx,
            p: "3px",
            gap: 0.5,
            "& .MuiToggleButton-root": {
              color: "text.primary",
              border: "none",
              borderRadius: "14px",
              height: 30,
              py: 0,
              px: 1.2,
              textTransform: "none",
              "&.Mui-selected": {
                bgcolor: "rgba(153, 153, 153, 0.24)",
                color: "primary.main",
              },
            },
          }}
        >
          <ToggleButton value="all">Все</ToggleButton>
          <ToggleButton value="person">
            <PersonOutlineIcon sx={{ fontSize: 18, mr: 0.5 }} />
            Люди
          </ToggleButton>
          <ToggleButton value="pet">
            <PetsIcon sx={{ fontSize: 18, mr: 0.5 }} />
            Питомцы
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ButtonConteiner>
        <Tooltip title="Корзина">
          <IconButton
            onClick={() => navigate("/trash?tab=external")}
            size="small"
            sx={{ color: "text.primary", p: 1 }}
          >
            <Badge
              variant="dot"
              color="warning"
              invisible={!trashHasItems}
            >
              <TrashFillIcon color="inherit" fontSize="inherit" />
            </Badge>
          </IconButton>
        </Tooltip>
      </ButtonConteiner>

      <ButtonConteiner>
        <Tooltip title="Добавить человека/питомца">
          <IconButton
            onClick={() => navigate("/external?action=add")}
            size="small"
            sx={{ color: "text.primary", p: 0.9 }}
          >
            <PersonFillBadgePlusIcon
              sx={{ fontSize: 16, color: "text.primary" }}
            />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
    </Stack>
  );
}
