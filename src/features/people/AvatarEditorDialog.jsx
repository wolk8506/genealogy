import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Slider,
  Box,
  Avatar,
  Typography,
  Stack,
} from "@mui/material";
import Cropper from "react-easy-crop";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import CancelIcon from "@mui/icons-material/Cancel";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useState, useCallback, useEffect } from "react";
import getCroppedImg from "./utils/cropImage";
import { Buffer } from "buffer";

export default function AvatarEditorDialog({
  open,
  onClose,
  personId,
  currentAvatarPath,
  onSaved,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [fallback, setFallback] = useState(currentAvatarPath);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setFallback(currentAvatarPath);
  };

  const onCropComplete = useCallback((_, cropped) => {
    setCroppedAreaPixels(cropped);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadCropped = async () => {
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const buffer = Buffer.from(await blob.arrayBuffer());
    await window.avatarAPI.save(personId, buffer);
    const newPath = await window.avatarAPI.getPath(personId);
    setFallback(newPath);
    onSaved(newPath);
    setImageSrc(null);
  };

  const handleReset = async () => {
    await window.avatarAPI.delete(personId);
    onSaved(null);
    resetState();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Редактировать аватар</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar src={imageSrc || fallback} sx={{ width: 80, height: 80 }} />
          <Typography variant="body2" color="textSecondary">
            {imageSrc ? "Новый аватар" : "Текущий аватар"}
          </Typography>
        </Stack>

        {!imageSrc ? (
          <Button
            variant="outlined"
            startIcon={<PhotoCameraIcon />}
            component="label"
            fullWidth
          >
            Выбрать фото
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>
        ) : (
          <Box sx={{ position: "relative", width: "100%", height: 300 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 2 }}
            >
              <ZoomOutIcon />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e, z) => setZoom(z)}
                sx={{ flexGrow: 1 }}
              />
              <ZoomInIcon />
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Закрыть
        </Button>
        <Button color="error" onClick={handleReset} startIcon={<RestoreIcon />}>
          Сбросить
        </Button>
        <Button
          onClick={uploadCropped}
          startIcon={<SaveIcon />}
          disabled={!imageSrc}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
