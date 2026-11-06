import React, { useEffect, useRef, useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { MOTION } from "../../../theme/designTokens";
import {
  iconButtonSx,
  useMediaPlayback,
  ProgressControls,
  TransportControls,
  VolumeCapsule,
} from "./playerControls";

// Сколько покоя нужно, чтобы панели управления убрались за край кадра.
const HIDE_AFTER = 2800;

// Почти прозрачная стеклянная полоса поверх кадра: затемнение и блюр живут
// в ::before, чтобы текст и кнопки не размывались вместе с краем панели.
const chromeSx = (at, hidden) => {
  const isTop = at === "top";
  // Без маски край блюра обрывается ровной линией посреди кадра — маска
  // растворяет стекло по направлению к картинке.
  const fade = isTop
    ? "linear-gradient(180deg, #000 50%, transparent 100%)"
    : "linear-gradient(0deg, #000 58%, transparent 100%)";
  return {
    position: "absolute",
    left: 0,
    right: 0,
    [at]: 0,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 1,
    height: isTop ? 52 : "auto",
    px: 1.5,
    color: "#fff",
    opacity: hidden ? 0 : 1,
    transform: hidden
      ? `translateY(${isTop ? "-100%" : "100%"})`
      : "translateY(0)",
    pointerEvents: hidden ? "none" : "auto",
    transition: `opacity ${MOTION.base} ${MOTION.easeOut}, transform 240ms cubic-bezier(0.32, 0.72, 0, 1)`,
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      zIndex: -1,
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      background: isTop
        ? "linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.34) 100%)"
        : "linear-gradient(0deg, rgba(0,0,0,0.66) 0%, rgba(0,0,0,0.4) 100%)",
      // Без маски край блюра обрывается ровной линией посреди кадра — маска
      // растворяет стекло по направлению к картинке.
      maskImage: fade,
      WebkitMaskImage: fade,
    },
    "@media (prefers-reduced-motion: reduce)": {
      transform: "none",
    },
  };
};

export default function CustomVideoPlayer({ src, fileName, onClose }) {
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  // Пока курсор стоит на панели, она не прячется — иначе невозможно дотянуться
  // до ползунка, который уходит из-под пальца в середине движения.
  const hoverRef = useRef(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seekTo,
    skipBackward,
    skipForward,
    applyVolume,
    toggleMute,
  } = useMediaPlayback(videoRef, src);

  const stopHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    stopHide();
    if (hoverRef.current || videoRef.current?.paused) return;
    hideTimerRef.current = setTimeout(() => setChromeHidden(true), HIDE_AFTER);
  };

  // Любое движение курсора возвращает панели и заново запускает таймер.
  const handleActivity = () => {
    setChromeHidden(false);
    scheduleHide();
  };

  useEffect(() => {
    if (!isPlaying) {
      stopHide();
      setChromeHidden(false);
      return;
    }
    scheduleHide();
    return stopHide;
  }, [isPlaying, src]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        bgcolor: "#000",
        cursor: chromeHidden ? "none" : "default",
      }}
      onPointerMove={handleActivity}
      onPointerLeave={() => {
        hoverRef.current = false;
        stopHide();
        // Курсор ушёл из окна — панели больше не для чего держать.
        if (!videoRef.current?.paused) setChromeHidden(true);
      }}
      onFocusCapture={() => {
        stopHide();
        setChromeHidden(false);
      }}
    >
      {/* Кадрирование только contain: вертикальное видео остаётся вертикальным
          и влезает целиком, по бокам — чёрные поля. */}
      <Box
        component="video"
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        aria-label={fileName}
        title={fileName}
        onClick={() => {
          togglePlay();
          handleActivity();
        }}
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          outline: "none",
          cursor: chromeHidden ? "none" : "pointer",
        }}
      />

      <Box sx={chromeSx("top", chromeHidden)} justifyContent="space-between">
        <Typography
          noWrap
          title={fileName}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
            textShadow: "0 1px 3px rgba(0,0,0,0.45)",
          }}
        >
          {fileName}
        </Typography>
        <Tooltip title="Закрыть (Esc)">
          <Box
            component="button"
            type="button"
            aria-label="Закрыть предпросмотр"
            onClick={onClose}
            sx={{
              ...iconButtonSx,
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: "50%",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(255,255,255,0.16)" },
              "&:active": { transform: "scale(0.92)" },
              "& svg": { fontSize: 20 },
            }}
          >
            <CloseIcon />
          </Box>
        </Tooltip>
      </Box>

      <Box
        sx={{
          ...chromeSx("bottom", chromeHidden),
          flexDirection: "column",
          alignItems: "stretch",
          px: 2,
          pb: 1.5,
        }}
        onPointerEnter={() => {
          hoverRef.current = true;
          stopHide();
          setChromeHidden(false);
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
          scheduleHide();
        }}
      >
        <ProgressControls
          currentTime={currentTime}
          duration={duration}
          onSeek={seekTo}
          onDark
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            mt: 1,
          }}
        >
          <Box />

          <TransportControls
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onSkipBackward={skipBackward}
            onSkipForward={skipForward}
            onDark
            sx={{ mt: 0 }}
          />

          <Box sx={{ justifySelf: "end" }}>
            <VolumeCapsule
              volume={volume}
              onVolume={applyVolume}
              onToggleMute={toggleMute}
              onDark
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
