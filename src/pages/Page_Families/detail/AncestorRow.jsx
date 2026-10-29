// pages/Page_Families/detail/AncestorRow.jsx
// Родители над супругом: до двух компактных карточек и линии к ребёнку.

import React from "react";
import { Box } from "@mui/material";
import PersonNode, { EmptyPersonNode, NODE_SIZES } from "../nodes/PersonNode";
import { toId } from "../../../utils/families/familyLabels";

const ROW_HEIGHT = 132;
const CARD_GAP = 10;
const CARD_HALF = NODE_SIZES.compact.width / 2 + CARD_GAP / 2; // половина карточки + половина зазора

/** Ширина ряда из двух родителей — общая с ядром союза. */
export const PARENT_ROW_WIDTH = NODE_SIZES.compact.width * 2 + CARD_GAP;

const stemSx = (left, height, bottom = 0) => ({
  position: "absolute",
  left,
  bottom,
  width: "1px",
  height,
  backgroundColor: "divider",
});

export default function AncestorRow({ person, byId, selectedPersonId, onSelect }) {
  const father = byId?.get(toId(person?.father)) || null;
  const mother = byId?.get(toId(person?.mother)) || null;
  const parents = [father, mother].filter(Boolean);

  if (!parents.length) {
    return (
      <Box
        sx={{
          position: "relative",
          height: ROW_HEIGHT,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          pb: "26px",
        }}
      >
        <EmptyPersonNode
          label="Родители не указаны"
          width={NODE_SIZES.compact.width}
          height={NODE_SIZES.compact.height}
        />
        <Box sx={stemSx("50%", 26)} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        height: ROW_HEIGHT,
        width: parents.length > 1 ? PARENT_ROW_WIDTH : "100%",
        flexShrink: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: `${CARD_GAP}px`,
        pb: "26px",
      }}
    >
      {parents.map((parent) => (
        <PersonNode
          key={parent.id}
          person={parent}
          variant="compact"
          selected={toId(parent.id) === toId(selectedPersonId)}
          onSelect={onSelect}
        />
      ))}

      {parents.length > 1 ? (
        <>
          <Box sx={stemSx(`calc(50% - ${CARD_HALF}px)`, 13, 13)} />
          <Box sx={stemSx(`calc(50% + ${CARD_HALF}px)`, 13, 13)} />
          <Box
            sx={{
              position: "absolute",
              left: `calc(50% - ${CARD_HALF}px)`,
              right: `calc(50% - ${CARD_HALF}px)`,
              bottom: 13,
              height: "1px",
              backgroundColor: "divider",
            }}
          />
          <Box sx={stemSx("50%", 13)} />
        </>
      ) : (
        <Box sx={stemSx("50%", 26)} />
      )}
    </Box>
  );
}
