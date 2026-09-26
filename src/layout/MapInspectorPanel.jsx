import React from "react";
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import EventIcon from "@mui/icons-material/Event";
import ContactsIcon from "@mui/icons-material/Contacts";
import { KIND_COLOR } from "../pages/Page_Map/mapHelpers";

function kindIcon(kind) {
  if (kind === "photo") return <PhotoLibraryIcon sx={{ fontSize: 18, color: KIND_COLOR.photo }} />;
  if (kind === "external") return <ContactsIcon sx={{ fontSize: 18, color: KIND_COLOR.external }} />;
  return <EventIcon sx={{ fontSize: 18, color: KIND_COLOR.event }} />;
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
      transitionDuration={0}
      PaperProps={{
        sx: { top: 50, height: "calc(100% - 50px)" },
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
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <MapIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Точки на карте
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
            {points.length}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {points.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Нет точек для отображения. Измените фильтры или добавьте места к
              фото и событиям.
            </Typography>
          ) : (
            <List dense disablePadding>
              {points.map((p) => (
                <ListItemButton
                  key={p.key}
                  selected={focusedKey === p.key}
                  onClick={() => onSelectPoint?.(p)}
                  sx={{ alignItems: "flex-start", py: 1 }}
                >
                  <Box sx={{ mt: 0.25, mr: 1.5 }}>{kindIcon(p.kind)}</Box>
                  <ListItemText
                    primary={p.label}
                    secondary={
                      p.isPhotoGroup
                        ? [p.place, p.sub].filter(Boolean).join(" · ")
                        : [p.sub, p.place].filter(Boolean).join(" · ")
                    }
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                      noWrap: true,
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      noWrap: true,
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
