// pages/Page_Families/panel/FamilyInspector.jsx
// Правая панель страницы семей. Повторяет InspectorPanel главной:
// Drawer справа, вкладки в стиле «Связей», строки SettingsRow.

import React, { useEffect, useState } from "react";
import { Box, Drawer } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import PersonSummary from "./PersonSummary";
import FamilySummary from "./FamilySummary";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "../../../layout/inspectorPanelTransition";

const TABS = [
  { id: "person", label: "Человек", icon: PersonRoundedIcon },
  { id: "family", label: "Семья", icon: FamilyRestroomRoundedIcon },
];

export default function FamilyInspector({
  open,
  person,
  family,
  families,
  byId,
  childrenOf,
  byPerson,
  onSelectPerson,
  onOpenFamily,
  onClose,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [tab, setTab] = useState(person ? "person" : "family");

  useEffect(() => {
    setTab(person ? "person" : "family");
  }, [person?.id]);

  // Панель имеет смысл только внутри конкретного союза.
  if (!family) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      {...inspectorDrawerTransitionProps}
      PaperProps={{
        sx: {
          top: 50,
          height: "calc(100% - 50px)",
          ...inspectorPaperSx,
          borderLeft: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <Box
        sx={{
          width: 340,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 2,
            pb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
              p: "3px",
              gap: "4px",
            }}
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const selected = tab === t.id;
              return (
                <Box
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    height: 24,
                    minHeight: 24,
                    py: 0,
                    px: 1,
                    borderRadius: "7px",
                    cursor: "pointer",
                    color: selected ? "text.primary" : "text.secondary",
                    bgcolor: selected
                      ? isDark
                        ? "rgba(255,255,255,0.14)"
                        : "background.paper"
                      : "transparent",
                    border: "1px solid",
                    borderColor: selected
                      ? isDark
                        ? "rgba(255,255,255,0.14)"
                        : "rgba(0,0,0,0.1)"
                      : isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.06)",
                    boxShadow: selected
                      ? isDark
                        ? "0 1px 2px rgba(0,0,0,0.35)"
                        : "0 1px 2px rgba(0,0,0,0.12)"
                      : "none",
                    fontSize: "0.78rem",
                    fontWeight: selected ? 700 : 500,
                    "&:hover": selected
                      ? undefined
                      : {
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                  {t.label}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          {tab === "person" ? (
            <PersonSummary
              person={person}
              byId={byId}
              childrenOf={childrenOf}
              byPerson={byPerson}
              onSelectPerson={onSelectPerson}
              onOpenFamily={onOpenFamily}
            />
          ) : (
            <FamilySummary
              family={family}
              families={families}
              byPerson={byPerson}
              onSelectPerson={onSelectPerson}
              onOpenFamily={onOpenFamily}
            />
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
