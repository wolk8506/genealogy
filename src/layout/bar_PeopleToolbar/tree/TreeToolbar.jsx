// components/bar_PeopleToolbar/TreeToolbar.jsx
import React from "react";
import {
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DataUsageIcon from "@mui/icons-material/DataUsage";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import ButtonConteiner from "../../../components/ButtonConteiner";

export default function TreeToolbar({ treeProps }) {
  const { treeMode, setTreeMode, onExport, zoomIn, zoomOut, fitView } =
    treeProps;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flexGrow: 1 }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", flexGrow: 1, justifyContent: "center" }}
      >
        <ToggleButtonGroup
          value={treeMode}
          exclusive
          onChange={(e, val) => val && setTreeMode(val)}
          size="small"
          sx={{
            border: "1px solid",
            borderRadius: 7,
            borderColor: "divider",
            height: "40px",
            gap: 1,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 6,
              "&.Mui-selected": {
                bgcolor: "#444",
                color: "#90caf9",
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

        <ButtonConteiner>
          <Tooltip title="Увеличить">
            <IconButton
              onClick={zoomIn}
              size="small"
              sx={{ color: "white", p: "8px" }}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Уменьшить">
            <IconButton
              onClick={zoomOut}
              size="small"
              sx={{ color: "white", p: "8px" }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Вписать в экран">
            <IconButton
              onClick={fitView}
              size="small"
              sx={{ color: "white", p: "8px" }}
            >
              <CenterFocusStrongIcon />
            </IconButton>
          </Tooltip>
        </ButtonConteiner>
      </Stack>
      <ButtonConteiner>
        <Tooltip title="Экспорт PNG">
          <IconButton
            onClick={onExport}
            size="small"
            sx={{ color: "white", p: "8px" }}
          >
            <PhotoCameraIcon />
          </IconButton>
        </Tooltip>
      </ButtonConteiner>
    </Stack>
  );
}
