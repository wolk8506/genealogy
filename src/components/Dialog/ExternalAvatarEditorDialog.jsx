import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Slider,
  Box,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import Cropper from "react-easy-crop";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import CancelIcon from "@mui/icons-material/Cancel";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import heic2any from "heic2any";
import getCroppedImg from "../../pages/utils/cropImage";
import { Buffer } from "buffer";
import { alpha, useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

export default function ExternalAvatarEditorDialog({
  open,
  onClose,
  entityId,
  onSaved,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [imageSrc, setImageSrc] = useState(null);
  const [fallback, setFallback] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  useEffect(() => {
    let isMounted = true;
    if (open && entityId) {
      resetState();
      window.externalAPI.avatar.getPath(entityId).then((path) => {
        if (isMounted) {
          setFallback(path ? `${path}?t=${Date.now()}` : null);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, entityId]);

  const resetState = () => {
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setDragCounter(0);
  };

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    let blob = file;
    if (/\.heic$/i.test(file.name)) {
      blob = await heic2any({ blob: file, toType: "image/jpeg" });
    }
    const url = URL.createObjectURL(blob);
    setImageSrc(url);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const buffer = Buffer.from(await blob.arrayBuffer());
    await window.externalAPI.avatar.save(entityId, buffer);
    onSaved?.();
    onClose();
  };

  const handleDelete = async () => {
    await window.externalAPI.avatar.delete(entityId);
    onSaved?.();
    onClose();
  };

  useDialogSaveHotkey({
    open,
    onSave: handleSave,
    disabled: !imageSrc || !croppedAreaPixels,
  });

  const displaySrc = imageSrc || fallback;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Аватар</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            position: "relative",
            height: 320,
            bgcolor: isDark ? "grey.900" : "grey.100",
            borderRadius: 2,
            overflow: "hidden",
            border: isDragging
              ? `2px dashed ${theme.palette.primary.main}`
              : "2px dashed transparent",
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragCounter((c) => c + 1);
          }}
          onDragLeave={() => setDragCounter((c) => Math.max(0, c - 1))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragCounter(0);
            const file = e.dataTransfer.files?.[0];
            handleFile(file);
          }}
        >
          {displaySrc ? (
            imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : (
              <Box
                component="img"
                src={displaySrc}
                alt="Аватар"
                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            )
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              height="100%"
              spacing={1}
            >
              <CloudUploadIcon sx={{ fontSize: 48, opacity: 0.4 }} />
              <Typography color="text.secondary">
                Перетащите фото или выберите файл
              </Typography>
            </Stack>
          )}
        </Box>

        {imageSrc && (
          <Stack direction="row" alignItems="center" spacing={2} mt={2}>
            <ZoomOutIcon fontSize="small" />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.01}
              onChange={(_, v) => setZoom(v)}
            />
            <ZoomInIcon fontSize="small" />
          </Stack>
        )}

        <Stack direction="row" spacing={1} mt={2}>
          <Button variant="outlined" component="label" size="small" sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
            Выбрать файл
            <input
              type="file"
              hidden
              accept="image/*,.heic,.heif"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </Button>
          {fallback && !imageSrc && (
            <Button size="small" onClick={() => setImageSrc(fallback)} sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
              Редактировать
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {fallback && (
          <Button color="warning" startIcon={<RestoreIcon />} onClick={handleDelete} sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
            Удалить
          </Button>
        )}
        <Button startIcon={<CancelIcon />} onClick={onClose} sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}>
          Отмена
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!imageSrc || !croppedAreaPixels}
          onClick={handleSave}
          sx={{
                      height: 24,
                      borderRadius: "6px",
                      px: 2.5,
                      fontWeight: "bold",
                    }}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
