import React from "react";
import { Box, Button, CircularProgress, IconButton, Stack } from "@mui/material";
import Cropper from "react-easy-crop";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { CROP_SOURCE_LABEL } from "../utils/thumbCrop";

export function PhotoThumbCropPanel({
  imageSrc,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  height = 540,
}) {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height,
        maxHeight: "100%",
      }}
    >
      {imageSrc ? (
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
          zoomWithScroll
        />
      ) : (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

const overlayBtnSx = {
  bgcolor: "rgba(0,0,0,0.55)",
  color: "#fff",
  borderColor: "rgba(255,255,255,0.3)",
};

export function PhotoThumbCropToolbar({
  sourceOptions = [],
  zoom,
  onZoomDecrease,
  onZoomIncrease,
  onSave,
  onCancel,
  canSave = true,
  busy = false,
  saveLabel = "Сохранить",
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 3,
        flexWrap: "wrap",
      }}
    >
      {sourceOptions.map(({ key, active, onSelect }) => (
        <Button
          key={key}
          size="small"
          variant={active ? "contained" : "outlined"}
          onClick={onSelect}
          sx={{
            ...overlayBtnSx,
            bgcolor: active ? "primary.main" : overlayBtnSx.bgcolor,
          }}
        >
          {CROP_SOURCE_LABEL[key] || key}
        </Button>
      ))}
      <IconButton
        size="small"
        aria-label="Уменьшить"
        onClick={onZoomDecrease}
        disabled={zoom <= 1}
        sx={{
          ...overlayBtnSx,
          border: "1px solid rgba(255,255,255,0.3)",
          width: 34,
          height: 34,
        }}
      >
        <ZoomOutIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Увеличить"
        onClick={onZoomIncrease}
        disabled={zoom >= 5}
        sx={{
          ...overlayBtnSx,
          border: "1px solid rgba(255,255,255,0.3)",
          width: 34,
          height: 34,
        }}
      >
        <ZoomInIcon fontSize="small" />
      </IconButton>
      <Button
        size="small"
        variant="contained"
        onClick={onSave}
        disabled={!canSave || busy}
        sx={{ color: "#fff" }}
      >
        {busy ? "Сохранение…" : saveLabel}
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={onCancel}
        sx={overlayBtnSx}
      >
        Отмена
      </Button>
    </Stack>
  );
}
