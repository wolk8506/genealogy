import React, { useRef } from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { GraphicEqRounded, HighlightOffRounded } from "@mui/icons-material";
import { RADIUS, MOTION } from "../../../theme/designTokens";
import {
  iconButtonSx,
  useMediaPlayback,
  ProgressControls,
  TransportControls,
  VolumeCapsule,
} from "./playerControls";

export default function CustomAudioPlayer({ src, fileName, subtitle, onClose }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const audioRef = useRef(null);

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
  } = useMediaPlayback(audioRef, src);

  const hasExtension = Boolean(fileName?.includes("."));
  const extension = hasExtension ? fileName.split(".").pop().toUpperCase() : "";
  const displayName = hasExtension
    ? fileName.slice(0, -(extension.length + 1))
    : fileName;
  const metaLine =
    subtitle || (extension ? `Аудиозапись · ${extension}` : "Аудиозапись");

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <audio ref={audioRef} src={src} />

      <Box
        sx={{
          position: "relative",
          p: 2,
          borderRadius: `${RADIUS.dialog}px`,
          bgcolor: theme.palette.glass.strong,
          color: "text.primary",
          border: `1px solid ${theme.palette.glass.border}`,
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          boxShadow: isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)"
            : "inset 0 1px 0 rgba(255,255,255,0.7), 0 24px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
          "@keyframes playerIn": {
            from: { opacity: 0, transform: "translateY(12px) scale(0.97)" },
            to: { opacity: 1, transform: "none" },
          },
          animation: `playerIn 220ms ${MOTION.easeOut}`,
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.5,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Закрыть плеер"
            title="Закрыть плеер"
            onClick={onClose}
            sx={{
              ...iconButtonSx,
              width: 28,
              height: 28,
              flexShrink: 0,
              borderRadius: "50%",
              opacity: 0.72,
              "&:hover": { opacity: 1, bgcolor: "action.hover" },
              "&:active": { transform: "scale(0.9)" },
              "& svg": { fontSize: 22 },
            }}
          >
            <HighlightOffRounded />
          </Box>

          <VolumeCapsule
            volume={volume}
            onVolume={applyVolume}
            onToggleMute={toggleMute}
          />
        </Box>

        <Box
          sx={{
            position: "relative",
            height: 192,
            borderRadius: `${RADIUS.card}px`,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            background: `linear-gradient(155deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "-35%",
              left: "-15%",
              width: "110%",
              height: "95%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), rgba(255,255,255,0) 62%)",
              filter: "blur(18px)",
              pointerEvents: "none",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.3) 100%)",
              pointerEvents: "none",
            },
          }}
        >
          <GraphicEqRounded
            sx={{
              position: "absolute",
              right: -34,
              bottom: -44,
              fontSize: 190,
              opacity: 0.12,
              zIndex: 0,
            }}
          />
          <GraphicEqRounded
            sx={{
              position: "relative",
              zIndex: 1,
              fontSize: 48,
              opacity: 0.94,
              filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.22))",
            }}
          />
        </Box>

        <Typography
          noWrap
          title={fileName}
          sx={{
            mt: 2,
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          {displayName}
        </Typography>
        <Typography
          noWrap
          sx={{
            mt: "3px",
            fontSize: 14,
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
            color: "text.secondary",
          }}
        >
          {metaLine}
        </Typography>

        <ProgressControls
          currentTime={currentTime}
          duration={duration}
          onSeek={seekTo}
        />

        <TransportControls
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSkipBackward={skipBackward}
          onSkipForward={skipForward}
        />
      </Box>
    </Box>
  );
}
