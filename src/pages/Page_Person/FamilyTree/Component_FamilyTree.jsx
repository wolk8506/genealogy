// FamilyTreePage.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DataUsageIcon from "@mui/icons-material/DataUsage";
import FamilyTree from "./FamilyTree";
import { buildDescendantTree } from "./buildDescendantTree";
import { buildAncestorTree } from "./buildAncestorTree";
import { buildFullTreeForD3 } from "./buildFullTreeForD3";
import { useSnackbar } from "notistack";
import NameSection from "../../../components/NameSection";
import * as htmlToImage from "html-to-image";

export default function FamilyTreePage({ allPeople, person_id }) {
  const [treeMode, setTreeMode] = useState("descendants");
  const { enqueueSnackbar } = useSnackbar();

  const handleExport = async () => {
    const treeElement = document.getElementById("tree-wrapper");
    if (!treeElement) return;

    enqueueSnackbar("📸 Экспорт в PNG начался...", { variant: "info" });

    try {
      const blob = await htmlToImage.toBlob(treeElement);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "family-tree.png";
      link.click();
      URL.revokeObjectURL(url);

      enqueueSnackbar("Изображение готово для сохранения ✅", {
        variant: "success",
      });
    } catch (err) {
      console.error("Ошибка при экспорте дерева:", err);
      enqueueSnackbar("Ошибка при экспорте дерева 😞", { variant: "error" });
    }
  };

  const buildData = () => {
    switch (treeMode) {
      case "descendants":
        return buildDescendantTree(person_id, allPeople);
      case "ancestors":
        return buildAncestorTree(person_id, allPeople);
      case "full":
        return buildFullTreeForD3(person_id, allPeople);
      case "radial": {
        // Для радиального режима используем дерево потомков как основу.
        const node = buildDescendantTree(person_id, allPeople);
        if (node) node.layout = "radial";
        return node;
      }
      default:
        return buildDescendantTree(person_id, allPeople);
    }
  };

  return (
    <>
      <NameSection title="Семейное древо" icon={AccountTreeIcon} />

      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
        <Box display="flex" gap={1} justifyContent="flex-end">
          <ToggleButtonGroup
            value={treeMode}
            exclusive
            onChange={(e, val) => val && setTreeMode(val)}
            size="small"
          >
            <ToggleButton value="descendants">
              <Typography
                variant="button"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <AccountTreeIcon color="inherit" sx={{ rotate: "90deg" }} />
                потомки
              </Typography>
            </ToggleButton>

            <ToggleButton value="ancestors">
              <Typography
                variant="button"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <AccountTreeIcon color="inherit" sx={{ rotate: "270deg" }} />
                предки
              </Typography>
            </ToggleButton>

            <ToggleButton value="full">
              <Typography
                variant="button"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <AccountTreeIcon color="inherit" />
                полное
              </Typography>
            </ToggleButton>

            <ToggleButton value="radial">
              <Typography
                variant="button"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                {/* можно заменить иконку на что-то подходящее */}
                <DataUsageIcon
                  color="inherit"
                  sx={{ transform: "scale(0.9)" }}
                />
                радиальное
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          <Button onClick={handleExport} variant="outlined" size="small">
            <PhotoCameraIcon sx={{ marginRight: 1 }} />в PNG
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <FamilyTree
        mode={treeMode}
        data={buildData()}
        people={allPeople}
        personId={person_id}
      />
    </>
  );
}
