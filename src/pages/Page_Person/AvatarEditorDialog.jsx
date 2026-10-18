import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  Slider,
  Box,
  Avatar,
  Typography,
  Stack,
  IconButton,
} from "@mui/material";
import Cropper from "react-easy-crop";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import heic2any from "heic2any";
import getCroppedImg from "../utils/cropImage";
import { Buffer } from "buffer";
import { alpha, useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AppButton from "../../components/AppButton";
import useDialogSaveHotkey from "../../hooks/useDialogSaveHotkey";

export default function AvatarEditorDialog({
  open,
  onClose,
  personId,
  onSaved,
}) {
  const theme = useTheme();
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
    [imageSrc, croppedPreview],
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

  useDialogSaveHotkey({
    open,
    onSave: uploadCropped,
    disabled: !imageSrc,
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      transitionDuration={{ enter: 180, exit: 140 }}
      PaperProps={{
        sx: {
          width: 600,
          maxWidth: "94vw",
          maxHeight: "calc(100vh - 64px)",
          borderRadius: "24px",
          backgroundImage: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2, overflowY: "auto" }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 3 }}
        >
          Редактировать аватар
        </Typography>

        <Stack spacing={3} alignItems="center">
          {/* Верхнее превью */}
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={croppedPreview || fallback}
              sx={{
                width: 140,
                height: 140,
                border: `4px solid ${theme.palette.background.paper}`,
                boxShadow: theme.shadows[8],
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 5,
                right: 5,
                bgcolor: "primary.main",
                borderRadius: "50%",
                p: 0.5,
                display: "flex",
                color: "#fff",
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            >
              <PhotoCameraIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>

          {!imageSrc ? (
            /* Твоя зона Drop-zone с новым стилем */
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
                width: "100%",
                border: "2px dashed",
                borderColor: isDragging
                  ? "primary.main"
                  : alpha(theme.palette.divider, 0.5),
                bgcolor: isDragging
                  ? alpha(theme.palette.primary.main, 0.05)
                  : alpha(theme.palette.action.hover, 0.03),
                borderRadius: "20px",
                p: 5,
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "pointer",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
              }}
            >
              <CloudUploadIcon
                sx={{
                  fontSize: 48,
                  color: isDragging ? "primary.main" : "text.disabled",
                  mb: 2,
                }}
              />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Перетащите фото сюда
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Поддерживаются JPG, PNG, HEIC
              </Typography>
              <AppButton
                preset="primary"
                component="label"
                sx={{ px: 4, borderRadius: "999px" }}
              >
                Выбрать файл
                <input
                  type="file"
                  hidden
                  accept="image/*,.heic"
                  onChange={handleFileChange}
                />
              </AppButton>
            </Box>
          ) : (
            /* Секция Кроппера */
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: 350,
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
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
              </Box>

              {/* Управление зумом */}
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{
                  mt: 3,
                  px: 2,
                  py: 1.5,
                  bgcolor: alpha(theme.palette.action.hover, 0.04),
                  borderRadius: "12px",
                }}
              >
                <IconButton
                  onClick={handleZoomOut}
                  disabled={zoom <= minZoom}
                  size="small"
                  sx={{ bgcolor: "background.paper", boxShadow: 1 }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <Slider
                  value={zoom}
                  min={minZoom}
                  max={maxZoom}
                  step={stepZoom}
                  onChange={(e, v) => setZoom(v)}
                  sx={{
                    flexGrow: 1,
                    "& .MuiSlider-thumb": { width: 16, height: 16 },
                    "& .MuiSlider-valueLabel": { borderRadius: "6px" },
                  }}
                />
                <IconButton
                  onClick={handleZoomIn}
                  disabled={zoom >= maxZoom}
                  size="small"
                  sx={{ bgcolor: "background.paper", boxShadow: 1 }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 2,
          pt: 1,
        }}
      >
        <AppButton
          preset="dangerOutlined"
          onClick={handleReset}
          sx={{ px: 2.5, borderRadius: "999px" }}
        >
          Сброс
        </AppButton>
        <AppButton
          preset="secondary"
          onClick={handleClose}
          sx={{ px: 2.5, borderRadius: "999px" }}
        >
          Отмена
        </AppButton>
        <Box sx={{ flex: 1 }} />
        <AppButton
          preset="primary"
          onClick={uploadCropped}
          disabled={!imageSrc}
          sx={{ px: 3, borderRadius: "999px" }}
        >
          Сохранить
        </AppButton>
      </Box>
    </Dialog>
  );
}
