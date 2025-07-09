import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
  Button,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import SwipeableViews from "react-swipeable-views";

export default function GalleryFullscreen({
  open,
  onClose,
  photoPaths,
  sortedList,
  allPeople,
  photoOwners,
  initialIndex = 0,
}) {
  const [index, setIndex] = useState(initialIndex);
  const [hideLabels, setHideLabels] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (!open) setHideLabels(false);
  }, [open]);

  const quantity = sortedList.length;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogContent
        sx={{
          p: 0,
          backgroundColor: isDark ? "#000" : "#fff",
        }}
      >
        {/* Top Controls */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 1000,
            display: "flex",
            gap: 1,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              color: isDark ? "#fff" : "#000",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <IconButton
            onClick={() => setHideLabels((h) => !h)}
            sx={{
              color: isDark ? "#fff" : "#000",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              },
            }}
          >
            {hideLabels ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Box>

        {/* Navigation */}
        <IconButton
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          sx={{
            position: "absolute",
            top: "50%",
            left: 8,
            transform: "translateY(-50%)",
            zIndex: 1000,
            color: isDark ? "#fff" : "#000",
            bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            "&:hover": {
              bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            },
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>
        <IconButton
          onClick={() => setIndex((i) => Math.min(i + 1, quantity - 1))}
          sx={{
            position: "absolute",
            top: "50%",
            right: 8,
            transform: "translateY(-50%)",
            zIndex: 1000,
            color: isDark ? "#fff" : "#000",
            bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            "&:hover": {
              bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
            },
          }}
        >
          <ArrowForwardIosIcon />
        </IconButton>

        {/* Counter */}
        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: hideLabels ? "none" : "flex",
            alignItems: "center",
            gap: 0.5,
            bgcolor: "rgba(0,0,0,0.5)",
            color: "#fff",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: "0.9rem",
          }}
        >
          <PhotoLibraryIcon />
          <Typography>{`${index + 1} / ${quantity}`}</Typography>
        </Box>

        {/* Swipeable Views */}
        <SwipeableViews
          index={index}
          onChangeIndex={setIndex}
          enableMouseEvents
        >
          {sortedList.map((photo) => (
            <Box
              key={photo.id}
              sx={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                flexDirection: "column",
                bgcolor: isDark ? "#000" : "#fff",
              }}
            >
              <img
                src={photoPaths[photo.id]}
                alt={photo.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "90vh",
                  objectFit: "contain",
                }}
              />

              {!hideLabels && (
                <Stack
                  spacing={1}
                  sx={{ mt: 2, color: isDark ? "#ccc" : "#333" }}
                >
                  <Typography variant="h6">{photo.title}</Typography>
                  <Typography variant="body2">{photo.description}</Typography>
                  <Typography variant="caption">
                    {photoOwners(photo)}
                  </Typography>
                </Stack>
              )}
            </Box>
          ))}
        </SwipeableViews>
      </DialogContent>
    </Dialog>
  );
}
