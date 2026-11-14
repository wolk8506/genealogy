// Фильтр типа: Все / Люди / Питомцы — сегменты в glass-капсуле (Base UI Toggle).

import React from "react";
import { Tooltip, Typography } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import PetsIcon from "@mui/icons-material/Pets";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../toolbarTokens";

function TypeSegment({ value, current, onSelect, tooltip, children }) {
  const pressed = current === value;
  return (
    <Tooltip title={tooltip}>
      <Toggle
        pressed={pressed}
        onClick={() => onSelect(value)}
        render={(props, state) => (
          <ToolbarSegmentHit
            {...props}
            pressed={state.pressed}
            sx={{ gap: TOOLBAR_HIT.gapIconLabelPx }}
          />
        )}
      >
        {children}
      </Toggle>
    </Tooltip>
  );
}

export default function ExternalTypeFilter({ value, onChange }) {
  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      <TypeSegment
        value="all"
        current={value}
        onSelect={onChange}
        tooltip="Все записи"
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            lineHeight: 1,
            color: "inherit",
          }}
        >
          Все
        </Typography>
      </TypeSegment>

      <TypeSegment
        value="person"
        current={value}
        onSelect={onChange}
        tooltip="Только люди"
      >
        <PersonOutlineOutlinedIcon
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
          Люди
        </Typography>
      </TypeSegment>

      <TypeSegment
        value="pet"
        current={value}
        onSelect={onChange}
        tooltip="Только питомцы"
      >
        <PetsIcon
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
            color: "inherit",
          }}
        >
          Питомцы
        </Typography>
      </TypeSegment>
    </ToolbarButtonGroup>
  );
}
