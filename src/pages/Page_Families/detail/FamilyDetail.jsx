// pages/Page_Families/detail/FamilyDetail.jsx
// Детальный вид одного союза: родители → супруги → общие дети.
// Правая панель живёт в MainLayout, как инспектор главной.

import React, { useEffect } from "react";
import { Box } from "@mui/material";
import FamilyHeader from "./FamilyHeader";
import UnionCore from "./UnionCore";
import ChildrenTray from "./ChildrenTray";
import OutsideChildren from "./OutsideChildren";
import { familyGlassSx, RADII } from "../familyTheme";

export default function FamilyDetail({
  family,
  byId,
  byPerson,
  selectedPersonId,
  onSelectPerson,
  onBack,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [family.key]);

  return (
    <Box>
      <FamilyHeader family={family} onBack={onBack} />

      <Box sx={{ mt: 2, minWidth: 0 }}>
        <Box
          sx={[
            familyGlassSx,
            {
              borderRadius: `${RADII.section}px`,
              p: { xs: 2, md: 2.5 },
              overflow: "hidden",
            },
          ]}
        >
          <UnionCore
            family={family}
            byId={byId}
            selectedPersonId={selectedPersonId}
            onSelect={onSelectPerson}
          />

          <ChildrenTray
            family={family}
            byPerson={byPerson}
            selectedPersonId={selectedPersonId}
            onSelect={onSelectPerson}
          />

          <OutsideChildren
            items={family.outsideChildren}
            byId={byId}
            selectedPersonId={selectedPersonId}
            onSelect={onSelectPerson}
          />
        </Box>
      </Box>
    </Box>
  );
}
