import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Tooltip,
  Grid,
} from "@mui/material";
import { version as muiVersion } from "@mui/material";

import electronIcon from "../../img/electron-logo.svg";
import reactIcon from "../../img/react-icon.svg";
import muiIcon from "../../img/material-ui-logo.svg";
import viteIcon from "../../img/vitejs-logo.svg";
import chromiumIcon from "../../img/chromium-logo.svg";
import jsonIcon from "../../img/json-logo.svg";
import node_jsIcon from "../../img/node.js-logo.svg";
import reactRouterIcon from "../../img/react-router-logo.svg";
import notistackIcon from "../../img/notistack-logo.webp";

import TerminalIcon from "@mui/icons-material/Terminal";
import WebIcon from "@mui/icons-material/Web";
import BuildIcon from "@mui/icons-material/Build";
import CodeIcon from "@mui/icons-material/Code";

import routerPkg from "react-router-dom/package.json";
import vitePkg from "vite/package.json";
import notistackPkg from "notistack/package.json";

export default function AppDiagnostic() {
  const [sys, setSys] = useState(null);

  useEffect(() => {
    window.appAPI?.getSysVersions?.().then((data) => setSys(data));
  }, []);

  const renderTechItem = (icon, name, version) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 1.5,
        borderRadius: 4,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon ? (
          <Box
            component="img"
            src={icon}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <CodeIcon sx={{ fontSize: 24, color: "text.disabled" }} />
        )}
      </Box>
      <Box sx={{ overflow: "hidden" }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
        >
          {name}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontFamily: "monospace" }}
        >
          v{version || "?.?.?"}
        </Typography>
      </Box>
    </Box>
  );

  const CategoryHeader = ({ icon: Icon, title }) => (
    <Typography
      variant="overline"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        fontWeight: 800,
        color: "primary.main",
        mb: 2,
        mt: 1,
        letterSpacing: 1,
      }}
    >
      <Icon sx={{ fontSize: 18 }} /> {title}
    </Typography>
  );

  // Универсальные настройки для колонок:
  // Телефон: 1 колонка. Планшет: 2. Десктоп: 3. Ультра-широкий: 4 колонки.
  const gridResponsiveSizes = { xs: 12, sm: 6, lg: 4, xl: 3 };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, xl: 5 },
        borderRadius: 6,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8f9fa",
        flexGrow: 1,
      }}
    >
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Технологический стек
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Архитектура и зависимости приложения
          </Typography>
        </Box>
        <Tooltip title="Все системы работают в штатном режиме">
          <Chip
            label="Система стабильна"
            size="small"
            color="success"
            variant="soft"
            sx={{ fontWeight: 700, borderRadius: 3 }}
          />
        </Tooltip>
      </Box>

      {/* Группа 1: Среда выполнения */}
      <CategoryHeader icon={TerminalIcon} title="Runtime & Core" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(electronIcon, "Electron", sys?.electron)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(node_jsIcon, "Node.js", sys?.node)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(chromiumIcon, "Chromium", sys?.chrome)}
        </Grid>
      </Grid>

      <Divider sx={{ my: 4, borderStyle: "dashed" }} />

      {/* Группа 2: Frontend */}
      <CategoryHeader icon={WebIcon} title="Frontend Frameworks" />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(reactIcon, "React", React.version)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(muiIcon, "Material UI", muiVersion)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(reactRouterIcon, "React Router", routerPkg.version)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(notistackIcon, "Notistack", notistackPkg.version)}
        </Grid>
      </Grid>

      <Divider sx={{ my: 4, borderStyle: "dashed" }} />

      {/* Группа 3: Инструменты сборки */}
      <CategoryHeader icon={BuildIcon} title="Development & Build" />
      <Grid container spacing={2}>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(viteIcon, "Vite", vitePkg.version)}
        </Grid>
        <Grid item size={gridResponsiveSizes}>
          {renderTechItem(jsonIcon, "JSON Engine", "Native")}
        </Grid>
      </Grid>
    </Paper>
  );
}
