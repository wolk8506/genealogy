// Вкладки страницы человека: Инфо / Фото / Био / Файлы.

import React from "react";
import { Tooltip } from "@mui/material";
import { Toggle } from "@base-ui/react/toggle";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import ToolbarButtonGroup from "../../components/ToolbarButtonGroup";
import PersonFillIcon from "../../components/svg/PersonFillIcon";
import TextDocumentFillIcon from "../../components/svg/TextDocumentFillIcon";
import PhotoOnRectangleAngledIcon from "../../components/svg/PhotoOnRectangleAngledIcon";
import { ToolbarSegmentHit } from "../../components/ToolbarCapsuleContext";
import { TOOLBAR_CAPSULE, TOOLBAR_HIT } from "../toolbarTokens";

const TABS = [
  { value: "info", label: "Инфо", Icon: PersonFillIcon, isSvg: true },
  { value: "photo", label: "Фотоальбом", Icon: PhotoOnRectangleAngledIcon, isSvg: true },
  { value: "bio", label: "Биография", Icon: TextDocumentFillIcon, isSvg: true },
  { value: "files", label: "Файлы", Icon: FileCopyIcon, isSvg: false },
];

function TabSegment({ value, current, onSelect, label, Icon, isSvg }) {
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
        {isSvg ? (
          <Icon
            sx={{
              fontSize: TOOLBAR_HIT.iconSize,
              width: TOOLBAR_HIT.iconSize,
              height: TOOLBAR_HIT.iconSize,
              color: "inherit",
            }}
          />
        ) : (
          <Icon
            sx={{
              fontSize: TOOLBAR_HIT.iconSize,
              color: "inherit",
            }}
          />
        )}
      </Toggle>
    </Tooltip>
  );
}

export default function PersonTabCluster({ active, onChange }) {
  return (
    <ToolbarButtonGroup gap={TOOLBAR_CAPSULE.gapSegmentsPx}>
      {TABS.map(({ value, label, Icon, isSvg }) => (
        <TabSegment
          key={value}
          value={value}
          current={active}
          onSelect={onChange}
          label={label}
          Icon={Icon}
          isSvg={isSvg}
        />
      ))}
    </ToolbarButtonGroup>
  );
}
