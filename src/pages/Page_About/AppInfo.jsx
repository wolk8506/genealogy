import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  Tooltip,
  Stack,
} from "@mui/material";
import { version as muiVersion } from "@mui/material";

// Иконки (основные)
import electronIcon from "../../img/electron-logo.svg";
import reactIcon from "../../img/react-icon.svg";
import muiIcon from "../../img/material-ui-logo.svg";
import viteIcon from "../../img/vitejs-logo.svg";

import chromiumIcon from "../../img/chromium-logo.svg";
import jsonIcon from "../../img/json-logo.svg";
import node_jsIcon from "../../img/node.js-logo.svg";
import sqLiteIcon from "../../img/sqlite-logo.svg";
import reactRouterIcon from "../../img/react-router-logo.svg";
import notistackIcon from "../../img/notistack-logo.webp";

// Иконки MUI для категорий и заглушек
import TerminalIcon from "@mui/icons-material/Terminal";
import DnsIcon from "@mui/icons-material/Dns";
import WebIcon from "@mui/icons-material/Web";
import BuildIcon from "@mui/icons-material/Build";
import CodeIcon from "@mui/icons-material/Code";

// Пакеты
import routerPkg from "react-router-dom/package.json";
import vitePkg from "vite/package.json";
import notistackPkg from "notistack/package.json";

export default function AppDiagnostic() {
  const [sys, setSys] = useState(null);

  useEffect(() => {
    window.appAPI?.getSysVersions?.().then((data) => setSys(data));
  }, []);

  const renderTechItem = (icon, name, version) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.5,
          // bgcolor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 0.5,
        }}
      >
        {icon ? (
          <Box
            component="img"
            src={icon}
            sx={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <CodeIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        )}
      </Box>
      <Box>
        <Typography
          variant="caption"
          sx={{ display: "block", fontWeight: 700, lineHeight: 1 }}
        >
          {name}
        </Typography>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}
        >
          v{version || "?.?.?"}
        </Typography>
      </Box>
    </Box>
  );

  const CategoryHeader = ({ icon: Icon, title }) => (
    <Typography
      variant="caption"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.8,
        fontWeight: 800,
        color: "primary.main",
        mb: 2,
        mt: 1,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      <Icon sx={{ fontSize: 14 }} /> {title}
    </Typography>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        background: (theme) =>
          theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#fafafa",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
          Технологический стек
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Архитектура и зависимости приложения
        </Typography>
      </Box>

      {/* Группа 1: Среда выполнения */}
      <CategoryHeader icon={TerminalIcon} title="Runtime & Core" />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", mb: 2 }}>
        {renderTechItem(electronIcon, "Electron", sys?.electron)}
        {renderTechItem(node_jsIcon, "Node.js", sys?.node)}
        {renderTechItem(chromiumIcon, "Chromium", sys?.chrome)}
        {/* {renderTechItem(sqLiteIcon, "SQLite", sys?.sqlite || "3.x")} */}
      </Box>

      <Divider sx={{ my: 2, borderStyle: "dashed" }} />

      {/* Группа 2: Frontend */}
      <CategoryHeader icon={WebIcon} title="Frontend Frameworks" />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", mb: 2 }}>
        {renderTechItem(reactIcon, "React", React.version)}
        {renderTechItem(muiIcon, "Material UI", muiVersion)}
        {renderTechItem(reactRouterIcon, "React Router", routerPkg.version)}
        {renderTechItem(notistackIcon, "Notistack", notistackPkg.version)}
      </Box>

      <Divider sx={{ my: 2, borderStyle: "dashed" }} />

      {/* Группа 3: Инструменты сборки */}
      <CategoryHeader icon={BuildIcon} title="Development & Build" />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {renderTechItem(viteIcon, "Vite", vitePkg.version)}
        {renderTechItem(jsonIcon, "JSON Engine", "Native")}
      </Box>

      {/* Нижняя плашка со статусом */}
      <Box
        sx={{
          mt: 3,
          pt: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
        }}
      >
        <Tooltip title="Все системы работают в штатном режиме">
          <Chip
            label="Система стабильна"
            size="small"
            color="success"
            variant="soft"
            sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700 }}
          />
        </Tooltip>
      </Box>
    </Paper>
  );
}
