import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Slider,
  Box,
} from "@mui/material";
import Cropper from "react-easy-crop";
import { useState, useCallback } from "react";
import getCroppedImg from "./utils/cropImage"; // утилита для обрезки
import { Buffer } from "buffer";

export default function AvatarEditorDialog({
  open,
  onClose,
  personId,
  onSaved,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const arrayBuffer = await croppedBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await window.avatarAPI.save(personId, buffer);
    onSaved?.();
    onClose();
  };

  const handleReset = async () => {
    await window.avatarAPI.delete(personId);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Редактировать аватар</DialogTitle>
      <DialogContent>
        {!imageSrc ? (
          <Button variant="outlined" component="label">
            Загрузить фото
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
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e, z) => setZoom(z)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleReset} color="error">
          Сбросить
        </Button>
        <Button onClick={handleSave} disabled={!imageSrc}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
