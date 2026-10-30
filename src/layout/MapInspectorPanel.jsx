import React from "react";
import { Drawer, Box, Stack, Typography } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import { KIND_COLOR } from "../pages/Page_Map/mapHelpers";
import {
  groupSx,
  RowDivider,
  RowIcon,
  SettingsRow,
  CountBadge,
} from "../pages/Page_Settings/settingsUi";
import {
  inspectorDrawerTransitionProps,
  inspectorPaperSx,
} from "./inspectorPanelTransition";

function kindIcon(kind) {
  if (kind === "photo")
    return <PhotoLibraryIcon sx={{ fontSize: 18 }} />;
  if (kind === "external") return <ContactsIcon sx={{ fontSize: 18 }} />;
  return <EventIcon sx={{ fontSize: 18 }} />;
}

export default function MapInspectorPanel({
  open,
  onClose,
  points = [],
  focusedKey = null,
  onSelectPoint,
}) {
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
          <MapIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Точки на карте
          </Typography>
          <Box sx={{ ml: "auto" }}>
            <CountBadge value={points.length} />
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, pt: 0 }}>
          {points.length === 0 ? (
            <Box sx={groupSx}>
              <SettingsRow
                icon={
                  <RowIcon bg="gray">
                    <MapIcon sx={{ fontSize: 18 }} />
                  </RowIcon>
                }
                title="Нет точек"
                subtitle="Измените фильтры или добавьте места к фото и событиям."
              />
            </Box>
          ) : (
            <Box sx={groupSx}>
              <Stack divider={<RowDivider />}>
                {points.map((p) => (
                  <Box
                    key={p.key}
                    sx={{
                      bgcolor:
                        focusedKey === p.key ? "action.selected" : undefined,
                    }}
                  >
                    <SettingsRow
                      icon={
                        <RowIcon bg={KIND_COLOR[p.kind] || KIND_COLOR.event}>
                          {kindIcon(p.kind)}
                        </RowIcon>
                      }
                      title={p.label}
                      subtitle={
                        p.isPhotoGroup
                          ? [p.place, p.sub].filter(Boolean).join(" · ")
                          : [p.sub, p.place].filter(Boolean).join(" · ")
                      }
                      onClick={() => onSelectPoint?.(p)}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
