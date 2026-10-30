import React from "react";
import { Drawer, Box, Typography } from "@mui/material";
import ContactsIcon from "@mui/icons-material/Contacts";
import ExternalEntityDetail from "../pages/Page_External/ExternalEntityDetail";
import { inspectorDrawerTransitionProps } from "./inspectorPanelTransition";

export default function ExternalInspectorPanel({
  open,
  onClose,
  entityId,
  onDeleted,
  onSelectExternal,
  onEntityChanged,
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
          bgcolor: "background.default",
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
          <ContactsIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={800}>
            Карточка
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          <ExternalEntityDetail
            entityId={entityId}
            onDeleted={onDeleted}
            onSelectExternal={onSelectExternal}
            onEntityChanged={onEntityChanged}
            compact
          />
        </Box>
      </Box>
    </Drawer>
  );
}
