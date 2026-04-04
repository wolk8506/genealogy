// pages/Page_Person/FamilyTreePage.jsx
import React, { forwardRef } from "react";
import { Box } from "@mui/material";
import FamilyTree from "./FamilyTree";
import { buildDescendantTree } from "./buildDescendantTree";
import { buildAncestorTree } from "./buildAncestorTree";
import { buildFullTreeForD3 } from "./buildFullTreeForD3";

const FamilyTreePage = forwardRef(({ allPeople, person_id, treeMode }, ref) => {
  const buildData = () => {
    switch (treeMode) {
      case "descendants":
        return buildDescendantTree(person_id, allPeople);
      case "ancestors":
        return buildAncestorTree(person_id, allPeople);
      case "full":
        return buildFullTreeForD3(person_id, allPeople);
      case "radial": {
        const node = buildDescendantTree(person_id, allPeople);
        if (node) node.layout = "radial";
        return node;
      }
      default:
        return buildDescendantTree(person_id, allPeople);
    }
  };

  return (
    <Box sx={{ height: "calc(100vh - 60px)", width: "100%" }}>
      <FamilyTree
        ref={ref} // Тот самый реф из MainLayout
        mode={treeMode}
        data={buildData()}
        people={allPeople}
        personId={person_id}
      />
    </Box>
  );
});

export default FamilyTreePage;
