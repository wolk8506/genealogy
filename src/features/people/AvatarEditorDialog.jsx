// import {
//   Dialog,
//   DialogTitle,
//   DialogActions,
//   DialogContent,
//   Button,
//   Slider,
//   Box,
//   Avatar,
//   Typography,
//   Stack,
// } from "@mui/material";
// import Cropper from "react-easy-crop";
// import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
// import SaveIcon from "@mui/icons-material/Save";
// import RestoreIcon from "@mui/icons-material/Restore";
// import CancelIcon from "@mui/icons-material/Cancel";
// import ZoomInIcon from "@mui/icons-material/ZoomIn";
// import ZoomOutIcon from "@mui/icons-material/ZoomOut";
// import { useState, useCallback, useEffect } from "react";
// import getCroppedImg from "./utils/cropImage";
// import { Buffer } from "buffer";

// export default function AvatarEditorDialog({
//   open,
//   onClose,
//   personId,
//   currentAvatarPath,
//   onSaved,
// }) {
//   const [imageSrc, setImageSrc] = useState();
//   const [fallback, setFallback] = useState(currentAvatarPath);
//   const [crop, setCrop] = useState({ x: 0, y: 0 });
//   const [zoom, setZoom] = useState(1);
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

//   const [dragCounter, setDragCounter] = useState(0);
//   const isDragging = dragCounter > 0;

//   useEffect(() => {
//     if (open) {
//       resetState();
//       setFallback(currentAvatarPath); // ← обновляем на актуальный
//     }
//   }, [open, currentAvatarPath]);

//   const resetState = () => {
//     setImageSrc(null);
//     setZoom(1);
//     setCrop({ x: 0, y: 0 });
//     setCroppedAreaPixels(null);
//     // setFallback(currentAvatarPath);
//     setDragCounter(0);
//   };

//   const onCropComplete = useCallback((_, cropped) => {
//     setCroppedAreaPixels(cropped);
//   }, []);

//   const handleFileChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => setImageSrc(reader.result);
//     reader.readAsDataURL(file);
//   };

//   const handleDragEnter = (e) => {
//     e.preventDefault();
//     setDragCounter((prev) => prev + 1);
//   };

//   const handleDragLeave = (e) => {
//     e.preventDefault();
//     setDragCounter((prev) => Math.max(prev - 1, 0));
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     setDragCounter(0);
//     const file = e.dataTransfer.files?.[0];
//     if (!file) return;

//     const ext = file.name.split(".").pop().toLowerCase();
//     const allowed = ["jpg", "jpeg", "png", "webp", "heic"];
//     if (ext === "heic") {
//       alert(
//         "📦 Формат .heic пока не поддерживается. Конвертируйте в .jpg или .png."
//       );
//       return;
//     }
//     if (!allowed.includes(ext)) {
//       alert("❌ Неподдерживаемый формат изображения.");
//       return;
//     }

//     const reader = new FileReader();
//     reader.onload = () => setImageSrc(reader.result);
//     reader.readAsDataURL(file);

//     const img = new Image();
//     img.onload = () => {
//       const ratio = img.width / img.height;
//       if (ratio < 0.9) setZoom(1.4);
//       else if (ratio > 1.3) setZoom(1);
//       else setZoom(1.2);
//     };
//     img.src = URL.createObjectURL(file);
//   };

//   const uploadCropped = async () => {
//     const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
//     const buffer = Buffer.from(await blob.arrayBuffer());
//     await window.avatarAPI.save(personId, buffer);
//     const newPath = await window.avatarAPI.getPath(personId);
//     // setFallback(newPath);
//     // onSaved(newPath);
//     setImageSrc(null);

//     // ⏱️ добавим query-параметр как "version"
//     const refreshed = `${newPath}?v=${Date.now()}`;
//     setFallback(refreshed);
//     onSaved(refreshed);
//   };

//   const handleReset = async () => {
//     await window.avatarAPI.delete(personId);
//     onSaved(null);
//     resetState();
//   };

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>Редактировать аватар</DialogTitle>
//       <DialogContent>
//         <Stack spacing={2} alignItems="center" sx={{ mb: 2 }}>
//           <Avatar src={imageSrc || fallback} sx={{ width: 80, height: 80 }} />
//           <Typography variant="body2" color="textSecondary">
//             {imageSrc ? "Новый аватар" : "Текущий аватар"}
//           </Typography>
//         </Stack>

//         {!imageSrc ? (
//           <Box
//             onDragOver={(e) => e.preventDefault()}
//             onDragEnter={handleDragEnter}
//             onDragLeave={handleDragLeave}
//             onDrop={handleDrop}
//             sx={{
//               border: "2px dashed",
//               borderColor: isDragging ? "primary.main" : "divider",
//               bgcolor: isDragging ? "action.selected" : "action.hover",
//               borderRadius: 2,
//               p: 3,
//               textAlign: "center",
//               transition: "border-color 0.3s ease, background-color 0.3s ease",
//               cursor: "pointer",
//             }}
//           >
//             <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
//               Перетащите изображение сюда или
//             </Typography>
//             <Button
//               variant="outlined"
//               startIcon={<PhotoCameraIcon />}
//               component="label"
//             >
//               Выбрать фото
//               <input
//                 type="file"
//                 hidden
//                 accept="image/*"
//                 onChange={handleFileChange}
//               />
//             </Button>
//           </Box>
//         ) : (
//           <Box sx={{ position: "relative", width: "100%", height: 300 }}>
//             <Cropper
//               image={imageSrc}
//               crop={crop}
//               zoom={zoom}
//               aspect={1}
//               onCropChange={setCrop}
//               onZoomChange={setZoom}
//               onCropComplete={onCropComplete}
//             />
//             <Stack
//               direction="row"
//               spacing={1}
//               alignItems="center"
//               sx={{ mt: 2 }}
//             >
//               <ZoomOutIcon />
//               <Slider
//                 value={zoom}
//                 min={1}
//                 max={3}
//                 step={0.1}
//                 onChange={(e, z) => setZoom(z)}
//                 sx={{ flexGrow: 1 }}
//               />
//               <ZoomInIcon />
//             </Stack>
//           </Box>
//         )}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} startIcon={<CancelIcon />}>
//           Закрыть
//         </Button>
//         <Button color="error" onClick={handleReset} startIcon={<RestoreIcon />}>
//           Сбросить
//         </Button>
//         <Button
//           onClick={uploadCropped}
//           startIcon={<SaveIcon />}
//           disabled={!imageSrc}
//         >
//           Сохранить
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
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
} from "@mui/material";
import Cropper from "react-easy-crop";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import CancelIcon from "@mui/icons-material/Cancel";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import heic2any from "heic2any";
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
  const [dragCounter, setDragCounter] = useState(0);
  const isDragging = dragCounter > 0;

  useEffect(() => {
    if (open) {
      resetState();
      setFallback(currentAvatarPath);
    }
  }, [open, currentAvatarPath]);

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
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Редактировать аватар</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" mb={2}>
          <Avatar src={imageSrc || fallback} sx={{ width: 80, height: 80 }} />
          <Typography variant="body2" color="text.secondary">
            {imageSrc ? "Новый аватар" : "Текущий аватар"}
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
            />
            <Stack direction="row" spacing={1} alignItems="center" mt={2}>
              <ZoomOutIcon />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e, v) => setZoom(v)}
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
