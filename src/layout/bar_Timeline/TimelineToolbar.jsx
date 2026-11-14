import React from "react";
import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import CloseIcon from "@mui/icons-material/Close";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import MapLayerFilterCluster from "../bar_Map/MapLayerFilterCluster";
import {
  ToolbarSegmentHit,
  useToolbarButtonGroupHitSx,
} from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../toolbarTokens";
import {
  toolbarClusterSx,
  toolbarDragSpacerSx,
  toolbarRowSx,
} from "../appBarToolbarLayout";

function CapsuleText({ children, sx }) {
  return (
    <Typography
      variant="caption"
      component="span"
      sx={{
        px: TOOLBAR_HIT.segmentPaddingX,
        fontWeight: 600,
        fontSize: "0.75rem",
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: "inherit",
        opacity: 0.72,
        userSelect: "none",
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

function PersonFilterCloseButton({ onClick, children }) {
  const hitSx = useToolbarButtonGroupHitSx(false);
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{ ...hitSx, p: 0 }}
    >
      {children}
    </Box>
  );
}

function SegmentToggle({ pressed, onClick, title, children }) {
  return (
    <Tooltip title={title}>
      <Toggle
        pressed={pressed}
        onClick={onClick}
        render={(props, state) => (
          <ToolbarSegmentHit {...props} pressed={state.pressed} />
        )}
      >
        <Typography
          variant="caption"
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            lineHeight: 1,
            whiteSpace: "nowrap",
            color: "inherit",
          }}
        >
          {children}
        </Typography>
      </Toggle>
    </Tooltip>
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
  const personLabel = filterPerson
    ? [filterPerson.firstName, filterPerson.lastName || filterPerson.maidenName]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <Stack direction="row" sx={toolbarRowSx}>
      <Box sx={{ ...toolbarClusterSx, minWidth: 0 }}>
      <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
        <SegmentToggle pressed={!year} onClick={onGoYears} title="Вся лента">
          Лента
        </SegmentToggle>
        {year && (
          <>
            <CapsuleText>/</CapsuleText>
            <SegmentToggle
              pressed={Boolean(year) && !month}
              onClick={onGoMonths}
              title={`Год ${year}`}
            >
              {year}
            </SegmentToggle>
          </>
        )}
        {month && (
          <>
            <CapsuleText>/</CapsuleText>
            <CapsuleText>{month}</CapsuleText>
          </>
        )}
      </ToolbarButtonGroup>

      {filterPerson && (
        <>
        <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
          <CapsuleText
            sx={{
              opacity: 1,
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {personLabel}
          </CapsuleText>
          <Tooltip title="Показать всю ленту">
            <PersonFilterCloseButton
              onClick={onClearPersonFilter}
              aria-label="Сбросить фильтр по человеку"
            >
              <CloseIcon
                sx={{
                  fontSize: TOOLBAR_HIT.chevronSize,
                  color: "inherit",
                }}
              />
            </PersonFilterCloseButton>
          </Tooltip>
        </ToolbarButtonGroup>
        </>
      )}
      </Box>

      <Box sx={toolbarDragSpacerSx} />

      <Box sx={toolbarClusterSx}>
      <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
        <SegmentToggle
          pressed={level === "years"}
          onClick={() => onLevelChange("years")}
          title="Уровень: годы"
        >
          Годы
        </SegmentToggle>
        <SegmentToggle
          pressed={level === "months"}
          onClick={() => onLevelChange("months")}
          title="Уровень: месяцы"
        >
          Месяцы
        </SegmentToggle>
        <SegmentToggle
          pressed={level === "days"}
          onClick={() => onLevelChange("days")}
          title="Уровень: дни"
        >
          Дни
        </SegmentToggle>
      </ToolbarButtonGroup>

      <MapLayerFilterCluster
        showPhotos={showPhotos}
        showEvents={showEvents}
        showExternal={showExternal}
        onTogglePhotos={onTogglePhotos}
        onToggleEvents={onToggleEvents}
        onToggleExternal={onToggleExternal}
        externalLabel="Спр."
      />
      </Box>
    </Stack>
  );
}
