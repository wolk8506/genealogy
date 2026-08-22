import React from "react";
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useNavigate } from "react-router-dom";
import ExpandingSearch from "../../components/ExpandingSearch";
import ButtonConteiner from "../../components/ButtonConteiner";
import PersonFillBadgePlusIcon from "../../components/svg/PersonFillBadgePlusIcon";

export default function ExternalToolbar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
}) {
  const navigate = useNavigate();

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      ml="auto"
      sx={{ WebkitAppRegion: "no-drag", width: "100%", justifyContent: "flex-end" }}
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
            height: 34,
            borderRadius: 7,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.02)",
            '& .MuiToggleButton-root': {
              color: "white",
              border: "none",
              borderRadius: 6,
              textTransform: "none",
              px: 1.2,
              '&.Mui-selected': {
                bgcolor: "divider",
                color: "#90caf9",
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
        <Tooltip title="Добавить человека/питомца">
          <IconButton
            onClick={() => navigate("/external?action=add")}
            size="small"
            sx={{ color: "white", p: 0.9 }}
          >
            <PersonFillBadgePlusIcon
              sx={{ fontSize: "20px", color: "white" }}
            />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
    </Stack>
  );
}
