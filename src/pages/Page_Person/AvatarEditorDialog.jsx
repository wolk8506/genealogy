import React, { useEffect, useState, useCallback } from "react";
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
  IconButton,
} from "@mui/material";
import Cropper from "react-easy-crop";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import CancelIcon from "@mui/icons-material/Cancel";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import heic2any from "heic2any";
import getCroppedImg from "../utils/cropImage";
import { Buffer } from "buffer";

export default function AvatarEditorDialog({
  open,
  onClose,
  personId,
  onSaved,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [fallback, setFallback] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;
  const [croppedPreview, setCroppedPreview] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (open && personId) {
      resetState();
      window.avatarAPI.getPath(personId).then((path) => {
        if (isMounted) {
          setFallback(path ? `${path}?t=${Date.now()}` : null);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, personId]);

  const resetState = () => {
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview);
    }
    setImageSrc(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setDragCounter(0);
    setCroppedPreview(null);
  };

  const onCropComplete = useCallback(
    async (_, pixels) => {
      setCroppedAreaPixels(pixels);
      if (imageSrc) {
        try {
          const blob = await getCroppedImg(imageSrc, pixels);
          const previewUrl = URL.createObjectURL(blob);
          // освобождаем старый превью, если был
          if (croppedPreview) {
            URL.revokeObjectURL(croppedPreview);
          }
          setCroppedPreview(previewUrl);
        } catch (e) {
          console.error("Ошибка генерации превью", e);
        }
      }
    },
    [imageSrc, croppedPreview]
  );

  // Общий хелпер: читаем File или Blob или ArrayBuffer, возвращаем Data URL
  const toDataURL = (blobOrFile) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blobOrFile);
    });

  // Обработка при выборе через <input>
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "heic") {
      try {
        const ab = await heic2any({ blob: file, toType: "image/jpeg" });
        const blob =
          ab instanceof Blob ? ab : new Blob([ab], { type: "image/jpeg" });
        setImageSrc(await toDataURL(blob));
      } catch {
        return alert("❌ Ошибка конвертации HEIC");
      }
    } else {
      setImageSrc(await toDataURL(file));
    }

    // подстройка начального зума
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setZoom(r < 0.9 ? 1.4 : r > 1.3 ? 1 : 1.2);
    };
    img.src = url;
  };

  // Обработка Drop
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragCounter(0);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
    if (!allowed.includes(ext)) {
      return alert("❌ Неподдерживаемый формат");
    }

    if (ext === "heic") {
      try {
        const ab = await heic2any({ blob: file, toType: "image/jpeg" });
        const blob =
          ab instanceof Blob ? ab : new Blob([ab], { type: "image/jpeg" });
        setImageSrc(await toDataURL(blob));
      } catch {
        return alert("❌ Ошибка конвертации HEIC");
      }
    } else {
      setImageSrc(await toDataURL(file));
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      setZoom(r < 0.9 ? 1.4 : r > 1.3 ? 1 : 1.2);
    };
    img.src = url;
  };

  const uploadCropped = async () => {
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    const buffer = Buffer.from(await blob.arrayBuffer());
    await window.avatarAPI.save(personId, buffer);
    const newPath = await window.avatarAPI.getPath(personId);
    const fresh = `${newPath}?v=${Date.now()}`;
    setFallback(fresh);
    setImageSrc(null);
    onSaved(fresh);
  };

  const handleReset = async () => {
    await window.avatarAPI.delete(personId);
    onSaved(null);
    resetState();
    setFallback(null); // или currentAvatarPath, если хочешь сразу показать дефолт
  };

  const handleClose = () => {
    resetState(); // очистка всех локальных стейтов, включая croppedPreview
    onClose(); // вызов внешнего обработчика
  };

  const minZoom = 1;
  const maxZoom = 10;
  const stepZoom = 0.1;
  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - stepZoom, minZoom));
  };
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + stepZoom, maxZoom));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "15px",
        },
      }}
    >
      <DialogTitle>Редактировать аватар</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" mb={2}>
          <Avatar
            src={croppedPreview || fallback}
            sx={{ width: 120, height: 120 }}
          />

          <Typography variant="body2" color="text.secondary">
            {imageSrc ? "Новый аватар (превью кропа)" : "Текущий аватар"}{" "}
          </Typography>
        </Stack>

        {!imageSrc ? (
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragCounter((c) => c + 1);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragCounter((c) => Math.max(c - 1, 0));
            }}
            onDrop={handleDrop}
            sx={{
              border: "2px dashed",
              borderColor: isDragging ? "primary.main" : "divider",
              bgcolor: isDragging ? "action.selected" : "action.hover",
              borderRadius: 2,
              p: 3,
              textAlign: "center",
              transition: "0.3s",
            }}
          >
            <Typography color="text.secondary" mb={1}>
              Перетащите изображение сюда или
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              component="label"
            >
              Выбрать фото
              <input
                type="file"
                hidden
                accept="image/*,.heic"
                onChange={handleFileChange}
              />
            </Button>
          </Box>
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
              zoomWithScroll={true}
            />
            <Stack direction="row" spacing={1} alignItems="center" mt={2}>
              <IconButton
                onClick={handleZoomOut}
                disabled={zoom <= minZoom}
                variant="outlined"
                size="small"
              >
                <ZoomOutIcon />
              </IconButton>
              <Slider
                value={zoom}
                min={minZoom}
                max={maxZoom}
                step={stepZoom}
                marks={[
                  { value: 1, label: "1x" },
                  { value: 3, label: "3x (граница)" },
                  { value: 5, label: "5x" },
                  { value: 10, label: "10x" },
                ]}
                onChange={(e, v) => setZoom(v)}
                sx={{ flexGrow: 1 }}
              />
              <IconButton
                onClick={handleZoomIn}
                disabled={zoom >= maxZoom}
                variant="outlined"
                size="small"
              >
                <ZoomInIcon />
              </IconButton>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} startIcon={<CancelIcon />}>
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
