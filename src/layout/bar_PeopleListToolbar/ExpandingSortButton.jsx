import React from "react";
import { Tooltip } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_HIT } from "../toolbarTokens";

export default function ExpandingSortButton({ sortOrder, onToggle }) {
  const isDesc = sortOrder === "desc";

  return (
    <Tooltip
      title={
        isDesc
          ? "Сортировка поколений: По убыванию"
          : "Сортировка поколений: По возрастанию"
      }
    >
      <ToolbarButtonGroup>
        <Toggle
          pressed={isDesc}
          onClick={onToggle}
          render={(props, state) => (
            <ToolbarSegmentHit {...props} pressed={state.pressed} />
          )}
        >
          <SupervisorAccountIcon
            sx={{
              fontSize: TOOLBAR_HIT.iconSize,
              color: "inherit",
            }}
          />
          {isDesc ? (
            <KeyboardArrowDownIcon
              sx={{
                fontSize: TOOLBAR_HIT.chevronSize,
                width: TOOLBAR_HIT.chevronSize,
                height: TOOLBAR_HIT.chevronSize,
                color: "inherit",
              }}
            />
          ) : (
            <KeyboardArrowUpIcon
              sx={{
                fontSize: TOOLBAR_HIT.chevronSize,
                width: TOOLBAR_HIT.chevronSize,
                height: TOOLBAR_HIT.chevronSize,
                color: "inherit",
              }}
            />
          )}
        </Toggle>
      </ToolbarButtonGroup>
    </Tooltip>
  );
}
