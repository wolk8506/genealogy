// Слои карты: фото / события / справочник — сегменты в glass-капсуле (Base UI Toggle).

import React from "react";
import { Tooltip, Typography } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../toolbarTokens";

function LayerSegment({ active, onClick, title, Icon, label }) {
  return (
    <Tooltip title={title}>
      <Toggle
        pressed={active}
        onClick={onClick}
        render={(props, state) => (
          <ToolbarSegmentHit
            {...props}
            pressed={state.pressed}
            sx={{ gap: TOOLBAR_HIT.gapIconLabelPx }}
          />
        )}
      >
        <Icon
          sx={{
            fontSize: TOOLBAR_HIT.iconSize,
            color: "inherit",
          }}
        />
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
          {label}
        </Typography>
      </Toggle>
    </Tooltip>
  );
}

export default function MapLayerFilterCluster({
  showPhotos,
  showEvents,
  showExternal,
  onTogglePhotos,
  onToggleEvents,
  onToggleExternal,
  externalLabel = "Справ.",
}) {
  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      <LayerSegment
        active={showPhotos}
        onClick={onTogglePhotos}
        title="Показать или скрыть точки фото"
        Icon={PhotoLibraryIcon}
        label="Фото"
      />
      <LayerSegment
        active={showEvents}
        onClick={onToggleEvents}
        title="Показать или скрыть события"
        Icon={EventIcon}
        label="События"
      />
      <LayerSegment
        active={showExternal}
        onClick={onToggleExternal}
        title="Показать или скрыть справочник"
        Icon={ContactsIcon}
        label={externalLabel}
      />
    </ToolbarButtonGroup>
  );
}
