// Режимы построения дерева — glass-капсула, Base UI Toggle (иконки).

import React from "react";
import { Tooltip } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../toolbarTokens";

const MODES = [
  { value: "ancestors", label: "Предки", Icon: AccountTreeIcon, rotate: "270deg" },
  { value: "descendants", label: "Потомки", Icon: AccountTreeIcon, rotate: "90deg" },
  { value: "full", label: "Полное дерево", Icon: AccountTreeIcon },
  { value: "radial", label: "Радиальное (эксперимент)", Icon: DonutLargeIcon },
  { value: "fan", label: "Веер предков", Icon: PieChartOutlineOutlinedIcon },
];

function ModeSegment({ value, current, onSelect, label, Icon, rotate }) {
  const pressed = current === value;
  return (
    <Tooltip title={label}>
      <Toggle
        pressed={pressed}
        onClick={() => onSelect(value)}
        render={(props, state) => (
          <ToolbarSegmentHit {...props} pressed={state.pressed} />
        )}
      >
        <Icon
          sx={{
            fontSize: TOOLBAR_HIT.iconSize,
            color: "inherit",
            ...(rotate ? { rotate } : null),
          }}
        />
      </Toggle>
    </Tooltip>
  );
}

export default function GenealogyTreeModeCluster({ mode, onModeChange }) {
  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      {MODES.map(({ value, label, Icon, rotate }) => (
        <ModeSegment
          key={value}
          value={value}
          current={mode}
          onSelect={onModeChange}
          label={label}
          Icon={Icon}
          rotate={rotate}
        />
      ))}
    </ToolbarButtonGroup>
  );
}
