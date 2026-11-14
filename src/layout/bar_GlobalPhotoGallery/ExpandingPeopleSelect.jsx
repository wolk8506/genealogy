import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  IconButton,
  Chip,
} from "@mui/material";
import { indigo } from "@mui/material/colors";
import GroupIcon from "@mui/icons-material/Group";
import CloseIcon from "@mui/icons-material/Close";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import {
  useToolbarButtonGroupHitSx,
} from "../../components/ToolbarCapsuleContext";
import { toolbarButtonGroupHitSx } from "../toolbarStyles";
import { TOOLBAR_HIT, TOOLBAR_MENU } from "../toolbarTokens";

const EXPANDED_WIDTH = 320;

function PeopleSelectSurface({ hasSelection, onClick, children }) {
  const hitSx = useToolbarButtonGroupHitSx(hasSelection);

  return (
    <Box
      onClick={onClick}
      sx={{
        ...hitSx,
        display: "flex",
        alignItems: "center",
        gap: TOOLBAR_HIT.gapIconLabelPx,
        width: "100%",
        minWidth: 0,
        cursor: "pointer",
      }}
    >
      {children}
    </Box>
  );
}

export default function ExpandingPeopleSelect({
  allPeople,
  selectedPeople,
  onChange,
  photos,
  options,
  placeholder = "Кто на фото?",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef(null);

  const processedPeople = useMemo(() => {
    if (options) {
      return [...options].sort((a, b) => {
        const aSel = selectedPeople.some((p) => p.id === a.id);
        const bSel = selectedPeople.some((p) => p.id === b.id);
        if (aSel && !bSel) return -1;
        if (!aSel && bSel) return 1;
        return 0;
      });
    }
    const idsInPhotos = new Set();
    photos?.forEach((p) => {
      if (p.owner) idsInPhotos.add(p.owner);
      if (p.people) p.people.forEach((id) => idsInPhotos.add(id));
    });

    const activePeople = allPeople.filter((p) => idsInPhotos.has(p.id));

    return [...activePeople].sort((a, b) => {
      const aSel = selectedPeople.some((p) => p.id === a.id);
      const bSel = selectedPeople.some((p) => p.id === b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });
  }, [allPeople, photos, selectedPeople, options]);

  useEffect(() => {
    if (selectedPeople.length > 0) {
      setIsExpanded(true);
    } else if (!isMenuOpen) {
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

  const hasSelection = selectedPeople.length > 0;

  return (
    <ToolbarButtonGroup
      gap={0}
      sx={{
        width: isExpanded ? EXPANDED_WIDTH : "auto",
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
      }}
      contentSx={{
        alignItems: "center",
        width: "100%",
        minWidth: 0,
      }}
    >
      <PeopleSelectSurface
        hasSelection={hasSelection}
        onClick={handleContainerClick}
      >
        <Box sx={{ display: "flex", flexShrink: 0, p: 0, alignItems: "center" }}>
          <GroupIcon
            sx={{
              fontSize: TOOLBAR_HIT.iconSize,
              color: "inherit",
            }}
          />
        </Box>

        {isExpanded && (
          <Autocomplete
            multiple
            open={isMenuOpen}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onOpen={() => setIsMenuOpen(true)}
            onClose={(event, reason) => {
              if (reason === "toggleInput") return;
              setIsMenuOpen(false);
              if (selectedPeople.length === 0) {
                setIsExpanded(false);
              }
            }}
            disableCloseOnSelect
            options={processedPeople}
            groupBy={(option) =>
              selectedPeople.some((p) => p.id === option.id)
                ? "Выбранные"
                : "Остальные"
            }
            getOptionLabel={(u) => `${u.id} :: ${getName(u)}`}
            value={selectedPeople}
            onChange={onChange}
            limitTags={1}
            renderValue={(value, getItemProps) => {
              if (value.length === 0) return null;

              const { key, ...tagProps } = getItemProps({ index: 0 });
              return (
                <Box
                  sx={{ display: "flex", gap: 0.5, ml: 0.5, alignItems: "center" }}
                >
                  <Chip
                    key={key}
                    label={getName(value[0])}
                    size="small"
                    variant="filled"
                    sx={{
                      color: "inherit",
                      height: 24,
                      fontSize: "0.75rem",
                      maxWidth: 150,
                    }}
                    {...tagProps}
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
                  selectedPeople.length === 0 && isExpanded ? placeholder : ""
                }
                variant="standard"
                sx={{
                  ml: 0.5,
                  flex: 1,
                  minWidth: 0,
                  "& .MuiInputBase-input": {
                    color: "inherit",
                    fontSize: "0.875rem",
                    padding: 0,
                  },
                }}
                slotProps={{
                  ...params.slotProps,
                  input: { ...params.slotProps.input, disableUnderline: true },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  width: 350,
                  borderRadius: TOOLBAR_MENU.paperRadiusPx,
                  zIndex: (theme) => theme.zIndex.modal + 1,
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
              flex: 1,
              minWidth: 0,
              "& .MuiAutocomplete-endAdornment": { display: "none" },
            }}
          />
        )}

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
            sx={{
              ...toolbarButtonGroupHitSx(false),
              width: TOOLBAR_HIT.minWidth,
              height: TOOLBAR_HIT.minWidth,
              p: 0,
              flexShrink: 0,
              color: "inherit",
            }}
          >
            <CloseIcon sx={{ fontSize: TOOLBAR_HIT.chevronSize }} />
          </IconButton>
        )}
      </PeopleSelectSurface>
    </ToolbarButtonGroup>
  );
}
