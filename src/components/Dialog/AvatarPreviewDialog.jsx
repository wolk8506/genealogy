import React from "react";
import { Dialog, Box, Stack, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function AvatarPreviewDialog({
  open,
  onClose,
  imageUrl,
  alt,
  onEdit,
  editLabel = "Изменить аватарку",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "visible",
          bgcolor: "#000",
          width: 600,
          maxWidth: "calc(100vw - 32px)",
          height: 600,
          maxHeight: "calc(100vh - 48px)",
          m: 0,
          position: "relative",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#000",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 2,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
            onClick={onClose}
            sx={{
              height: 34,
              borderRadius: 7,
              px: 1.5,
              textTransform: "none",
              fontWeight: "bold",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.22)",
              bgcolor: "rgba(20,20,20,0.55)",
              backdropFilter: "blur(3px)",
              "&:hover": {
                borderColor: "rgba(255,255,255,0.36)",
                bgcolor: "rgba(20,20,20,0.75)",
              },
            }}
          >
            Закрыть
          </Button>

          {typeof onEdit === "function" && (
            <Button
              variant="outlined"
              size="small"
              onClick={onEdit}
              sx={{
                ml: "auto",
                height: 34,
                borderRadius: 7,
                px: 1.5,
                textTransform: "none",
                fontWeight: "bold",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.22)",
                bgcolor: "rgba(20,20,20,0.55)",
                backdropFilter: "blur(3px)",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.36)",
                  bgcolor: "rgba(20,20,20,0.75)",
                },
              }}
            >
              {editLabel}
            </Button>
          )}
        </Stack>

        <Box
          component="img"
          src={imageUrl || undefined}
          alt={alt || "Аватар"}
          onError={(e) => {
            e.target.style.display = "none";
          }}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            borderRadius: 3,
          }}
        />
      </Box>
    </Dialog>
  );
}