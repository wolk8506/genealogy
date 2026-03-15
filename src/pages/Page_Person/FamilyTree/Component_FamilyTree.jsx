import React, { useState } from "react";
import {
  Box,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider,
  Dialog,
  IconButton,
  Stack,
  Slide,
  Tooltip,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DataUsageIcon from "@mui/icons-material/DataUsage";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import FamilyTree from "./FamilyTree";
import { buildDescendantTree } from "./buildDescendantTree";
import { buildAncestorTree } from "./buildAncestorTree";
import { buildFullTreeForD3 } from "./buildFullTreeForD3";
import { useSnackbar } from "notistack";
import * as htmlToImage from "html-to-image";

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

export default function FamilyTreePage({ allPeople, person_id }) {
  const [open, setOpen] = useState(false);
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

      enqueueSnackbar("Изображение готово ✅", { variant: "success" });
    } catch (err) {
      console.error("Ошибка при экспорте:", err);
      enqueueSnackbar("Ошибка экспорта", { variant: "error" });
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
      {/* Кнопка запуска (ставится рядом с Биографией и Галереей) */}
      <Button
        sx={{ borderRadius: "12px" }}
        variant="outlined"
        onClick={() => setOpen(true)}
        startIcon={<AccountTreeIcon />}
      >
        Древо
      </Button>

      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
        TransitionComponent={Transition}
      >
        {/* Шапка управления */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            borderBottom: "1px solid #444",
            position: "sticky",
            top: 0,
            bgcolor: "#2c2c2c",
            color: "white",
            zIndex: 1100,
          }}
        >
          {/* Кнопка Назад */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 7,
            }}
          >
            <IconButton onClick={() => setOpen(false)} sx={{ color: "white" }}>
              <ArrowBackIosIcon />
            </IconButton>
          </Box>

          {/* Центральный блок: Переключатели режимов */}

          <ToggleButtonGroup
            value={treeMode}
            exclusive
            onChange={(e, val) => val && setTreeMode(val)}
            size="small"
            sx={{
              border: "1px solid",
              borderRadius: 7,
              borderColor: "divider",
              gap: 1,
              "& .MuiToggleButton-root": {
                // color: "#aaa",
                border: "none",
                borderRadius: 6,
                // mx: 0.5,
                // gap: 1,
                "&.Mui-selected": {
                  bgcolor: "#444",
                  color: "#90caf9",
                  // "&:hover": { bgcolor: "#555" },
                },
              },
            }}
          >
            <ToggleButton value="descendants">
              <Tooltip title="Потомки">
                <AccountTreeIcon sx={{ rotate: "90deg" }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="ancestors">
              <Tooltip title="Предки">
                <AccountTreeIcon sx={{ rotate: "270deg" }} />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="full">
              <Tooltip title="Полное древо">
                <AccountTreeIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="radial">
              <Tooltip title="Радиальное">
                <DataUsageIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Правая часть: Экспорт */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 7,
            }}
          >
            <Tooltip title="Сохранить как PNG">
              <IconButton onClick={handleExport} sx={{ color: "#90caf9" }}>
                <PhotoCameraIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Рабочая область древа */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            bgcolor: "#121212",
            position: "relative",
          }}
        >
          <FamilyTree
            mode={treeMode}
            data={buildData()}
            people={allPeople}
            personId={person_id}
          />
        </Box>
      </Dialog>
    </>
  );
}
