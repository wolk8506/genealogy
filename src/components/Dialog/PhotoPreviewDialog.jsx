import React, { useEffect, useRef, useState } from "react";
import { Dialog, Box, Typography, Stack, IconButton } from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import AppButton from "../AppButton";
import { PhotoThumbCropPanel } from "../PhotoThumbCropTools";
import { loadImage, cropToThumbWebp } from "../../utils/thumbCrop";

const ZOOM_MAX = 3;

// Редактор превью (миниатюры) фото — в стиле LocationPickerDialog:
// карточка-превью со скруглением, зум поверх и пилюльные кнопки.
export default function PhotoPreviewDialog({ open, meta, onClose, setPhotoPaths }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const urls = useRef([]);

  const track = (url) => {
    urls.current.push(url);
    return url;
  };

  const cleanup = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    setSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPixels(null);
    setBusy(false);
  };

  // Выбираем исходник автоматически (без выбора «оригинал/webp»).
  const loadSource = async () => {
    if (!meta?.owner || !meta?.filename) return;
    setBusy(true);
    try {
      const res = await window.photoAPI.getCropSource(meta.owner, meta.filename);
      if (!res?.buffer) throw new Error("Нет исходника для превью");
      const url = track(URL.createObjectURL(new Blob([res.buffer])));
      try {
        await loadImage(url);
      } catch {
        const fallback = (res.available || []).find((k) => k !== res.kind);
        if (!fallback) throw new Error("Формат исходника не поддерживается");
        const retry = await window.photoAPI.getCropSource(
          meta.owner,
          meta.filename,
          fallback,
        );
        if (!retry?.buffer) throw new Error("Нет исходника для превью");
        URL.revokeObjectURL(url);
        const url2 = track(URL.createObjectURL(new Blob([retry.buffer])));
        await loadImage(url2);
        setSrc(url2);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        return;
      }
      setSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (e) {
      alert("Превью: " + (e.message || e));
      cleanup();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && meta?.owner && meta?.filename) {
      loadSource();
    } else if (!open) {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meta?.id, meta?.owner, meta?.filename]);

  const handleSave = async () => {
    if (!src || !pixels || busy) return;
    setBusy(true);
    try {
      const blob = await cropToThumbWebp(src, pixels);
      await window.photoAPI.saveThumbs(meta.owner, meta.filename, blob);
      if (setPhotoPaths && meta?.id != null) {
        const thumbPath = await window.photoAPI.getPath(
          meta.owner,
          meta.filename,
          "thumbs",
        );
        if (thumbPath) {
          const fresh = `${thumbPath}${thumbPath.includes("?") ? "&" : "?"}t=${Date.now()}`;
          setPhotoPaths((prev) => ({
            ...(prev || {}),
            thumbs: { ...((prev && prev.thumbs) || {}), [meta.id]: fresh },
          }));
        }
      }
      cleanup();
      onClose?.();
    } catch (e) {
      alert("Превью: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const overlayBtnSx = {
    bgcolor: "rgba(0,0,0,0.55)",
    color: "#fff",
    borderColor: "rgba(255,255,255,0.3)",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          backgroundImage: "none",
          width: 560,
          maxWidth: "94vw",
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography
          variant="h6"
          sx={{ textAlign: "center", fontWeight: 700, mb: 2.5 }}
        >
          Превью
        </Typography>

        <Box
          sx={{
            height: "min(440px, 55vh)",
            borderRadius: "18px",
            overflow: "hidden",
            position: "relative",
            bgcolor: "action.hover",
          }}
        >
          <PhotoThumbCropPanel
            imageSrc={src}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setPixels(px)}
            height="min(440px, 55vh)"
            maxZoom={ZOOM_MAX}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 3,
            }}
          >
            <IconButton
              size="small"
              aria-label="Уменьшить"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 1))}
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
              onClick={() => setZoom((z) => Math.min(z + 0.2, ZOOM_MAX))}
              disabled={zoom >= ZOOM_MAX}
              sx={{
                ...overlayBtnSx,
                border: "1px solid rgba(255,255,255,0.3)",
                width: 34,
                height: 34,
              }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          pt: 0,
        }}
      >
        <AppButton
          preset="secondary"
          onClick={onClose}
          sx={{ px: 2.5, borderRadius: "999px" }}
        >
          Отмена
        </AppButton>
        <AppButton
          preset="primary"
          onClick={handleSave}
          disabled={!pixels || busy}
          sx={{ px: 3, borderRadius: "999px" }}
        >
          {busy ? "Сохранение…" : "Готово"}
        </AppButton>
      </Box>
    </Dialog>
  );
}
