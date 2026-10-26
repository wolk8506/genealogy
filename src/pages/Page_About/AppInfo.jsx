import React, { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
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
import sqliteIcon from "../../img/sqlite-logo.svg";

import routerPkg from "react-router-dom/package.json";
import vitePkg from "vite/package.json";
import notistackPkg from "notistack/package.json";
import sqlitePkg from "better-sqlite3/package.json";

import {
  groupSx,
  RowDivider,
  SettingsRow,
  sectionLabelSx,
} from "../Page_Settings/settingsUi";

function techIcon(src) {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "8px",
        bgcolor: "action.hover",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: 18, height: 18, objectFit: "contain" }}
      />
    </Box>
  );
}

function versionLabel(value, native) {
  if (!value) return "—";
  return native ? value : `v${value}`;
}

export default function AppDiagnostic() {
  const [sys, setSys] = useState(null);

  useEffect(() => {
    window.appAPI?.getSysVersions?.().then((data) => setSys(data));
  }, []);

  const sections = [
    {
      title: "Среда выполнения",
      items: [
        { icon: electronIcon, name: "Electron", version: sys?.electron },
        { icon: node_jsIcon, name: "Node.js", version: sys?.node },
        { icon: chromiumIcon, name: "Chromium", version: sys?.chrome },
      ],
    },
    {
      title: "Интерфейс",
      items: [
        { icon: reactIcon, name: "React", version: React.version },
        { icon: muiIcon, name: "Material UI", version: muiVersion },
        {
          icon: reactRouterIcon,
          name: "React Router",
          version: routerPkg.version,
        },
        {
          icon: notistackIcon,
          name: "Notistack",
          version: notistackPkg.version,
        },
      ],
    },
    {
      title: "Сборка и данные",
      items: [
        { icon: viteIcon, name: "Vite", version: vitePkg.version },
        { icon: sqliteIcon, name: "SQLite", version: sqlitePkg.version },
        {
          icon: jsonIcon,
          name: "JSON Engine",
          version: "Native",
          native: true,
        },
      ],
    },
  ];

  return (
    <Stack spacing={2}>
      {sections.map((section) => (
        <Box key={section.title}>
          <Typography sx={sectionLabelSx}>{section.title}</Typography>
          <Box sx={groupSx}>
            <Stack divider={<RowDivider />}>
              {section.items.map((item) => (
                <SettingsRow
                  key={item.name}
                  icon={techIcon(item.icon)}
                  title={item.name}
                  trailing={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                        color: "text.secondary",
                        fontFamily: "monospace",
                      }}
                    >
                      {versionLabel(item.version, item.native)}
                    </Typography>
                  }
                />
              ))}
            </Stack>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
